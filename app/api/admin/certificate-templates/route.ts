// =====================================================
// FILE: app/api/admin/certificate-templates/route.ts
// API routes for managing certificate templates
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

/**
 * GET - List all certificate templates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const activeOnly = searchParams.get("active") === "true";

    let query = supabase
      .from("certificate_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching templates:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      templates: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error("GET templates error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new certificate template
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const cookieStore = cookies();
    const adminToken = cookieStore.get("admin_token")?.value;

    if (!adminToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get admin session
    const { data: session } = await supabase
      .from("admin_sessions")
      .select("admin_id, admins!inner(*)")
      .eq("token", adminToken)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, pdf_url, fields_config, thumbnail_url } = body;

    // Validation
    if (!name || !pdf_url || !fields_config) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!Array.isArray(fields_config)) {
      return NextResponse.json(
        { success: false, error: "fields_config must be an array" },
        { status: 400 }
      );
    }

    // Create template
    const { data, error } = await supabase
      .from("certificate_templates")
      .insert([
        {
          name,
          description: description || null,
          pdf_url,
          thumbnail_url: thumbnail_url || null,
          fields_config,
          is_active: true,
          created_by: session.admins.email,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating template:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template: data,
      message: "Template created successfully",
    });
  } catch (error: any) {
    console.error("POST template error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
