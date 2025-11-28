import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log("Admin login attempt:", email);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email và mật khẩu là bắt buộc" },
        { status: 400 }
      );
    }

    // Get admin by email
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .eq("is_active", true)
      .single();
    console.log("admin", admin);
    console.log("Admin query:", {
      found: !!admin,
      error: adminError,
      admin: admin ? { id: admin.id, email: admin.email } : null,
    });

    if (adminError || !admin) {
      console.log("Admin not found or error:", adminError);
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    console.log("Password verification:", isValidPassword);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    // Generate session token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Get client info
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    console.log("Creating session:", {
      admin_id: admin.id,
      expires_at: expiresAt,
    });

    // Create session
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

    console.log("Session created:", {
      success: !!sessionData,
      error: sessionError,
      session_id: sessionData?.id,
    });

    if (sessionError) {
      console.error("Session creation error:", sessionError);
      return NextResponse.json(
        { error: "Không thể tạo phiên đăng nhập" },
        { status: 500 }
      );
    }

    // Update last login
    await supabase
      .from("admins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", admin.id);

    // Set cookie
    const cookieStore = cookies();
    cookieStore.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    console.log("Login successful, cookie set");

    // Return admin data (without password)
    const { password_hash, ...adminData } = admin;

    return NextResponse.json({
      success: true,
      admin: adminData,
    });
  } catch (error: any) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi đăng nhập" },
      { status: 500 }
    );
  }
}
