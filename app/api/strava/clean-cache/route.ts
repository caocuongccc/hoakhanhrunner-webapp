// app/api/strava/clean-cache/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
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

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Delete expired cache entries
    const now = new Date().toISOString();

    const { data: deleted, error } = await supabase
      .from("strava_activity_cache")
      .delete()
      .lt("expires_at", now)
      .select();

    if (error) {
      console.error("Error cleaning cache:", error);
      return NextResponse.json(
        { error: "Failed to clean cache" },
        { status: 500 }
      );
    }

    const deletedCount = deleted?.length || 0;

    console.log(`🧹 Cleaned up ${deletedCount} expired cache entries`);

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      message: `Deleted ${deletedCount} expired cache entries`,
    });
  } catch (error: any) {
    console.error("Clean cache error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to clean cache" },
      { status: 500 }
    );
  }
}
