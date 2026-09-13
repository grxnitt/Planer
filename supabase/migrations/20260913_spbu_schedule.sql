create table if not exists public.schedule_lessons (
  external_id text primary key,
  group_id text not null,
  lesson_date date not null,
  start_time time not null,
  end_time time,
  title text not null,
  location text,
  educator text,
  source_url text not null,
  last_seen_at timestamptz not null default now(),
  cancelled boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists schedule_lessons_group_date_idx
  on public.schedule_lessons (group_id, lesson_date, start_time);
