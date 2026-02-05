// app/api/events/[id]/leaderboard/route.ts - FIXED
// Get event leaderboard with rankings

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { calculateLeaderboardRankings } from "@/lib/rule-validators";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createSupabaseClient();
    const params = await context.params;
    const eventId = params.id;
    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get all event completions (WITHOUT user join - we'll fetch separately)
    const { data: completions, error: completionsError } = await supabase
      .from("event_completions")
      .select("*")
      .eq("event_id", eventId)
      .order("completion_percentage", { ascending: false });

    if (completionsError) {
      console.error("Error fetching completions:", completionsError);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard" },
        { status: 500 },
      );
    }

    if (!completions || completions.length === 0) {
      return NextResponse.json({
        event: {
          id: event.id,
          name: event.name,
          start_date: event.start_date,
          end_date: event.end_date,
        },
        leaderboard: [],
        totalParticipants: 0,
        completedCount: 0,
      });
    }

    // Get user IDs
    const userIds = completions.map((c) => c.user_id);

    // Fetch users separately using the public.users view
    const { data: users } = await supabase
      .from("users")
      .select("id, email, raw_user_meta_data")
      .in("id", userIds);

    // Create user lookup map
    const userMap = (users || []).reduce(
      (acc, user) => {
        acc[user.id] = user;
        return acc;
      },
      {} as Record<string, any>,
    );

    // Get badges for each user
    const { data: userBadges } = await supabase
      .from("user_badges")
      .select(
        `
        *,
        badges (
          name,
          icon,
          badge_type
        )
      `,
      )
      .eq("event_id", eventId);

    // Map badges by user_id
    const badgesByUser = (userBadges || []).reduce(
      (acc, ub) => {
        if (!acc[ub.user_id]) {
          acc[ub.user_id] = [];
        }
        acc[ub.user_id].push(ub.badges.icon);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    // Format leaderboard entries
    const entries = completions.map((completion: any) => {
      const user = userMap[completion.user_id];

      return {
        userId: completion.user_id,
        userName:
          user?.raw_user_meta_data?.full_name ||
          user?.raw_user_meta_data?.name ||
          user?.email?.split("@")[0] ||
          "Anonymous",
        userAvatar:
          user?.raw_user_meta_data?.avatar_url ||
          user?.raw_user_meta_data?.picture,
        activeDays: completion.active_days,
        totalDays: completion.total_days,
        requiredDays: completion.required_days,
        completionPercentage: parseFloat(completion.completion_percentage),
        isCompleted: completion.is_completed,
        badges: badgesByUser[completion.user_id] || [],
      };
    });

    // Calculate rankings
    const rankedEntries = calculateLeaderboardRankings(entries);

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        start_date: event.start_date,
        end_date: event.end_date,
      },
      leaderboard: rankedEntries,
      totalParticipants: rankedEntries.length,
      completedCount: rankedEntries.filter((e) => e.isCompleted).length,
    });
  } catch (error: any) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
