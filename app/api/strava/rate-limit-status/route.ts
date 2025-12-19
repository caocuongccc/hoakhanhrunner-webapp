// app/api/strava/rate-limit-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

// Store rate limit data in memory (simple implementation)
// For production, use Redis or similar
let rateLimitRequests: { timestamp: number }[] = [];
const MAX_REQUESTS = 90; // Buffer: 90 instead of 100
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_token")?.value;

    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();

    // Clean old requests outside window
    rateLimitRequests = rateLimitRequests.filter(
      (r) => now - r.timestamp < WINDOW_MS
    );

    const used = rateLimitRequests.length;
    const percentage = (used / MAX_REQUESTS) * 100;

    // Calculate reset time (end of current 15min window)
    const oldestRequest =
      rateLimitRequests.length > 0
        ? Math.min(...rateLimitRequests.map((r) => r.timestamp))
        : now;
    const resetTime = new Date(oldestRequest + WINDOW_MS).toISOString();

    return NextResponse.json({
      used,
      limit: MAX_REQUESTS,
      percentage: Math.round(percentage * 10) / 10,
      resetTime,
    });
  } catch (error: any) {
    console.error("Rate limit status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get rate limit status" },
      { status: 500 }
    );
  }
}

// Helper function to record a request (call this when making Strava API calls)
export function recordRequest() {
  rateLimitRequests.push({ timestamp: Date.now() });
}
