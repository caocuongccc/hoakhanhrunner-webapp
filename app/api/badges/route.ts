// app/api/badges/route.ts
// Get user badges (earned and available)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const showLocked = searchParams.get("showLocked") === "true";

    // Get current user if userId not specified

    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    let targetUserId = userId;
    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      targetUserId = user.id;
    }

    // Get all badges
    const { data: allBadges, error: badgesError } = await supabase
      .from("badges")
      .select("*")
      .order("created_at", { ascending: true });

    if (badgesError) {
      console.error("Error fetching badges:", badgesError);
      return NextResponse.json(
        { error: "Failed to fetch badges" },
        { status: 500 },
      );
    }

    // Get user's earned badges
    let userBadgesQuery = supabase
      .from("user_badges")
      .select(
        `
        *,
        badges (*),
        events (name)
      `,
      )
      .eq("user_id", targetUserId);

    if (eventId) {
      userBadgesQuery = userBadgesQuery.eq("event_id", eventId);
    }

    const { data: userBadges } = await userBadgesQuery;

    // Map earned badges
    const earnedBadgeIds = new Set((userBadges || []).map((ub) => ub.badge_id));

    // Combine earned and locked badges
    const badges = (allBadges || []).map((badge) => {
      const userBadge = userBadges?.find((ub) => ub.badge_id === badge.id);

      return {
        ...badge,
        earned: earnedBadgeIds.has(badge.id),
        earned_at: userBadge?.earned_at,
        event_name: userBadge?.events?.name,
      };
    });

    // Filter if showLocked is false
    const filteredBadges = showLocked ? badges : badges.filter((b) => b.earned);

    return NextResponse.json({
      badges: filteredBadges,
      totalBadges: allBadges?.length || 0,
      earnedCount: earnedBadgeIds.size,
    });
  } catch (error: any) {
    console.error("Error in badges API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
