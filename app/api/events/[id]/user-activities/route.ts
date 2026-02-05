// app/api/events/[id]/user-activities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const eventId = (await context.params).id;
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseClient();

    // Load all activities for this user in this event
    const { data: activities, error } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .gt("points_earned", 0) // Only valid activities
      .order("activity_date", { ascending: false });

    if (error) {
      console.error("Error loading activities:", error);
      return NextResponse.json(
        { error: "Failed to load activities" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      activities: activities || [],
    });
  } catch (error: any) {
    console.error("User activities API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
