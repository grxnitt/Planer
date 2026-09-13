import { NextRequest, NextResponse } from "next/server";
import { fetchUpcomingSpbuLessons } from "@/lib/spbu-schedule";
import { saveSpbuLessons } from "@/lib/schedule-store";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const lessons = await fetchUpcomingSpbuLessons();
    return NextResponse.json(await saveSpbuLessons(lessons));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync timetable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
