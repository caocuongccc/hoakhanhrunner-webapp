// app/api/admin/login/route.ts - FIXED VERSION for Next.js 16+
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log("📝 Admin login attempt:", email);

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email và mật khẩu là bắt buộc" },
        { status: 400 }
      );
    }

    // Get admin
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .eq("is_active", true)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    if (!admin.password_hash) {
      return NextResponse.json(
        {
          error:
            "Tài khoản chưa được cấu hình đầy đủ. Vui lòng liên hệ quản trị viên.",
        },
        { status: 500 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    // Generate session token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Client metadata
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const userAgent = request.headers.get("user-agent") || "unknown";

    // Create session record
    const { data: sessionData, error: sessionError } = await supabase
      .from("admin_sessions")
      .insert([
        {
          admin_id: admin.id,
          token,
          expires_at: expiresAt.toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      ])
      .select()
      .single();

    if (sessionError) {
      return NextResponse.json(
        {
          error: "Không thể tạo phiên đăng nhập: " + sessionError.message,
        },
        { status: 500 }
      );
    }

    // Update last login timestamp
    await supabase
      .from("admins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", admin.id);

    // Prepare API response
    const { password_hash, ...adminData } = admin;

    const response = NextResponse.json({
      success: true,
      admin: adminData,
    });

    // 👇 FIX COOKIE (Next.js 16 compatible)
    response.cookies.set({
      name: "admin_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    console.log("🍪 Cookie set via NextResponse");

    return response;
  } catch (error: any) {
    console.error("❌ Admin login error:", error);
    return NextResponse.json(
      {
        error: "Đã xảy ra lỗi khi đăng nhập",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
