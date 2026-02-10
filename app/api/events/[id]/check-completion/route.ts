// app/api/events/[id]/check-completion/route.ts - FIXED AUTH
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";

import { cookies } from "next/headers";
import {
  validateMinActiveDays,
  isEventEnded,
  getMinActiveDaysMessage,
  determineBadge,
} from "@/lib/rule-validators";

// Helper to create Supabase client with proper auth

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
        {
          error: "Unauthorized",
          message: "Vui lòng đăng nhập để xem thông tin này",
          auth_error: "User not authenticated",
        },
        { status: 401 },
      );
    }

    // Get event with rules
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(
        `
        *,
        event_rules (
          rules (*)
        )
      `,
      )
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if event has ended
    const eventEnded = isEventEnded(new Date(event.end_date));

    // Get user's activities in this event
    const { data: activities, error: activitiesError } = await supabase
      .from("activities")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (activitiesError) {
      return NextResponse.json(
        { error: "Failed to fetch activities" },
        { status: 500 },
      );
    }

    // Check if event has min_active_days rule
    const minActiveDaysRule = event.event_rules?.find(
      (er: any) => er.rules?.rule_type === "min_active_days",
    );
    if (!minActiveDaysRule) {
      return NextResponse.json({
        hasRule: false,
        message: "Event does not have minimum active days requirement",
      });
    }

    // Validate min_active_days rule
    const validationResult = validateMinActiveDays(
      activities || [],
      new Date(event.start_date),
      new Date(event.end_date),
      minActiveDaysRule.rules.config as any,
    );
    const message = getMinActiveDaysMessage(validationResult);

    // Determine badge
    const badge = validationResult.isValid
      ? determineBadge(validationResult.completionPercentage)
      : null;

    // If event ended and user completed, save to event_completions
    if (eventEnded && validationResult.isValid) {
      await supabase.from("event_completions").upsert(
        {
          event_id: eventId,
          user_id: userId,
          completion_percentage: validationResult.completionPercentage,
          active_days: validationResult.activeDays,
          total_days: validationResult.totalDays,
          required_days: validationResult.requiredDays,
          is_completed: validationResult.isValid,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: "event_id,user_id",
        },
      );

      // Award badge if earned
      if (badge) {
        const { data: badgeData } = await supabase
          .from("badges")
          .select("id")
          .eq("badge_type", "min_active_days")
          .gte(
            "criteria->min_percentage",
            validationResult.completionPercentage,
          )
          .order("criteria->min_percentage", { ascending: true })
          .limit(1)
          .single();

        if (badgeData) {
          await supabase.from("user_badges").upsert(
            {
              user_id: userId,
              badge_id: badgeData.id,
              event_id: eventId,
              metadata: {
                completion_percentage: validationResult.completionPercentage,
                active_days: validationResult.activeDays,
                total_days: validationResult.totalDays,
              },
            },
            {
              onConflict: "user_id,badge_id,event_id",
            },
          );
        }
      }
    }

    return NextResponse.json({
      hasRule: true,
      eventEnded,
      completed: validationResult.isValid,
      message,
      details: {
        activeDays: validationResult.activeDays,
        requiredDays: validationResult.requiredDays,
        totalDays: validationResult.totalDays,
        graceDays: validationResult.graceDays,
        missedDays: validationResult.missedDays,
        percentage: validationResult.completionPercentage.toFixed(1),
      },
      badge,
      rule: {
        name: minActiveDaysRule.rules.name,
        description: minActiveDaysRule.rules.description,
        config: minActiveDaysRule.rules.config,
      },
    });
  } catch (error: any) {
    console.error("Error checking event completion:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
