// app/api/events/[id]/activities/route.ts
// Get activities for a specific user in an event

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const supabase = createSupabaseClient();
    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId parameter is required" },
        { status: 400 },
      );
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    // Get user's activities for this event
    const { data: activities, error: activitiesError } = await supabase
      .from("activities")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", userId);
    //.order("activity_date", { ascending: false });
    if (activitiesError) {
      return NextResponse.json(
        { error: "Failed to fetch activities" },
        { status: 500 },
      );
    }
    console.log(
      "Fetched activities for user",
      userId,
      "in event",
      eventId,
      activities,
    );
    // Calculate statistics
    const totalDistance = (activities || []).reduce(
      (sum, activity) => sum + (activity.distance_km || 0),
      0,
    );
    const totalMovingTime = (activities || []).reduce(
      (sum, activity) => sum + (activity.duration_seconds || 0),
      0,
    );
    const uniqueDays = new Set(
      (activities || []).map((activity) => {
        const date = new Date(activity.activity_date);
        return date; //.toISOString().split("T")[0];
      }),
    );
    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        start_date: event.start_date,
        end_date: event.end_date,
      },
      userId,
      activities: activities || [],
      stats: {
        totalActivities: activities?.length || 0,
        totalDistance: totalDistance, // Convert to km
        totalMovingTime: totalMovingTime, // Convert to minutes
        uniqueDays: uniqueDays.size,
        averageDistance:
          activities && activities.length > 0
            ? totalDistance / activities.length
            : 0,
        averagePace:
          totalDistance > 0 ? totalMovingTime / 60 / totalDistance : 0,
      },
    });
  } catch (error: any) {
    console.error("Error in activities API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
