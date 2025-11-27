import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("admin_token")?.value;

    console.log("Checking admin session, token:", token ? "exists" : "null");

    if (!token) {
      return NextResponse.json({ admin: null });
    }

    // First, get the session
    const { data: session, error: sessionError } = await supabase
      .from("admin_sessions")
      .select("*")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    console.log("Session query result:", { session, error: sessionError });

    if (sessionError || !session) {
      console.log("Invalid session, clearing cookie");
      cookieStore.delete("admin_token");
      return NextResponse.json({ admin: null });
    }

    // Then get the admin data separately
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id, email, username, full_name, role, is_active")
      .eq("id", session.admin_id)
      .eq("is_active", true)
      .single();

    console.log("Admin query result:", { admin, error: adminError });

    if (adminError || !admin) {
      console.log("Admin not found, clearing cookie");
      cookieStore.delete("admin_token");
      return NextResponse.json({ admin: null });
    }

    return NextResponse.json({ admin });
  } catch (error) {
    console.error("Admin session check error:", error);
    return NextResponse.json({ admin: null });
  }
}
