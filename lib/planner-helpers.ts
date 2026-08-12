export type DeadlineStatus = {
  kind: "overdue" | "soon" | "normal";
  label: string;
};

export type MedicationPeriod = "morning" | "evening";
export type MedicationLogStatus = "taken" | "missed" | "postponed";

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
