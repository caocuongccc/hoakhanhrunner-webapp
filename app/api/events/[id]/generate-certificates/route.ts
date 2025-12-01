// app/api/events/[id]/generate-certificates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import puppeteer from "puppeteer";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

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
 * Generate certificate HTML with data
 */
function generateCertificateHTML(data: CertificateData): string {
  // Read the certificate template from your file
  // For now, using inline template
  const template = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Roboto:wght@300;400;500;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Roboto', sans-serif; background: #f5f5f5; }
        .certificate { width: 1000px; height: 707px; margin: 0 auto; background: white; position: relative; }
        .certificate-border {
            position: absolute; top: 20px; left: 20px; right: 20px; bottom: 20px;
            border: 3px solid #2563eb;
            background: linear-gradient(135deg, #f8faff 0%, #ffffff 100%);
        }
        .certificate-border::before {
            content: ''; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px;
            border: 1px solid #93c5fd;
        }
        .header { text-align: center; padding: 40px 60px 20px; position: relative; }
        .logo {
            width: 80px; height: 80px; margin: 0 auto 15px;
            background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 36px; font-weight: bold;
        }
        .certificate-title {
            font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 700;
            color: #1e3a8a; letter-spacing: 2px; margin-bottom: 5px;
        }
        .certificate-subtitle { font-size: 28px; font-weight: 700; color: #2563eb; margin-bottom: 20px; }
        .presented-to { text-align: center; padding: 20px 60px; }
        .presented-text { font-size: 16px; color: #64748b; margin-bottom: 10px; font-style: italic; }
        .athlete-name {
            font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 700;
            color: #1e293b; margin: 15px 0 20px; padding-bottom: 10px;
            border-bottom: 2px solid #2563eb; display: inline-block; min-width: 400px;
        }
        .event-name { font-size: 18px; color: #64748b; margin-top: 15px; }
        .event-name strong { color: #1e293b; font-weight: 600; }
        .completion-text { font-size: 16px; color: #64748b; margin: 10px 0; font-style: italic; }
        .stats-section {
            display: flex; justify-content: center; gap: 40px;
            padding: 30px 60px; margin: 20px 0;
        }
        .stat-card {
            text-align: center; padding: 20px 30px;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-radius: 12px; border: 2px solid #bfdbfe; min-width: 200px;
        }
        .stat-label {
            font-size: 14px; color: #64748b; text-transform: uppercase;
            letter-spacing: 1px; margin-bottom: 8px; font-weight: 500;
        }
        .stat-value { font-size: 32px; font-weight: 700; color: #2563eb; line-height: 1; }
        .stat-unit { font-size: 16px; color: #64748b; margin-top: 5px; }
        .additional-info { text-align: center; padding: 20px 60px; font-size: 14px; color: #64748b; }
        .date-completed { font-weight: 500; color: #1e293b; }
        .footer {
            position: absolute; bottom: 40px; left: 60px; right: 60px;
            display: flex; justify-content: space-between; align-items: flex-end;
        }
        .signature-section { text-align: center; }
        .signature-line { width: 250px; border-top: 2px solid #2563eb; margin-bottom: 8px; }
        .signature-name { font-family: 'Playfair Display', serif; font-size: 18px; color: #2563eb; font-style: italic; }
        .signature-title { font-size: 12px; color: #64748b; margin-top: 4px; }
        .certificate-seal {
            width: 100px; height: 100px; border-radius: 50%;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            border: 5px solid #bfdbfe; display: flex; align-items: center;
            justify-content: center; flex-direction: column; color: white; font-weight: bold;
        }
        .seal-text { font-size: 11px; text-align: center; line-height: 1.3; }
        .seal-year { font-size: 18px; margin-top: 2px; }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="certificate-border">
            <div class="header">
                <div class="logo">RC</div>
                <div class="certificate-title">CERTIFICATE OF COMPLETION</div>
                <div class="certificate-subtitle">GIẤY CHỨNG NHẬN</div>
            </div>
            
            <div class="presented-to">
                <div class="presented-text">This Certificate is Presented to / Trao tặng</div>
                <div class="athlete-name">${data.athleteName}</div>
                <div class="event-name">Event / Giải: <strong>${data.eventName}</strong></div>
                <div class="completion-text">has successfully completed / đã hoàn thành</div>
            </div>
            
            <div class="stats-section">
                <div class="stat-card">
                    <div class="stat-label">Active Days</div>
                    <div class="stat-value">${data.activeDays}</div>
                    <div class="stat-unit">Số ngày chạy: ${data.activeDays}/${data.totalDays}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">Distance</div>
                    <div class="stat-value">${data.totalDistance.toFixed(1)} KM</div>
                    <div class="stat-unit">Thành tích: ${data.totalDistance.toFixed(1)} KM</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">Pace</div>
                    <div class="stat-value">${data.averagePace}</div>
                    <div class="stat-unit">Pace: ${data.averagePace} min/km</div>
                </div>
            </div>
            
            <div class="additional-info">
                <div class="date-completed">
                    Completed on / Hoàn thành ngày: <strong>${data.completionDate}</strong>
                </div>
            </div>
            
            <div class="footer">
                <div class="signature-section">
                    <div class="signature-line"></div>
                    <div class="signature-name">Running Club</div>
                    <div class="signature-title">Event Organizer</div>
                </div>
                
                <div class="certificate-seal">
                    <div class="seal-text">RUNNING<br>CLUB</div>
                    <div class="seal-year">2025</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `;

  return template;
}

/**
 * Generate PDF from HTML using Puppeteer
 */
async function generatePDF(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      width: "1000px",
      height: "707px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * POST - Generate certificates for all participants of an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Only generate for individual events that have ended
    if (event.event_type !== "individual") {
      return NextResponse.json(
        { error: "Certificates only for individual events" },
        { status: 400 }
      );
    }

    const today = new Date();
    const eventEnd = new Date(event.end_date);

    if (eventEnd > today) {
      return NextResponse.json(
        { error: "Event has not ended yet" },
        { status: 400 }
      );
    }

    // Get all participants with their activities
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

    const certificates = [];

    // Calculate event duration in days
    const eventStart = new Date(event.start_date);
    const totalDays = Math.ceil(
      (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (const participant of participants) {
      // Get user's activities for this event
      const { data: activities } = await supabase
        .from("activities")
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", participant.user_id)
        .order("activity_date", { ascending: false });

      if (!activities || activities.length === 0) continue;

      // Calculate statistics
      const activeDays = new Set(activities.map((a) => a.activity_date)).size;
      const totalDistance = activities.reduce(
        (sum, a) => sum + (a.distance_km || 0),
        0
      );
      const averagePace =
        activities.reduce((sum, a) => sum + (a.pace_min_per_km || 0), 0) /
        activities.length;

      const certificateData: CertificateData = {
        athleteName: participant.users.full_name || participant.users.username,
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

      // Generate HTML and PDF
      const html = generateCertificateHTML(certificateData);
      const pdfBuffer = await generatePDF(html);

      // TODO: Send email with PDF attachment
      // You can use Resend, SendGrid, or other email services here

      certificates.push({
        userId: participant.user_id,
        userName: certificateData.athleteName,
        email: certificateData.email,
        stats: {
          activeDays,
          totalDays,
          totalDistance: totalDistance.toFixed(1),
          averagePace: certificateData.averagePace,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${certificates.length} certificates`,
      data: certificates,
    });
  } catch (error: any) {
    console.error("Certificate generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate certificates" },
      { status: 500 }
    );
  }
}
