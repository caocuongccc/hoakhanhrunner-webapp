// =====================================================
// FILE: app/api/upload/route.ts - FIXED VERSION WITH PUBLIC ACCESS
// =====================================================
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "running-club";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine resource type
    const isPdf = file.type === "application/pdf";

    // Upload to Cloudinary with PUBLIC access
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: folder,
            resource_type: isPdf ? "raw" : "auto", // Use "raw" for PDFs
            type: "upload", // IMPORTANT: Set type to "upload" for public access
            access_mode: "public", // IMPORTANT: Make it publicly accessible
            // For images, add transformation
            transformation: isPdf
              ? undefined
              : [
                  {
                    width: 1200,
                    height: 1200,
                    crop: "limit",
                    quality: "auto:good",
                  },
                ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    console.log("✅ Uploaded to Cloudinary:", result.secure_url);

    return NextResponse.json({
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      resource_type: result.resource_type,
      format: result.format,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { public_id, resource_type } = await request.json();

    if (!public_id) {
      return NextResponse.json(
        { error: "No public_id provided" },
        { status: 400 }
      );
    }

    // Delete with correct resource_type
    await cloudinary.uploader.destroy(public_id, {
      resource_type: resource_type || "image",
      type: "upload",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: error.message || "Delete failed" },
      { status: 500 }
    );
  }
}

// =====================================================
// HELPER: Verify Cloudinary URL is accessible
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // Try to fetch the URL
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        {
          accessible: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      accessible: true,
      contentType: response.headers.get("content-type"),
      size: response.headers.get("content-length"),
    });
  } catch (error: any) {
    return NextResponse.json(
      { accessible: false, error: error.message },
      { status: 200 }
    );
  }
}
