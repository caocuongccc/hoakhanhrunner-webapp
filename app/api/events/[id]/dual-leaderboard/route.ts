// app/api/events/[id]/dual-leaderboard/route.ts
// FIXED VERSION - Better error handling and data fetching

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const params = await context.params;
    console.log("Fetching dual leaderboard for event ID:", params.id);
    const eventId = params.id;

    console.log("Fetching leaderboard for event:", eventId);

    // STEP 1: Get all participants with their totals
    const { data: participants, error: participantsError } = await supabase
      .from("event_participants")
      .select("user_id, total_km, total_points, activity_count")
      .eq("event_id", eventId)
      .order("total_km", { ascending: false });

    if (participantsError) {
      console.error("Error fetching participants:", participantsError);
      return NextResponse.json({
        endurance: [],
        consistency: [],
        error: participantsError.message,
      });
    }

    console.log(`Found ${participants?.length || 0} participants`);

    if (!participants || participants.length === 0) {
      return NextResponse.json({
        endurance: [],
        consistency: [],
        totalParticipants: 0,
        message: "No participants yet",
      });
    }

    // STEP 2: Get user details
    const userIds = participants.map((p) => p.user_id);

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, username, email, raw_user_meta_data")
      .in("id", userIds);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      // Continue without user details
    }

    console.log(`Found ${users?.length || 0} user details`);

    // Create user map
    const userMap = (users || []).reduce(
      (acc, user) => {
        acc[user.id] = {
          username:
            user.username ||
            user.raw_user_meta_data?.full_name ||
            user.raw_user_meta_data?.username ||
            user.email?.split("@")[0] ||
            "User",
          avatar: user.raw_user_meta_data?.avatar_url,
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    // STEP 3: Get streaks
    const { data: streaks, error: streaksError } = await supabase
      .from("user_streaks")
      .select("user_id, longest_streak, current_streak")
      .eq("event_id", eventId);

    if (streaksError) {
      console.error("Error fetching streaks:", streaksError);
      // Continue without streaks
    }

    console.log(`Found ${streaks?.length || 0} streaks`);

    // Create streak map
    const streakMap = (streaks || []).reduce(
      (acc, s) => {
        acc[s.user_id] = {
          longest: s.longest_streak || 0,
          current: s.current_streak || 0,
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    // STEP 4: Build endurance leaderboard (sorted by total_km)
    const endurance = participants.map((p) => {
      const userInfo = userMap[p.user_id] || {
        username: "Unknown User",
        avatar: null,
      };
      const streak = streakMap[p.user_id] || { longest: 0, current: 0 };

      return {
        userId: p.user_id,
        userName: userInfo.username,
        userAvatar: userInfo.avatar,
        totalKm: p.total_km || 0,
        totalPoints: p.total_points || 0,
        activeDays: p.activity_count || 0,
        longestStreak: streak.longest,
        currentStreak: streak.current,
      };
    });

    // STEP 5: Build consistency leaderboard (sorted by longest_streak)
    const consistency = [...endurance]
      .sort((a, b) => b.longestStreak - a.longestStreak)
      .filter((e) => e.longestStreak > 0); // Only show users with streaks

    console.log("Leaderboard built successfully:", {
      endurance: endurance.length,
      consistency: consistency.length,
    });

    return NextResponse.json({
      endurance,
      consistency,
      totalParticipants: participants.length,
      debug: {
        participantsCount: participants.length,
        usersFound: users?.length || 0,
        streaksFound: streaks?.length || 0,
      },
    });
  } catch (error: any) {
    console.error("Unexpected error in dual-leaderboard:", error);
    return NextResponse.json(
      {
        endurance: [],
        consistency: [],
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
