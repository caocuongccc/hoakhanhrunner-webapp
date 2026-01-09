// app/api/users/[userId]/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createSupabaseClient();

    await supabase.from("post_comments").upsert([
      {
        author_name: body.author_name,
        content: body.content,
        year: body.year,
      },
    ]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("User stats API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
