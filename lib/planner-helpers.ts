export type DeadlineStatus = {
  kind: "overdue" | "soon" | "normal";
  label: string;
};

export type MedicationPeriod = "morning" | "evening";
export type MedicationLogStatus = "taken" | "missed" | "postponed";
export type RecurrenceLike = "none" | "daily" | "weekly" | "monthly";
export type WeekdaySchedule = number[];

export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "Доброе утро";
  if (hour >= 12 && hour < 18) return "Добрый день";
  if (hour >= 18 && hour < 23) return "Добрый вечер";
  return "Доброй ночи";
}

export function dayIconForHour(hour: number): "dawn" | "day" | "sunset" | "night" {
  if (hour >= 5 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "sunset";
  return "night";
}

export function statusForDeadline(date: string, time?: string, now = new Date()): DeadlineStatus {
  const due = new Date(`${date}T${time || "23:59"}:00`);
  const diff = due.getTime() - now.getTime();
  const day = 24 * 60 * 60 * 1000;

  if (diff < 0) return { kind: "overdue", label: "Просрочено" };
  if (diff <= day * 2) return { kind: "soon", label: "Скоро" };
  return { kind: "normal", label: `Осталось ${Math.ceil(diff / day)} дн.` };
}

export function medicationPeriodProgress(
  medications: { id: string; period: MedicationPeriod }[],
  logs: Record<string, MedicationLogStatus | undefined>,
  period: MedicationPeriod
) {
  const periodMeds = medications.filter((med) => med.period === period);
  const taken = periodMeds.filter((med) => logs[med.id] === "taken").length;
  const total = periodMeds.length;

  return {
    taken,
    total,
    complete: total > 0 && taken === total,
    label: `${taken}/${total} таблеток сегодня`
  };
}

export function localIsoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function occursOn(itemDate: string, recurrence: RecurrenceLike | undefined, targetDate: string, repeatDays?: WeekdaySchedule) {
  if (itemDate === targetDate) return true;
  if (!recurrence || recurrence === "none") return false;

  const start = new Date(`${itemDate}T12:00:00`);
  const target = new Date(`${targetDate}T12:00:00`);
  if (target < start) return false;

  if (recurrence === "daily") return true;
  if (recurrence === "weekly") return repeatDays?.length ? repeatDays.includes(target.getDay()) : start.getDay() === target.getDay();
  return start.getDate() === target.getDate();
}

export function periodHeartLogs(
  medications: { id: string; period: MedicationPeriod; logs: Record<string, MedicationLogStatus | undefined> }[],
  period: MedicationPeriod,
  year: number,
  monthIndex: number
) {
  const result: Record<string, boolean> = {};
  const periodMeds = medications.filter((med) => med.period === period);
  const days = new Date(year, monthIndex + 1, 0).getDate();

  for (let day = 1; day <= days; day += 1) {
    const key = localIsoDate(year, monthIndex, day);
    result[String(day)] = periodMeds.length > 0 && periodMeds.every((med) => med.logs[key] === "taken");
  }

  return result;
}

export function calendarDaySummary(
  date: string,
  data: {
    tasks?: { date: string; recurrence?: RecurrenceLike; repeatDays?: WeekdaySchedule }[];
    events?: { date: string; recurrence?: RecurrenceLike; repeatDays?: WeekdaySchedule }[];
    deadlines?: { date: string; recurrence?: RecurrenceLike; repeatDays?: WeekdaySchedule }[];
    plans?: { date: string; description?: string }[];
  }
) {
  return {
    tasks: (data.tasks || []).filter((item) => occursOn(item.date, item.recurrence, date, item.repeatDays)).length,
    events: (data.events || []).filter((item) => occursOn(item.date, item.recurrence, date, item.repeatDays)).length,
    deadlines: (data.deadlines || []).filter((item) => occursOn(item.date, item.recurrence, date, item.repeatDays)).length,
    hasPlan: (data.plans || []).some((item) => item.date === date && Boolean(item.description?.trim()))
  };
}

export function isoToday(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function prettyDate(date = new Date()) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(date);
}

export function monthDays(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export type PlannerSearchInput = {
  tasks?: { title: string }[];
  deadlines?: { title: string }[];
  events?: { title: string }[];
  plans?: { description: string; top?: string[]; checklist?: { text: string }[] }[];
  transactions?: { note?: string }[];
  goals?: { title: string }[];
};

export function plannerSearch(query: string, data: PlannerSearchInput) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return [
    ...(data.tasks || []).map((item) => ({ type: "Задача", text: item.title })),
    ...(data.deadlines || []).map((item) => ({ type: "Дедлайн", text: item.title })),
    ...(data.events || []).map((item) => ({ type: "Событие", text: item.title })),
    ...(data.plans || []).map((item) => ({ type: "План", text: [item.description, ...(item.top || []), ...(item.checklist || []).map((check) => check.text)].join(" ") }))
  ].filter((item) => item.text.toLowerCase().includes(q));
}
