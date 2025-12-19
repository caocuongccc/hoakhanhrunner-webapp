// app/api/strava/cache-stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_token")?.value;

    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get cache statistics
    const now = new Date().toISOString();

    // Total cached activities
    const { count: total } = await supabase
      .from("strava_activity_cache")
      .select("*", { count: "exact", head: true });

    // Valid (not expired) cached activities
    const { count: valid } = await supabase
      .from("strava_activity_cache")
      .select("*", { count: "exact", head: true })
      .gte("expires_at", now);

    // Expired cached activities
    const expired = (total || 0) - (valid || 0);

    // Calculate hit rate (approximate based on recent usage)
    // This is a simple estimation - you could track this more precisely
    const hitRate = total && total > 0 ? (valid / total) * 100 : 0;

    return NextResponse.json({
      total: total || 0,
      valid: valid || 0,
      expired,
      hitRate: Math.round(hitRate * 10) / 10, // Round to 1 decimal
    });
  } catch (error: any) {
    console.error("Cache stats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get cache stats" },
      { status: 500 }
    );
  }
}
