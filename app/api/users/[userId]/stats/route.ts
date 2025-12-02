// app/api/users/[userId]/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/users/[userId]/stats
 * Lấy thống kê chi tiết của user (giống Strava My Stats)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    const { searchParams } = request.nextUrl;
    const period = searchParams.get("period") || "all_time"; // all_time, this_year, this_month

    // Get user info
    const { data: user } = await supabase
      .from("users")
      .select("username, full_name, avatar_url, strava_id")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get date range
    const dateRange = getDateRange(period);

    // Get activities in date range
    const { data: activities } = await supabase
      .from("strava_activities")
      .select("*")
      .eq("user_id", userId)
      .gte("start_date_local", dateRange.start)
      .lte("start_date_local", dateRange.end);

    if (!activities || activities.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          user: {
            username: user.username,
            fullName: user.full_name,
            avatarUrl: user.avatar_url,
          },
          period,
          stats: getEmptyStats(),
          personalRecords: [],
        },
      });
    }

    // Calculate statistics
    const stats = calculateStats(activities);

    // Get Personal Records
    const { data: prs } = await supabase.rpc("get_user_prs", {
      p_user_id: userId,
    });

    const personalRecords = (prs || []).map((pr: any) => ({
      distance: pr.effort_name,
      time: pr.best_time,
      date: pr.activity_date,
      activityId: pr.strava_activity_id,
      formattedTime: formatTime(pr.best_time),
    }));

    return NextResponse.json({
      success: true,
      data: {
        user: {
          username: user.username,
          fullName: user.full_name,
          avatarUrl: user.avatar_url,
        },
        period,
        stats,
        personalRecords: sortPRsByDistance(personalRecords),
      },
    });
  } catch (error: any) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper: Get date range based on period
function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();

  let start: Date;

  switch (period) {
    case "this_year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "this_month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "this_week":
      const dayOfWeek = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      break;
    default: // all_time
      start = new Date("2000-01-01");
  }

  return {
    start: start.toISOString(),
    end,
  };
}

// Helper: Calculate statistics from activities
function calculateStats(activities: any[]) {
  const totalDistance = activities.reduce(
    (sum, a) => sum + (a.distance || 0),
    0
  );
  const totalTime = activities.reduce(
    (sum, a) => sum + (a.moving_time || 0),
    0
  );
  const totalElevation = activities.reduce(
    (sum, a) => sum + (a.total_elevation_gain || 0),
    0
  );

  // Calculate average pace (min/km)
  const avgPaceSeconds =
    totalDistance > 0 ? (totalTime / totalDistance) * 1000 : 0;
  const avgPaceMinutes = Math.floor(avgPaceSeconds / 60);
  const avgPaceSeconds2 = Math.floor(avgPaceSeconds % 60);

  // Find longest run
  const longestRun = activities.reduce(
    (max, a) => (a.distance > max.distance ? a : max),
    { distance: 0, name: "", start_date_local: "" }
  );

  // Find fastest pace
  const fastestPaceActivity = activities
    .filter((a) => a.average_speed > 0)
    .reduce(
      (fastest, a) => (a.average_speed > fastest.average_speed ? a : fastest),
      { average_speed: 0, name: "", start_date_local: "" }
    );

  const fastestPaceSeconds =
    fastestPaceActivity.average_speed > 0
      ? 1000 / (fastestPaceActivity.average_speed * 60)
      : 0;

  return {
    totalRuns: activities.length,
    totalDistance: {
      meters: totalDistance,
      km: (totalDistance / 1000).toFixed(2),
    },
    totalTime: {
      seconds: totalTime,
      formatted: formatDuration(totalTime),
    },
    totalElevation: {
      meters: Math.round(totalElevation),
    },
    averagePace: {
      seconds: avgPaceSeconds,
      formatted: `${avgPaceMinutes}:${avgPaceSeconds2.toString().padStart(2, "0")}`,
    },
    longestRun: {
      distance: (longestRun.distance / 1000).toFixed(2),
      name: longestRun.name,
      date: longestRun.start_date_local,
    },
    fastestPace: {
      pace:
        fastestPaceSeconds > 0
          ? `${Math.floor(fastestPaceSeconds / 60)}:${Math.floor(
              fastestPaceSeconds % 60
            )
              .toString()
              .padStart(2, "0")}`
          : "N/A",
      name: fastestPaceActivity.name,
      date: fastestPaceActivity.start_date_local,
    },
  };
}

function getEmptyStats() {
  return {
    totalRuns: 0,
    totalDistance: { meters: 0, km: "0.00" },
    totalTime: { seconds: 0, formatted: "0:00" },
    totalElevation: { meters: 0 },
    averagePace: { seconds: 0, formatted: "0:00" },
    longestRun: { distance: "0.00", name: "", date: "" },
    fastestPace: { pace: "N/A", name: "", date: "" },
  };
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function sortPRsByDistance(prs: any[]): any[] {
  const order = [
    "400m",
    "1/2 mile",
    "1k",
    "1 mile",
    "2 mile",
    "5k",
    "10k",
    "15k",
    "10 mile",
    "20k",
    "Half-Marathon",
    "Marathon",
  ];

  return prs.sort((a, b) => {
    const indexA = order.indexOf(a.distance);
    const indexB = order.indexOf(b.distance);

    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
}
