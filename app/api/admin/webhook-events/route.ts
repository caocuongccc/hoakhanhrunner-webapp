// app/api/admin/webhook-events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

/**
 * GET - Lấy danh sách webhook events
 * Query params:
 *  - limit: số lượng events cần lấy (default: 10)
 *  - processed: lọc theo trạng thái processed (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_token")?.value;

    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin session
    const { data: session } = await supabase
      .from("admin_sessions")
      .select("admin_id")
      .eq("token", adminToken)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Get query params
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "10");
    const processedFilter = searchParams.get("processed");

    // Build query
    let query = supabase
      .from("strava_webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter by processed status if specified
    if (processedFilter === "true") {
      query = query.eq("processed", true);
    } else if (processedFilter === "false") {
      query = query.eq("processed", false);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error("Error fetching webhook events:", error);
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      events: events || [],
      count: events?.length || 0,
    });
  } catch (error: any) {
    console.error("Webhook events API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Xóa webhook events cũ
 * Query params:
 *  - older_than_days: xóa events cũ hơn X ngày (default: 30)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_token")?.value;

    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin session
    const { data: session } = await supabase
      .from("admin_sessions")
      .select("admin_id, admins!inner(role)")
      .eq("token", adminToken)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session || session.admins.role !== "super_admin") {
      return NextResponse.json(
        { error: "Super admin required" },
        { status: 403 }
      );
    }

    // Get query params
    const { searchParams } = request.nextUrl;
    const olderThanDays = parseInt(searchParams.get("older_than_days") || "30");

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Delete old events
    const { error } = await supabase
      .from("strava_webhook_events")
      .delete()
      .lt("created_at", cutoffDate.toISOString());

    if (error) {
      console.error("Error deleting webhook events:", error);
      return NextResponse.json(
        { error: "Failed to delete events" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deleted events older than ${olderThanDays} days`,
    });
  } catch (error: any) {
    console.error("Delete webhook events error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
