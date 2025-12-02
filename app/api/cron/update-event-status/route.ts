// app/api/cron/update-event-status/route.ts
// This runs automatically to update event statuses
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const now = new Date().toISOString();

    console.log("🔄 Running event status update...");

    // Update pending events to active
    const { data: activatedEvents, error: activeError } = await supabase
      .from("events")
      .update({ status: "active" })
      .eq("status", "pending")
      .lte("start_date", now)
      .gte("end_date", now)
      .select();

    if (activeError) {
      console.error("Error activating events:", activeError);
    } else if (activatedEvents && activatedEvents.length > 0) {
      console.log(
        `✅ Activated ${activatedEvents.length} events:`,
        activatedEvents.map((e) => e.name).join(", ")
      );
    }

    // Update active events to completed
    const { data: completedEvents, error: completeError } = await supabase
      .from("events")
      .update({ status: "completed" })
      .eq("status", "active")
      .lt("end_date", now)
      .select();

    if (completeError) {
      console.error("Error completing events:", completeError);
    } else if (completedEvents && completedEvents.length > 0) {
      console.log(
        `✅ Completed ${completedEvents.length} events:`,
        completedEvents.map((e) => e.name).join(", ")
      );
    }

    return NextResponse.json({
      success: true,
      activated: activatedEvents?.length || 0,
      completed: completedEvents?.length || 0,
      timestamp: now,
    });
  } catch (error: any) {
    console.error("❌ Error updating event statuses:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Manual trigger endpoint
export async function POST(request: NextRequest) {
  return GET(request);
}
