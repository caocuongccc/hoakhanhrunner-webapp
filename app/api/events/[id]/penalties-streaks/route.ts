// Fix #2: Fixed penalties-streaks API route
// app/api/events/[id]/penalties-streaks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createSupabaseClient } from "@/lib/supabase";

// function createSupabaseClient() {
//   const cookieStore = cookies();
//   const authToken = cookieStore.get('sb-access-token')?.value ||
//                     cookieStore.get('sb-auth-token')?.value;

//   return createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       global: {
//         headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
//       },
//     }
//   );
// }

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createSupabaseClient();
    const params = await context.params;
    const eventId = params.id;
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "userId parameter is required" },
        { status: 400 },
      );
    }

    // Get event details (without joins that cause errors)
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, start_date, end_date")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("Error fetching event:", eventError);
      return NextResponse.json({
        penalty: { has_penalty_rule: false },
        streak: { current_streak: 0, longest_streak: 0 },
      });
    }

    // Calculate penalty manually instead of using RPC
    // (in case RPC function has issues)

    // 1. Get penalty rule config
    const { data: penaltyRules } = await supabase
      .from("event_rules")
      .select("rule_id")
      .eq("event_id", eventId);

    let penaltyConfig = null;
    if (penaltyRules && penaltyRules.length > 0) {
      const { data: rules } = await supabase
        .from("rules")
        .select("rule_type, config")
        .in(
          "id",
          penaltyRules.map((er) => er.rule_id),
        )
        .eq("rule_type", "penalty_missed_day");

      if (rules && rules.length > 0) {
        penaltyConfig = rules[0].config;
      }
    }

    // 2. Calculate penalty
    let penaltyData = { has_penalty_rule: false };

    if (penaltyConfig) {
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      const totalDays =
        Math.floor(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;

      // Count unique active days
      const { data: activities } = await supabase
        .from("activities")
        .select("start_date")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .gte("start_date", event.start_date) // ✅ Filter start
        .lte("start_date", event.end_date); // ✅ Filter end

      // Count UNIQUE days (CRITICAL!)
      const uniqueDays = new Set(
        (activities || []).map((a) => {
          const date = new Date(a.start_date);
          return date.toISOString().split("T")[0]; // YYYY-MM-DD
        }),
      );

      const activeDays = uniqueDays.size;
      const missedDays = totalDays - activeDays;
      const penaltyPerDay = penaltyConfig.penalty_per_day || 50000;
      const penaltyAmount = missedDays * penaltyPerDay;

      penaltyData = {
        has_penalty_rule: true,
        total_days: totalDays,
        active_days: activeDays,
        missed_days: missedDays,
        penalty_per_day: penaltyPerDay,
        penalty_amount: penaltyAmount,
        currency: penaltyConfig.currency || "VND",
      };
    }

    // 3. Calculate streak manually
    const { data: activities } = await supabase
      .from("activities")
      .select("start_date")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .order("start_date", { ascending: true });

    let streakData = {
      current_streak: 0,
      longest_streak: 0,
      total_active_days: 0,
    };

    if (activities && activities.length > 0) {
      // Get unique dates sorted
      const dates = Array.from(
        new Set(
          activities.map((a) => {
            const date = new Date(a.start_date);
            return date.toISOString().split("T")[0];
          }),
        ),
      ).sort();

      let currentStreak = 1;
      let longestStreak = 1;

      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);
        const diffDays = Math.floor(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diffDays === 1) {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 1;
        }
      }

      streakData = {
        current_streak: currentStreak,
        longest_streak: longestStreak,
        total_active_days: dates.length,
      };
    }

    return NextResponse.json({
      penalty: penaltyData,
      streak: streakData,
    });
  } catch (error: any) {
    console.error("Error in penalties-streaks API:", error);
    return NextResponse.json(
      {
        penalty: { has_penalty_rule: false },
        streak: { current_streak: 0, longest_streak: 0 },
        error: error.message,
      },
      { status: 500 },
    );
  }
}
