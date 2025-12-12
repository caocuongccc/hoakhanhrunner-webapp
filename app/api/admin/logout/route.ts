import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (token) {
      // Delete session from database
      await supabase.from("admin_sessions").delete().eq("token", token);
    }

    // Clear cookie
    cookieStore.delete("admin_token");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin logout error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi đăng xuất" },
      { status: 500 }
    );
  }
}
