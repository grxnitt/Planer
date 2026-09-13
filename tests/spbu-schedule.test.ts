import { describe, expect, it } from "vitest";
import { isTrackedSpbuLesson } from "../lib/spbu-schedule";

describe("SPbU timetable filtering", () => {
  it("keeps regular classes", () => {
    expect(isTrackedSpbuLesson({ title: "Административное право, лекция", educator: "Сосновский С. А." })).toBe(true);
    expect(isTrackedSpbuLesson({ title: "Уголовное право (общая часть), лекция", educator: "Пряжина Н. И." })).toBe(true);
  });

  it("keeps only the selected electives", () => {
    expect(isTrackedSpbuLesson({ title: "Электив. Правовое регулирование отношений в сети Интернет, лекция", educator: "Архипов В. В." })).toBe(true);
    expect(isTrackedSpbuLesson({ title: "Электив. Журналистские расследования, практическое занятие", educator: "Иванов И. И." })).toBe(true);
    expect(isTrackedSpbuLesson({ title: "Электив. Современное искусство", educator: "Иванов И. И." })).toBe(false);
  });

  it("keeps only the requested English trajectory and teacher", () => {
    expect(isTrackedSpbuLesson({ title: "Траектория 3 (B1 – B2). Английский язык, практическое занятие", educator: "Удинская А. Г." })).toBe(true);
    expect(isTrackedSpbuLesson({ title: "Траектория 3 (B1 – B2). Английский язык, практическое занятие", educator: "Другой преподаватель" })).toBe(false);
    expect(isTrackedSpbuLesson({ title: "Траектория 2 (B1 – B2). Английский язык, практическое занятие", educator: "Удинская А. Г." })).toBe(false);
  });
});
