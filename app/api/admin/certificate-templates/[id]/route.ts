// app/api/admin/certificate-templates/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

/**
 * GET - Get single template by ID
 */
export async function GET(
  request: NextRequest,
  // { params }: { params: { id: string } }
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await context.params).id;

    const { data, error } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "Template not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      template: data,
    });
  } catch (error: any) {
    console.error("GET template error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update existing template
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await context.params).id;

    // Check admin authentication
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_token")?.value;

    if (!adminToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      pdf_url,
      fields_config,
      thumbnail_url,
      is_active,
    } = body;

    // Build update object
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (pdf_url !== undefined) updates.pdf_url = pdf_url;
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url;
    if (fields_config !== undefined) {
      if (!Array.isArray(fields_config)) {
        return NextResponse.json(
          { success: false, error: "fields_config must be an array" },
          { status: 400 }
        );
      }
      updates.fields_config = fields_config;
    }
    if (is_active !== undefined) updates.is_active = is_active;

    // Update template
    const { data, error } = await supabase
      .from("certificate_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating template:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template: data,
      message: "Template updated successfully",
    });
  } catch (error: any) {
    console.error("PUT template error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete template (soft delete by setting is_active = false)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await context.params).id;

    // Check admin authentication
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_token")?.value;

    if (!adminToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if template is being used
    const { searchParams } = request.nextUrl;
    const hardDelete = searchParams.get("hard") === "true";

    if (hardDelete) {
      // Hard delete - completely remove from database
      const { error } = await supabase
        .from("certificate_templates")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting template:", error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    } else {
      // Soft delete - just mark as inactive
      const { error } = await supabase
        .from("certificate_templates")
        .update({ is_active: false })
        .eq("id", id);

      if (error) {
        console.error("Error deactivating template:", error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: hardDelete
        ? "Template deleted permanently"
        : "Template deactivated",
    });
  } catch (error: any) {
    console.error("DELETE template error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
