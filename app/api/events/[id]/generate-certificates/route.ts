// =====================================================
// FILE 3: app/api/events/[id]/generate-certificates/route.ts - FIXED
// =====================================================
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient();
    const eventId = params.id;

    // 1. Get template_id from request body
    const body = await request.json();
    const { template_id } = body;

    if (!template_id) {
      return NextResponse.json(
        { error: "template_id is required" },
        { status: 400 }
      );
    }

    // 2. Load template from database
    const { data: template, error: templateError } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("id", template_id)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found or inactive" },
        { status: 404 }
      );
    }

    console.log("Using template:", template.name);

    // 3. Load event data
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

    // 4. Calculate event duration
    const startDate = new Date(event.start_date);
    const totalDays =
      Math.ceil(
        (eventEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    // 5. Load participants
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
        { error: "No participants found" },
        { status: 404 }
      );
    }

    // 6. Calculate stats for each participant
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

    // 7. Download PDF template
    console.log("Downloading PDF template from:", template.pdf_url);
    const templateResponse = await fetch(template.pdf_url);
    if (!templateResponse.ok) {
      throw new Error("Failed to download PDF template");
    }
    const templateBytes = await templateResponse.arrayBuffer();

    // 8. Generate certificates for all participants
    const zip = new JSZip();
    let count = 0;

    console.log(`Processing ${participantsWithStats.length} participants...`);

    for (const participant of participantsWithStats) {
      try {
        // Load PDF template
        const pdfDoc = await PDFDocument.load(templateBytes);
        const page = pdfDoc.getPages()[0];
        const { height } = page.getSize();

        // Load fonts
        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(
          StandardFonts.HelveticaBold
        );

        // Data mapping
        const dataMap: Record<string, string> = {
          athleteName: participant.full_name || participant.username,
          eventName: event.name,
          activeDays: participant.active_days.toString(),
          totalDays: participant.total_days.toString(),
          totalDistance: participant.total_distance.toFixed(1),
          averagePace: participant.average_pace,
          completionDate: format(eventEnd, "MMMM dd, yyyy", { locale: vi }),
        };

        // Draw fields according to template config
        const fieldsConfig = template.fields_config as any[];

        for (const field of fieldsConfig) {
          const value = dataMap[field.type] || field.placeholder || "";
          const selectedFont =
            field.fontWeight === "bold" ? helveticaBold : helvetica;

          // Convert hex color to RGB
          const hexColor = field.fontColor || "#000000";
          const r = parseInt(hexColor.slice(1, 3), 16) / 255;
          const g = parseInt(hexColor.slice(3, 5), 16) / 255;
          const b = parseInt(hexColor.slice(5, 7), 16) / 255;

          // Calculate x position based on alignment
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

          // Draw text (convert Y from top-left to bottom-left coordinate system)
          page.drawText(value, {
            x: xPosition,
            y: height - field.y - field.fontSize,
            size: field.fontSize,
            font: selectedFont,
            color: rgb(r, g, b),
          });
        }

        // Save PDF
        const modifiedPdfBytes = await pdfDoc.save();

        // Add to ZIP with safe filename
        const safeFilename = participant.username
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase();
        zip.file(
          `certificate_${safeFilename}_${event.name.replace(/\s+/g, "_")}.pdf`,
          modifiedPdfBytes
        );

        count++;
        console.log(
          `✓ Generated certificate ${count}/${participantsWithStats.length}`
        );
      } catch (error) {
        console.error(
          `Error generating certificate for ${participant.username}:`,
          error
        );
        // Continue with next participant
      }
    }

    if (count === 0) {
      return NextResponse.json(
        { error: "No certificates were generated" },
        { status: 500 }
      );
    }

    console.log(`Generating ZIP file with ${count} certificates...`);

    // 9. Generate ZIP
    const zipBlob = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    console.log("✓ ZIP file generated successfully");

    // 10. Return ZIP file
    return new NextResponse(zipBlob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="certificates_${event.name.replace(/\s+/g, "_")}.zip"`,
      },
    });
  } catch (error: any) {
    console.error("Generate certificates error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate certificates" },
      { status: 500 }
    );
  }
}
