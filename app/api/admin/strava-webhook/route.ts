import { NextRequest, NextResponse } from "next/server";
import {
  subscribeToStravaWebhook,
  viewWebhookSubscription,
  deleteWebhookSubscription,
} from "@/lib/strava";
import { supabase } from "@/lib/supabase";

/**
 * GET - View current webhook subscription
 */
export async function GET(request: NextRequest) {
  try {
    const subscriptions = await viewWebhookSubscription();

    return NextResponse.json({
      success: true,
      data: subscriptions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST - Create webhook subscription
 */
export async function POST(request: NextRequest) {
  try {
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/strava/webhook`;
    const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN!;

    const subscription = await subscribeToStravaWebhook(
      callbackUrl,
      verifyToken
    );

    // Save subscription to database
    await supabase.from("strava_webhook_subscriptions").insert([
      {
        subscription_id: subscription.id,
        callback_url: callbackUrl,
        verify_token: verifyToken,
        is_active: true,
      },
    ]);

    return NextResponse.json({
      success: true,
      data: subscription,
      message: "Webhook subscription created successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE - Delete webhook subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const subscriptionId = searchParams.get("id");

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    await deleteWebhookSubscription(parseInt(subscriptionId));

    // Update database
    await supabase
      .from("strava_webhook_subscriptions")
      .update({ is_active: false })
      .eq("subscription_id", parseInt(subscriptionId));

    return NextResponse.json({
      success: true,
      message: "Webhook subscription deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
