import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ user: null });
    }

    // Get user from database
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !user) {
      // Clear invalid cookie
      cookieStore.delete("user_id");
      return NextResponse.json({ user: null });
    }

    // Don't send sensitive data to client
    const { strava_access_token, strava_refresh_token, ...safeUser } = user;

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ user: null });
  }
}
