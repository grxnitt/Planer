import { describe, expect, it } from "vitest";
import { applyPersonalScheduleOverrides, isTrackedSpbuLesson, type SpbuLesson } from "../lib/spbu-schedule";

describe("SPbU timetable filtering", () => {
  it("keeps regular classes", () => {
    expect(isTrackedSpbuLesson({ title: "Административное право, лекция", educator: "Сосновский С. А.", subgroup: null })).toBe(true);
    expect(isTrackedSpbuLesson({ title: "Уголовное право (общая часть), лекция", educator: "Пряжина Н. И.", subgroup: null })).toBe(true);
  });

  it("keeps only the selected electives", () => {
    expect(isTrackedSpbuLesson({ title: "Электив. Правовое регулирование отношений в сети Интернет, лекция", educator: "Архипов В. В.", subgroup: null })).toBe(true);
    expect(isTrackedSpbuLesson({ title: "Электив. Журналистские расследования, практическое занятие", educator: "Иванов И. И.", subgroup: null })).toBe(true);
    expect(isTrackedSpbuLesson({ title: "Elective. Journalistic investigations", educator: "Ivanov I. I.", subgroup: null })).toBe(true);
    expect(isTrackedSpbuLesson({ title: "Электив. Современное искусство", educator: "Иванов И. И.", subgroup: null })).toBe(false);
  });

  it("keeps only the requested English trajectory and teacher", () => {
    expect(isTrackedSpbuLesson({ title: "Траектория 3 (В1 – В2). Английский язык, практическое занятие", educator: "Удинская А. Г.", subgroup: "Подгруппа 5" })).toBe(true);
    expect(isTrackedSpbuLesson({ title: "Траектория 3 (B1 – B2). Английский язык, практическое занятие", educator: "Удинская А. Г.", subgroup: "Cohort 5" })).toBe(true);
    expect(isTrackedSpbuLesson({ title: "Траектория 3 (В1 – В2). Английский язык, практическое занятие", educator: "Удинская А. Г.", subgroup: "Подгруппа 2" })).toBe(false);
    expect(isTrackedSpbuLesson({ title: "Траектория 3 (В1 – В2). Английский язык, практическое занятие", educator: "Другой преподаватель", subgroup: "Подгруппа 5" })).toBe(false);
    expect(isTrackedSpbuLesson({ title: "Траектория 2 (В1 – В2). Английский язык, практическое занятие", educator: "Удинская А. Г.", subgroup: "Подгруппа 5" })).toBe(false);
    expect(isTrackedSpbuLesson({ title: "Траектория 1 (РКИ). Русский язык как иностранный, практическое занятие", educator: "Шарихин Е. Ю.", subgroup: "Подгруппа 1" })).toBe(false);
    expect(isTrackedSpbuLesson({ title: "Trajectory 4. German language", educator: "Другой преподаватель", subgroup: "Cohort 1" })).toBe(false);
  });

  it("moves the selected legal elective into the personal Tuesday slot", () => {
    const elective: SpbuLesson = {
      externalId: "legal", date: "2026-09-24", startTime: "14:45", endTime: "16:15",
      title: "Электив. Правовое регулирование отношений в сети Интернет, лекция",
      location: "Большой проспект", educator: "Медведев А. И.", subgroup: null, sourceUrl: "https://example.test"
    };
    const placeholder: SpbuLesson = {
      ...elective, externalId: "rudokvas", date: "2026-09-22", title: "Гражданское право (общая часть), семинар", educator: "Рудоквас А. Д."
    };
    const result = applyPersonalScheduleOverrides([elective, placeholder]);
    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ date: "2026-09-22", startTime: "14:45", title: elective.title }),
      expect.objectContaining({ date: "2026-09-24", startTime: "14:45", title: elective.title })
    ]));
  });
});
