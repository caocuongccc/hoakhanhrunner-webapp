// app/api/events/[id]/generate-certificates/route.ts - FINAL FIXED VERSION
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

    const body = await request.json();
    const { template_id } = body;

    if (!template_id) {
      return NextResponse.json(
        { error: "template_id is required" },
        { status: 400 }
      );
    }

    // Load template
    const { data: template, error: templateError } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("id", template_id)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Load event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.event_type !== "individual") {
      return NextResponse.json(
        { error: "Certificates only for individual events" },
        { status: 400 }
      );
    }

    const now = new Date();
    const eventEnd = new Date(event.end_date);

    if (eventEnd >= now) {
      return NextResponse.json(
        { error: "Event has not ended yet" },
        { status: 400 }
      );
    }

    const startDate = new Date(event.start_date);
    const totalDays =
      Math.ceil(
        (eventEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    // Load participants
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

    // Calculate stats WITH RANKING
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

    // Sort by distance to get ranking
    const sortedParticipants = [...participantsWithStats].sort(
      (a, b) => b.total_distance - a.total_distance
    );

    // Add ranking to each participant
    const participantsWithRanking = participantsWithStats.map((p) => ({
      ...p,
      ranking:
        sortedParticipants.findIndex((sp) => sp.user_id === p.user_id) + 1,
    }));

    // Download PDF template
    console.log("📥 Downloading PDF template from:", template.pdf_url);
    const templateResponse = await fetch(template.pdf_url);
    if (!templateResponse.ok) {
      throw new Error("Failed to download PDF template");
    }
    const templateBytes = await templateResponse.arrayBuffer();

    // Generate certificates
    const zip = new JSZip();
    let count = 0;

    console.log(
      `📋 Processing ${participantsWithRanking.length} participants...`
    );

    for (const participant of participantsWithRanking) {
      try {
        // Load PDF template for each participant
        const pdfDoc = await PDFDocument.load(templateBytes);
        const page = pdfDoc.getPages()[0];
        const { height } = page.getSize();

        console.log(`📏 PDF page height: ${height}px`);

        // Load fonts
        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(
          StandardFonts.HelveticaBold
        );

        // 📊 COMPREHENSIVE DATA MAPPING - All possible fields
        const dataMap: Record<string, string> = {
          // Basic Info
          athleteName: participant.full_name || participant.username,
          eventName: event.name,

          // Stats (English)
          activeDays: participant.active_days.toString(),
          totalDays: participant.total_days.toString(),
          totalDistance: participant.total_distance.toFixed(1),
          averagePace: participant.average_pace,
          completionDate: format(eventEnd, "dd/MM/yyyy", { locale: vi }),
          ranking: participant.ranking.toString(),

          // Vietnamese field names (all possible variations)
          soBib: "", // BIB number (can be added if needed)
          soVong: participant.active_days.toString(), // Number of rounds
          tongKm: participant.total_distance.toFixed(1), // Total KM
          xepHang: participant.ranking.toString(), // Ranking
          xepHangChungCuoc: participant.ranking.toString(), // Final ranking

          // Alternative English names
          bibNumber: "",
          rounds: participant.active_days.toString(),
          totalKm: participant.total_distance.toFixed(1),
          rank: participant.ranking.toString(),
          finalRank: participant.ranking.toString(),
        };

        // 🔍 Helper function: Get value with case-insensitive matching
        const getValue = (fieldType: string): string => {
          // Try exact match first
          if (dataMap[fieldType]) return dataMap[fieldType];

          // Try case-insensitive match
          const lowerFieldType = fieldType.toLowerCase();
          for (const [key, value] of Object.entries(dataMap)) {
            if (key.toLowerCase() === lowerFieldType) {
              return value;
            }
          }

          // No match found, return empty
          return "";
        };

        // Draw fields
        const fieldsConfig = template.fields_config as any[];

        for (const field of fieldsConfig) {
          const value = getValue(field.type) || field.placeholder || "";

          // Skip empty fields
          if (!value) {
            console.log(`⚠️ Skipping empty field: ${field.type}`);
            continue;
          }

          const selectedFont =
            field.fontWeight === "bold" ? helveticaBold : helvetica;

          // Convert hex color to RGB
          const hexColor = field.fontColor || "#000000";
          const r = parseInt(hexColor.slice(1, 3), 16) / 255;
          const g = parseInt(hexColor.slice(3, 5), 16) / 255;
          const b = parseInt(hexColor.slice(5, 7), 16) / 255;

          // Calculate x position based on alignment
          let xPosition = field.x;
          const textWidth = selectedFont.widthOfTextAtSize(
            value,
            field.fontSize
          );

          if (field.textAlign === "center") {
            xPosition = field.x + (field.width - textWidth) / 2;
          } else if (field.textAlign === "right") {
            xPosition = field.x + field.width - textWidth;
          }
          console.log(
            `🎯 Field "${field.type}" alignment: ${field.textAlign}, X position: ${xPosition.toFixed(2)}`
          );
          // ✅ CRITICAL FIX: CHÍNH XÁC 100% Y COORDINATE
          //
          // Giải thích chi tiết:
          // 1. Editor coordinate: Y = 0 ở TOP, tăng xuống BOTTOM
          // 2. PDF coordinate: Y = 0 ở BOTTOM, tăng lên TOP
          // 3. field.y: khoảng cách từ TOP của page trong editor
          // 4. field.height: chiều cao của bounding box
          // 5. Text baseline: nằm ở khoảng 75% từ top của bounding box
          //
          // Công thức ĐÚNG:
          // pdfY = pageHeight - editorY - (field.height * 0.75)
          //
          // Tại sao 0.75?
          // - Text baseline thường nằm ở 3/4 chiều cao box từ top
          // - Điều này giúp text căn giữa theo chiều dọc trong box
          //
          // const yPosition = height - field.y - field.height * 0.75;
          //const yPosition = height - field.y - field.fontSize;
          const yPosition =
            height - field.y - field.height / 2 - field.fontSize * 0.35 + 40;

          console.log(`📍 Field "${field.type}" = "${value}":`, {
            editorX: field.x,
            editorY: field.y,
            fieldWidth: field.width,
            fieldHeight: field.height,
            fontSize: field.fontSize,
            textAlign: field.textAlign,
            calculatedPdfX: xPosition.toFixed(2),
            calculatedPdfY: yPosition.toFixed(2),
            pageHeight: height,
            adjustments: "Y+35px",
          });

          // Draw text
          page.drawText(value, {
            x: xPosition,
            y: yPosition,
            size: field.fontSize,
            font: selectedFont,
            color: rgb(r, g, b),
          });
        }

        // Save PDF
        const modifiedPdfBytes = await pdfDoc.save();

        // Add to ZIP
        const safeFilename = participant.username
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase();
        zip.file(
          `certificate_${safeFilename}_${event.name.replace(/\s+/g, "_")}.pdf`,
          modifiedPdfBytes
        );

        count++;
        console.log(
          `✅ Generated certificate ${count}/${participantsWithRanking.length} - ${participant.username} (Rank #${participant.ranking})`
        );
      } catch (error) {
        console.error(
          `❌ Error generating certificate for ${participant.username}:`,
          error
        );
      }
    }

    if (count === 0) {
      return NextResponse.json(
        { error: "No certificates were generated" },
        { status: 500 }
      );
    }

    console.log(`📦 Generating ZIP file with ${count} certificates...`);

    // Generate ZIP
    const zipBlob = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    console.log("✅ ZIP file generated successfully");

    // Return ZIP file
    return new NextResponse(zipBlob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="certificates_${event.name.replace(/\s+/g, "_")}.zip"`,
      },
    });
  } catch (error: any) {
    console.error("❌ Generate certificates error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate certificates" },
      { status: 500 }
    );
  }
}
