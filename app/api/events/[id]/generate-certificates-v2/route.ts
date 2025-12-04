// =====================================================
// FILE: app/api/events/[id]/generate-certificates-v2/route.ts
// Generate certificates using PDF templates with pdf-lib
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import JSZip from "jszip";

type CertificateData = {
  athleteName: string;
  eventName: string;
  activeDays: number;
  totalDays: number;
  totalDistance: number;
  averagePace: string;
  completionDate: string;
  email?: string;
};

/**
 * Convert hex color to RGB values for pdf-lib
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 }; // Default to black
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

/**
 * Fill PDF template with data using pdf-lib
 */
async function fillPdfTemplate(
  templatePdfBytes: ArrayBuffer,
  data: CertificateData,
  fieldsConfig: any[]
): Promise<Uint8Array> {
  try {
    // Load PDF
    const pdfDoc = await PDFDocument.load(templatePdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { height } = firstPage.getSize();

    // Embed fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    );

    // Map data
    const dataMap: { [key: string]: string } = {
      athleteName: data.athleteName,
      eventName: data.eventName,
      activeDays: data.activeDays.toString(),
      totalDays: data.totalDays.toString(),
      totalDistance: data.totalDistance.toFixed(1),
      averagePace: data.averagePace,
      completionDate: data.completionDate,
    };

    // Draw each field
    for (const field of fieldsConfig) {
      const text = dataMap[field.type] || "";
      if (!text) continue;

      const font =
        field.fontWeight === "bold" ? helveticaBoldFont : helveticaFont;
      const color = hexToRgb(field.fontColor || "#000000");

      // Calculate text width for alignment
      const textWidth = font.widthOfTextAtSize(text, field.fontSize);
      let x = field.x;

      // Adjust x based on alignment
      if (field.textAlign === "center") {
        x = field.x + (field.width - textWidth) / 2;
      } else if (field.textAlign === "right") {
        x = field.x + field.width - textWidth;
      }

      // Draw text (PDF coordinates start from bottom-left)
      firstPage.drawText(text, {
        x: x,
        y: height - field.y - field.height / 2, // Convert from top-left to bottom-left
        size: field.fontSize,
        font: font,
        color: rgb(color.r, color.g, color.b),
      });
    }

    // Save PDF
    return await pdfDoc.save();
  } catch (error) {
    console.error("Error filling PDF template:", error);
    throw new Error("Failed to fill PDF template");
  }
}

/**
 * POST - Generate certificates using template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const body = await request.json();
    const { templateId } = body;

    // Validate template ID
    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("id", templateId)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found or inactive" },
        { status: 404 }
      );
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Only individual events
    if (event.event_type !== "individual") {
      return NextResponse.json(
        { error: "Certificates only for individual events" },
        { status: 400 }
      );
    }

    // Check if event has ended
    const now = new Date();
    const eventEnd = new Date(event.end_date);

    if (eventEnd >= now) {
      return NextResponse.json(
        { error: "Event has not ended yet" },
        { status: 400 }
      );
    }

    // Get participants
    const { data: participants, error: partsError } = await supabase
      .from("event_participants")
      .select(
        `
        *,
        users(id, username, full_name, email)
      `
      )
      .eq("event_id", eventId);

    if (partsError || !participants) {
      return NextResponse.json(
        { error: "Failed to load participants" },
        { status: 500 }
      );
    }

    // Calculate event duration
    const eventStart = new Date(event.start_date);
    const totalDays =
      Math.ceil(
        (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    // Download PDF template
    console.log("Downloading PDF template from:", template.pdf_url);
    const templateResponse = await fetch(template.pdf_url);
    if (!templateResponse.ok) {
      throw new Error("Failed to download PDF template");
    }
    const templateBytes = await templateResponse.arrayBuffer();

    // Create ZIP
    const zip = new JSZip();
    let count = 0;

    console.log(`Processing ${participants.length} participants...`);

    for (const participant of participants) {
      try {
        // Get activities
        const { data: activities } = await supabase
          .from("activities")
          .select("*")
          .eq("event_id", eventId)
          .eq("user_id", participant.user_id)
          .gt("points_earned", 0)
          .order("activity_date", { ascending: false });

        if (!activities || activities.length === 0) {
          console.log(`Skipping ${participant.users.username} - no activities`);
          continue;
        }

        // Calculate stats
        const activeDays = new Set(activities.map((a) => a.activity_date)).size;
        const totalDistance = activities.reduce(
          (sum, a) => sum + (a.distance_km || 0),
          0
        );
        const averagePace =
          activities.reduce((sum, a) => sum + (a.pace_min_per_km || 0), 0) /
          activities.length;

        const certificateData: CertificateData = {
          athleteName:
            participant.users.full_name || participant.users.username,
          eventName: event.name,
          activeDays,
          totalDays,
          totalDistance,
          averagePace: `${Math.floor(averagePace)}'${Math.round(
            (averagePace % 1) * 60
          )
            .toString()
            .padStart(2, "0")}"`,
          completionDate: format(eventEnd, "MMMM dd, yyyy", { locale: vi }),
          email: participant.users.email,
        };

        // Fill PDF template
        console.log(
          `Generating certificate for ${participant.users.username}...`
        );
        const pdfBytes = await fillPdfTemplate(
          templateBytes,
          certificateData,
          template.fields_config
        );

        // Add to ZIP with safe filename
        const safeFilename = participant.users.username
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase();
        zip.file(`certificate_${safeFilename}.pdf`, pdfBytes);

        count++;
        console.log(`✓ Generated certificate ${count}/${participants.length}`);
      } catch (error) {
        console.error(
          `Error generating certificate for ${participant.users.username}:`,
          error
        );
        // Continue with next participant
      }
    }

    if (count === 0) {
      return NextResponse.json(
        { error: "No valid participants to generate certificates" },
        { status: 400 }
      );
    }

    console.log(`Generating ZIP file with ${count} certificates...`);

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    console.log("✓ ZIP file generated successfully");

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="certificates_${event.name.replace(/[^a-z0-9]/gi, "_")}.zip"`,
      },
    });
  } catch (error: any) {
    console.error("Certificate generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate certificates" },
      { status: 500 }
    );
  }
}

// =====================================================
// HELPER: Preview single certificate (optional)
// FILE: app/api/admin/certificate-preview/route.ts
// =====================================================

export async function POST_PREVIEW(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, sampleData } = body;

    if (!templateId || !sampleData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Download PDF template
    const templateResponse = await fetch(template.pdf_url);
    if (!templateResponse.ok) {
      throw new Error("Failed to download PDF template");
    }
    const templateBytes = await templateResponse.arrayBuffer();

    // Fill PDF with sample data
    const pdfBytes = await fillPdfTemplate(
      templateBytes,
      sampleData,
      template.fields_config
    );

    // Return PDF
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=preview.pdf",
      },
    });
  } catch (error: any) {
    console.error("Preview error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
