alter table public.schedule_lessons
  add column if not exists subgroup text;
