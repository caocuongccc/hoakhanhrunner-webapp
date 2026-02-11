// app/api/events/[id]/export/route.ts
// FIXED: Excel export with proper Unicode handling

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

type ExportFormat = "csv" | "json" | "xlsx";
type ExportType = "endurance" | "consistency" | "penalties" | "all";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const params = await context.params;
    const eventId = params.id;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get("format") || "csv") as ExportFormat;
    const type = (searchParams.get("type") || "all") as ExportType;

    console.log(`Exporting event ${eventId} data as ${format}, type: ${type}`);

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, start_date, end_date")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch participants
    const { data: participants, error: participantsError } = await supabase
      .from("event_participants")
      .select("user_id, total_km, total_points, activity_count")
      .eq("event_id", eventId)
      .order("total_km", { ascending: false });

    if (participantsError || !participants || participants.length === 0) {
      return NextResponse.json(
        { error: "No participants found" },
        { status: 404 },
      );
    }

    const userIds = participants.map((p) => p.user_id);

    // Fetch user details
    const { data: users } = await supabase
      .from("users")
      .select("id, username, email, avatar_url, full_name")
      .in("id", userIds);

    const userMap = (users || []).reduce(
      (acc, user) => {
        acc[user.id] = {
          username:
            user.username ||
            user.full_name ||
            user.email?.split("@")[0] ||
            `User ${user.id.slice(0, 8)}`,
          email: user.email,
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    userIds.forEach((id) => {
      if (!userMap[id]) {
        userMap[id] = { username: `User ${id.slice(0, 8)}`, email: null };
      }
    });

    // Fetch streaks
    const { data: streaks } = await supabase
      .from("user_streaks")
      .select("user_id, longest_streak, current_streak")
      .eq("event_id", eventId);

    const streakMap = (streaks || []).reduce(
      (acc, s) => {
        acc[s.user_id] = {
          longest: s.longest_streak || 0,
          current: s.current_streak || 0,
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    // Fetch penalties
    const { data: penalties } = await supabase
      .from("event_penalties")
      .select(
        "user_id, total_days, active_days, missed_days, penalty_amount, is_paid",
      )
      .eq("event_id", eventId);

    const penaltyMap = (penalties || []).reduce(
      (acc, p) => {
        acc[p.user_id] = p;
        return acc;
      },
      {} as Record<string, any>,
    );

    // Build combined data
    const combinedData = participants.map((p, index) => {
      const userInfo = userMap[p.user_id];
      const streak = streakMap[p.user_id] || { longest: 0, current: 0 };
      const penalty = penaltyMap[p.user_id] || {
        total_days: 0,
        active_days: 0,
        missed_days: 0,
        penalty_amount: 0,
        is_paid: false,
      };

      return {
        rank_endurance: index + 1,
        user_name: userInfo.username,
        user_email: userInfo.email,
        total_km: p.total_km || 0,
        total_points: p.total_points || 0,
        activity_count: p.activity_count || 0,
        longest_streak: streak.longest,
        current_streak: streak.current,
        total_days: penalty.total_days,
        active_days: penalty.active_days,
        missed_days: penalty.missed_days,
        penalty_amount: penalty.penalty_amount,
        is_paid: penalty.is_paid ? "Có" : "Không",
      };
    });

    // Prepare data based on type
    let exportData: any[] = [];
    let filename = `${event.name.replace(/\s+/g, "_")}_`;

    switch (type) {
      case "endurance":
        exportData = combinedData.map((d) => ({
          Hạng: d.rank_endurance,
          Tên: d.user_name,
          Email: d.user_email,
          "Tổng KM": d.total_km,
          Điểm: d.total_points,
          "Hoạt động": d.activity_count,
        }));
        filename += "Bang_Suc_Ben";
        break;

      case "consistency":
        const consistencyData = [...combinedData]
          .sort((a, b) => b.longest_streak - a.longest_streak)
          .filter((d) => d.longest_streak > 0)
          .map((d, index) => ({
            Hạng: index + 1,
            Tên: d.user_name,
            Email: d.user_email,
            "Streak dài nhất": d.longest_streak,
            "Streak hiện tại": d.current_streak,
            "Ngày hoạt động": d.active_days,
          }));
        exportData = consistencyData;
        filename += "Bang_Sieu_Nang";
        break;

      case "penalties":
        const penaltiesData = [...combinedData]
          .sort((a, b) => b.penalty_amount - a.penalty_amount)
          .map((d) => ({
            Tên: d.user_name,
            Email: d.user_email,
            "Tổng ngày": d.total_days,
            "Đã chạy": d.active_days,
            Nghỉ: d.missed_days,
            "Phạt (VND)": d.penalty_amount,
            "Đã đóng": d.is_paid,
          }));
        exportData = penaltiesData;
        filename += "Phat_Tien";
        break;

      case "all":
      default:
        exportData = combinedData.map((d) => ({
          Hạng: d.rank_endurance,
          Tên: d.user_name,
          Email: d.user_email,
          "Tổng KM": d.total_km,
          Điểm: d.total_points,
          "Hoạt động": d.activity_count,
          "Streak dài nhất": d.longest_streak,
          "Streak hiện tại": d.current_streak,
          "Ngày hoạt động": d.active_days,
          Nghỉ: d.missed_days,
          "Phạt (VND)": d.penalty_amount,
          "Đã đóng": d.is_paid,
        }));
        filename += "Du_Lieu_Day_Du";
        break;
    }

    // JSON format
    if (format === "json") {
      return NextResponse.json({
        event: {
          name: event.name,
          startDate: event.start_date,
          endDate: event.end_date,
        },
        data: exportData,
        exportedAt: new Date().toISOString(),
      });
    }

    if (exportData.length === 0) {
      return NextResponse.json({ error: "No data to export" }, { status: 404 });
    }

    // =====================================================
    // EXCEL FORMAT - FIXED FOR UNICODE
    // =====================================================
    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Du lieu");

      // Add headers
      const headers = Object.keys(exportData[0]);
      worksheet.columns = headers.map((header) => ({
        header,
        key: header,
        width: 20,
      }));

      // Add rows
      exportData.forEach((row) => {
        worksheet.addRow(row);
      });

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };

      // Auto filter
      worksheet.autoFilter = {
        from: "A1",
        to: String.fromCharCode(65 + headers.length - 1) + "1",
      };

      // Freeze first row
      worksheet.views = [{ state: "frozen", ySplit: 1 }];

      // ✅ FIX: Convert buffer to Blob properly
      const buffer = await workbook.xlsx.writeBuffer();

      // Convert Buffer to Uint8Array for Response
      const uint8Array = new Uint8Array(buffer);

      console.log("Generated Excel buffer, size:", uint8Array.byteLength);

      // ✅ Use Response instead of NextResponse for binary data
      return new Response(uint8Array, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
          "Content-Length": uint8Array.byteLength.toString(),
        },
      });
    }

    // =====================================================
    // CSV FORMAT
    // =====================================================
    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(","), // Header row
      ...exportData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? "";
          })
          .join(","),
      ),
    ];

    const csv = csvRows.join("\n");

    // Add BOM for Excel to recognize UTF-8 CSV
    const csvWithBOM = "\uFEFF" + csv;

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Error in export:", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
