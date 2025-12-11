// app/api/users/[userId]/best-efforts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/users/[userId]/best-efforts
 * Lấy Personal Records (Best Efforts) của user
 */
export async function GET(
  request: NextRequest,
  // { params }: { params: { userId: string } }
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = (await context.params).id;

    // Get PRs using database function
    const { data: prs, error } = await supabase.rpc("get_user_prs", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error getting PRs:", error);
      return NextResponse.json(
        { error: "Failed to get personal records" },
        { status: 500 }
      );
    }

    if (!prs || prs.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "No personal records found",
      });
    }

    // Format response
    const formattedPRs = prs.map((pr: any) => ({
      distance: pr.effort_name,
      time: pr.best_time,
      pace: formatPace(pr.best_time, getDistanceInMeters(pr.effort_name)),
      date: pr.activity_date,
      activityId: pr.strava_activity_id,
      formattedTime: formatTime(pr.best_time),
    }));

    // Sort by common race distances
    const sortedPRs = sortByDistance(formattedPRs);

    return NextResponse.json({
      success: true,
      data: sortedPRs,
    });
  } catch (error: any) {
    console.error("Best efforts API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper: Format time in seconds to HH:MM:SS or MM:SS
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Helper: Calculate pace (min/km)
function formatPace(timeInSeconds: number, distanceInMeters: number): string {
  const paceSeconds = (timeInSeconds / distanceInMeters) * 1000;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Helper: Get distance in meters for effort name
function getDistanceInMeters(effortName: string): number {
  const distances: { [key: string]: number } = {
    "400m": 400,
    "1/2 mile": 804.672,
    "1k": 1000,
    "1 mile": 1609.34,
    "2 mile": 3218.69,
    "5k": 5000,
    "10k": 10000,
    "15k": 15000,
    "10 mile": 16093.4,
    "20k": 20000,
    "Half-Marathon": 21097.5,
    Marathon: 42195,
  };
  return distances[effortName] || 0;
}

// Helper: Sort PRs by distance
function sortByDistance(prs: any[]): any[] {
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
