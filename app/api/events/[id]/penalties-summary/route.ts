// app/api/events/[id]/penalties-summary/route.ts
// PUBLIC penalties summary - everyone can see who owes how much

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
    const eventId = params.id;

    console.log("Fetching penalties summary for event:", eventId);

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, start_date, end_date")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from("event_participants")
      .select("user_id")
      .eq("event_id", eventId);

    if (participantsError || !participants || participants.length === 0) {
      return NextResponse.json({
        event,
        summary: {
          totalParticipants: 0,
          totalPenalties: 0,
          participantsWithPenalties: 0,
          participantsWithoutPenalties: 0,
        },
        participants: [],
      });
    }

    const userIds = participants.map((p) => p.user_id);

    // Get user details
    const { data: users } = await supabase
      .from("users")
      .select("id, username, email, avatar_url, full_name")
      .in("id", userIds);

    const userMap = (users || []).reduce(
      (acc, user) => {
        acc[user.id] = {
          username:
            user.username ||
            user.full_name ||
            user.email?.split("@")[0] ||
            `User ${user.id.slice(0, 8)}`,
          avatar: user.avatar_url || null,
          email: user.email,
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    userIds.forEach((id) => {
      if (!userMap[id]) {
        userMap[id] = {
          username: `User ${id.slice(0, 8)}`,
          avatar: null,
          email: null,
        };
      }
    });

    // Get penalties
    const { data: penalties } = await supabase
      .from("event_penalties")
      .select(
        "user_id, total_days, active_days, missed_days, penalty_amount, is_paid",
      )
      .eq("event_id", eventId);

    const penaltyMap = (penalties || []).reduce(
      (acc, p) => {
        acc[p.user_id] = p;
        return acc;
      },
      {} as Record<string, any>,
    );

    // Build participant list
    const participantList = userIds.map((userId) => {
      const userInfo = userMap[userId];
      const penalty = penaltyMap[userId] || {
        total_days: 0,
        active_days: 0,
        missed_days: 0,
        penalty_amount: 0,
        is_paid: false,
      };

      return {
        userId,
        userName: userInfo.username,
        userAvatar: userInfo.avatar,
        totalDays: penalty.total_days,
        activeDays: penalty.active_days,
        missedDays: penalty.missed_days,
        penaltyAmount: penalty.penalty_amount,
        isPaid: penalty.is_paid || false,
      };
    });

    // Sort by penalty amount (highest first)
    participantList.sort((a, b) => b.penaltyAmount - a.penaltyAmount);

    // Calculate summary
    const totalPenalties = participantList.reduce(
      (sum, p) => sum + p.penaltyAmount,
      0,
    );
    const participantsWithPenalties = participantList.filter(
      (p) => p.penaltyAmount > 0,
    ).length;
    const participantsWithoutPenalties = participantList.filter(
      (p) => p.penaltyAmount === 0,
    ).length;
    const paidCount = participantList.filter((p) => p.isPaid).length;
    const unpaidCount = participantList.filter(
      (p) => !p.isPaid && p.penaltyAmount > 0,
    ).length;
    const totalPaid = participantList
      .filter((p) => p.isPaid)
      .reduce((sum, p) => sum + p.penaltyAmount, 0);
    const totalUnpaid = participantList
      .filter((p) => !p.isPaid)
      .reduce((sum, p) => sum + p.penaltyAmount, 0);

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        startDate: event.start_date,
        endDate: event.end_date,
      },
      summary: {
        totalParticipants: participantList.length,
        totalPenalties,
        participantsWithPenalties,
        participantsWithoutPenalties,
        paidCount,
        unpaidCount,
        totalPaid,
        totalUnpaid,
        currency: "VND",
      },
      participants: participantList,
    });
  } catch (error: any) {
    console.error("Error in penalties-summary:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
