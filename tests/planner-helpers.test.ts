import { describe, expect, it } from "vitest";
import { greetingForHour, medicationPeriodProgress, statusForDeadline } from "../lib/planner-helpers";

describe("planner helpers", () => {
  it("changes greeting by local device hour", () => {
    expect(greetingForHour(7)).toBe("Доброе утро");
    expect(greetingForHour(15)).toBe("Добрый день");
    expect(greetingForHour(19)).toBe("Добрый вечер");
    expect(greetingForHour(2)).toBe("Доброй ночи");
  });

  it("marks overdue and soon deadlines separately", () => {
    const now = new Date("2026-08-13T18:00:00");
    expect(statusForDeadline("2026-08-12", "17:00", now).kind).toBe("overdue");
    expect(statusForDeadline("2026-08-14", "17:00", now).kind).toBe("soon");
  });

  it("fills medication heart only when all period medicines are taken", () => {
    const progress = medicationPeriodProgress(
      [
        { id: "a", period: "morning" },
        { id: "b", period: "morning" },
        { id: "c", period: "evening" }
      ],
      { a: "taken", b: "postponed", c: "taken" },
      "morning"
    );

    expect(progress.label).toBe("1/2 таблеток сегодня");
    expect(progress.complete).toBe(false);
  });
});
