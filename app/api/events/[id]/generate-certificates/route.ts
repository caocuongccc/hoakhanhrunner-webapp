// =====================================================
// API Generate Certificates với Template System
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient();
    const eventId = params.id;

    // 1. Lấy template_id từ request (hoặc dùng default)
    const body = await request.json().catch(() => ({}));
    const templateId = body.template_id;

    // 2. Load certificate template
    let template;
    if (templateId) {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .eq("id", templateId)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { success: false, error: "Template not found" },
          { status: 404 }
        );
      }
      template = data;
    } else {
      // Lấy template active đầu tiên
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { success: false, error: "No active template found" },
          { status: 404 }
        );
      }
      template = data;
    }

    // 3. Load event data
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // 4. Load participants với stats
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const totalDays =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    const { data: participantsData } = await supabase
      .from("event_participants")
      .select(
        `
        user_id,
        total_km,
        users!event_participants_user_id_fkey(username, full_name, email)
      `
      )
      .eq("event_id", eventId);

    if (!participantsData || participantsData.length === 0) {
      return NextResponse.json(
        { success: false, error: "No participants found" },
        { status: 404 }
      );
    }

    // 5. Tính stats cho từng participant
    const participantsWithStats = await Promise.all(
      participantsData.map(async (p) => {
        const { data: activities } = await supabase
          .from("activities")
          .select("activity_date, pace_min_per_km")
          .eq("event_id", eventId)
          .eq("user_id", p.user_id)
          .gt("points_earned", 0);

        const activeDays = new Set(
          activities?.map((a) => a.activity_date) || []
        ).size;

        const avgPace =
          activities && activities.length > 0
            ? activities.reduce((sum, a) => sum + (a.pace_min_per_km || 0), 0) /
              activities.length
            : 0;

        const paceMinutes = Math.floor(avgPace);
        const paceSeconds = Math.round((avgPace - paceMinutes) * 60);

        return {
          user_id: p.user_id,
          username: p.users.username,
          full_name: p.users.full_name,
          email: p.users.email,
          active_days: activeDays,
          total_days: totalDays,
          total_distance: p.total_km || 0,
          average_pace: `${paceMinutes}:${paceSeconds.toString().padStart(2, "0")}`,
        };
      })
    );

    // 6. Download PDF template
    const pdfBytes = await fetch(template.pdf_url).then((res) =>
      res.arrayBuffer()
    );

    // 7. Generate certificates cho tất cả participants
    const zip = new JSZip();

    for (const participant of participantsWithStats) {
      // Load template PDF
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const page = pdfDoc.getPages()[0];
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Data mapping
      const dataMap: Record<string, string> = {
        athleteName: participant.full_name || participant.username,
        eventName: event.name,
        activeDays: participant.active_days.toString(),
        totalDays: participant.total_days.toString(),
        totalDistance: participant.total_distance.toFixed(1),
        averagePace: participant.average_pace,
        completionDate: new Date(event.end_date).toLocaleDateString("vi-VN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };

      // Vẽ text lên PDF theo config
      const fieldsConfig = template.fields_config as any[];

      for (const field of fieldsConfig) {
        const value = dataMap[field.type] || field.placeholder;
        const selectedFont = field.fontWeight === "bold" ? font : normalFont;

        // Convert color hex to RGB
        const hexColor = field.fontColor || "#000000";
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;

        // Tính position (PDF coordinates from bottom-left)
        const pageHeight = page.getHeight();
        const yPosition = pageHeight - field.y - field.height;

        let xPosition = field.x;
        if (field.textAlign === "center") {
          const textWidth = selectedFont.widthOfTextAtSize(
            value,
            field.fontSize
          );
          xPosition = field.x + (field.width - textWidth) / 2;
        } else if (field.textAlign === "right") {
          const textWidth = selectedFont.widthOfTextAtSize(
            value,
            field.fontSize
          );
          xPosition = field.x + field.width - textWidth;
        }

        page.drawText(value, {
          x: xPosition,
          y: yPosition + field.height / 2 - field.fontSize / 2,
          size: field.fontSize,
          font: selectedFont,
          color: rgb(r, g, b),
        });
      }

      // Save PDF
      const modifiedPdfBytes = await pdfDoc.save();

      // Add to ZIP
      const filename = `certificate_${participant.username}_${event.name.replace(/\s+/g, "_")}.pdf`;
      zip.file(filename, modifiedPdfBytes);
    }

    // 8. Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: "nodebuffer" });

    // 9. Return ZIP
    return new NextResponse(zipBlob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="certificates_${event.name.replace(/\s+/g, "_")}.zip"`,
      },
    });
  } catch (error: any) {
    console.error("Generate certificates error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
