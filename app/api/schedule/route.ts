import { NextResponse } from "next/server";
import { upcomingSpbuLessons } from "@/lib/schedule-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await upcomingSpbuLessons(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load timetable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
