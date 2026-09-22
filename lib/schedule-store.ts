import postgres from "postgres";
import { isTrackedSpbuLesson, mondayUtc, type SpbuLesson } from "@/lib/spbu-schedule";

export type StoredLesson = SpbuLesson & { updatedAt: string };

function database() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  return postgres(connectionString, { max: 1, prepare: false, idle_timeout: 10, connect_timeout: 15 });
}

export async function saveSpbuLessons(lessons: SpbuLesson[]) {
  const sql = database();
  const now = new Date().toISOString();
  const windowStart = mondayUtc();
  const windowEnd = new Date(windowStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 42);
  const formatDate = (date: Date) => date.toISOString().slice(0, 10);
  try {
    // Keeps deployed projects compatible when this field is introduced after
    // the initial timetable table has already been created.
    await sql`alter table schedule_lessons add column if not exists subgroup text`;
    await sql.begin(async (transaction) => {
      // SPbU may move, cancel, or change a lesson.  Rebuild the current sync
      // window instead of only appending rows, otherwise old versions stay in
      // the planner alongside the new timetable.
      await transaction`
        delete from schedule_lessons
        where group_id = ${"460105"}
          and lesson_date >= ${formatDate(windowStart)}
          and lesson_date < ${formatDate(windowEnd)}
      `;
      for (const lesson of lessons) {
        await transaction`
          insert into schedule_lessons (
            external_id, group_id, lesson_date, start_time, end_time, title, location, educator, subgroup, source_url, last_seen_at, cancelled
          ) values (
            ${lesson.externalId}, ${"460105"}, ${lesson.date}, ${lesson.startTime}, ${lesson.endTime}, ${lesson.title}, ${lesson.location}, ${lesson.educator}, ${lesson.subgroup}, ${lesson.sourceUrl}, ${now}, false
          )
          on conflict (external_id) do update set
            lesson_date = excluded.lesson_date,
            start_time = excluded.start_time,
            end_time = excluded.end_time,
            title = excluded.title,
            location = excluded.location,
            educator = excluded.educator,
            subgroup = excluded.subgroup,
            source_url = excluded.source_url,
            last_seen_at = excluded.last_seen_at,
            cancelled = false,
            updated_at = now()
        `;
      }
    });
    return { synced: lessons.length, syncedAt: now };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function upcomingSpbuLessons(): Promise<{ lessons: StoredLesson[]; updatedAt: string | null }> {
  const sql = database();
  try {
    const lessons = await sql<StoredLesson[]>`
      select
        external_id as "externalId", lesson_date::text as date, start_time::text as "startTime", end_time::text as "endTime",
        title, location, educator, subgroup, source_url as "sourceUrl", updated_at::text as "updatedAt"
      from schedule_lessons
      where group_id = ${"460105"}
        and cancelled = false
        and lesson_date >= current_date - 1
        and lesson_date < current_date + 42
      order by lesson_date asc, start_time asc, updated_at desc
      limit 250
    `;
    const [last] = await sql<{ updatedAt: string | null }[]>`
      select max(updated_at)::text as "updatedAt" from schedule_lessons where group_id = ${"460105"}
    `;
    const unique = new Map<string, StoredLesson>();
    for (const lesson of lessons) {
      const key = [lesson.date, lesson.startTime, lesson.endTime || "", lesson.title, lesson.location || "", lesson.educator || "", lesson.subgroup || ""].join("|");
      if (!unique.has(key)) unique.set(key, lesson);
    }
    return { lessons: [...unique.values()].filter(isTrackedSpbuLesson), updatedAt: last?.updatedAt || null };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
