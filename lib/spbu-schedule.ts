import { load } from "cheerio";
import { createHash } from "crypto";

export const SPBU_GROUP_ID = "460105";
const SPBU_BASE = "https://timetable.spbu.ru/LAWS/StudentGroupEvents/Primary";

export type SpbuLesson = {
  externalId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  title: string;
  location: string | null;
  educator: string | null;
  sourceUrl: string;
};

const ELECTIVE_TITLES = [
  "правовое регулирование отношений в сети интернет",
  "журналистские расследования"
];

function comparable(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Keep every regular class. Restrict only the parallel elective and English
 * streams to the student's own choices.
 */
export function isTrackedSpbuLesson(lesson: Pick<SpbuLesson, "title" | "educator">) {
  const title = comparable(lesson.title);
  const educator = comparable(lesson.educator);
  const isElective = title.includes("электив");
  const isEnglish = title.includes("английский язык");
  const selectedElective = ELECTIVE_TITLES.some((elective) => title.includes(elective));
  const selectedEnglish = title.includes("траектория 3")
    && isEnglish
    && /b1\s*-\s*b2/.test(title)
    && educator.includes("удинская");

  if (isElective) return selectedElective;
  if (isEnglish) return selectedEnglish;
  return true;
}

function clean(value: string | undefined | null) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function localDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function mondayUtc(date = new Date()) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() - (day === 0 ? 6 : day - 1));
  return value;
}

export function spbuWeekUrl(weekMonday: Date) {
  return `${SPBU_BASE}/${SPBU_GROUP_ID}/${localDate(weekMonday)}`;
}

export function parseSpbuWeek(html: string, weekMonday: Date, sourceUrl: string): SpbuLesson[] {
  const $ = load(html);
  const lessons: SpbuLesson[] = [];

  $("#accordion > .panel").each((dayIndex, panel) => {
    const date = new Date(weekMonday);
    date.setUTCDate(date.getUTCDate() + dayIndex);

    $(panel).find("li.common-list-item").each((_, row) => {
      const time = clean($(row).find(".studyevent-datetime .moreinfo").first().text());
      const [startRaw, endRaw] = time.split(/[–—-]/).map((item) => item.trim());
      const title = clean($(row).find(".studyevent-subject .moreinfo").first().text());
      if (!title || !/^\d{1,2}:\d{2}$/.test(startRaw || "")) return;

      const location = clean($(row).find(".studyevent-locations .hoverable").first().text()) || null;
      const educator = clean($(row).find(".studyevent-educators a").map((_, anchor) => clean($(anchor).text())).get().join(", ")) || null;
      const dateValue = localDate(date);
      const externalId = createHash("sha256")
        .update([SPBU_GROUP_ID, dateValue, startRaw, title, location || "", educator || ""].join("|"))
        .digest("hex");

      const lesson = {
        externalId,
        date: dateValue,
        startTime: startRaw,
        endTime: /^\d{1,2}:\d{2}$/.test(endRaw || "") ? endRaw : null,
        title,
        location,
        educator,
        sourceUrl
      };
      lessons.push(lesson);
    });
  });

  return lessons;
}

export async function fetchSpbuWeek(weekMonday: Date) {
  const sourceUrl = spbuWeekUrl(weekMonday);
  const response = await fetch(sourceUrl, {
    headers: { "user-agent": "MyDay planner schedule sync/1.0", "accept-language": "ru-RU,ru;q=0.9,en;q=0.7" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`SPbU timetable returned ${response.status}`);
  return parseSpbuWeek(await response.text(), weekMonday, sourceUrl);
}

export async function fetchUpcomingSpbuLessons(weeks = 6) {
  const firstMonday = mondayUtc();
  const groups = await Promise.all(Array.from({ length: weeks }, (_, index) => {
    const week = new Date(firstMonday);
    week.setUTCDate(week.getUTCDate() + index * 7);
    return fetchSpbuWeek(week);
  }));
  return groups.flat().filter(isTrackedSpbuLesson);
}
