"use client";

import {
  Bell,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  Edit3,
  Heart,
  ListChecks,
  MoonStar,
  Pill,
  Plus,
  Search,
  Settings,
  SunMedium,
  Sunrise,
  Sunset,
  Target,
  Trash2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  calendarDaySummary,
  dayIconForHour,
  greetingForHour,
  isoToday,
  localIsoDate,
  medicationPeriodProgress,
  monthDays,
  occursOn,
  periodHeartLogs,
  plannerSearch,
  prettyDate,
  statusForDeadline,
  type MedicationLogStatus,
  type MedicationPeriod
} from "@/lib/planner-helpers";

type Section =
  | "today"
  | "calendar"
  | "events"
  | "tasks"
  | "plans"
  | "habits"
  | "medications"
  | "finance"
  | "deadlines"
  | "goals"
  | "settings";
type Recurrence = "none" | "daily" | "weekly" | "monthly";
type Task = { id: string; title: string; date: string; time?: string; completed: boolean; category: string; goalId?: string; recurrence: Recurrence };
type Deadline = { id: string; title: string; date: string; time?: string; category: string; recurrence: Recurrence };
type EventItem = { id: string; title: string; date: string; time: string; recurrence: Recurrence };
type Habit = { id: string; title: string; color: string; logs: Record<string, boolean> };
type Medication = { id: string; title: string; dose: string; time: string; period: MedicationPeriod; recurrence: Recurrence; logs: Record<string, MedicationLogStatus> };
type Transaction = { id: string; amount: number; type: "income" | "expense"; category: string; date: string; note?: string };
type PlanDay = { date: string; description: string; top: string[]; checklist: { id: string; text: string; done: boolean }[] };
type Goal = { id: string; title: string; color: string; taskIds: string[] };
type PlannerData = {
  theme: string;
  tasks: Task[];
  deadlines: Deadline[];
  events: EventItem[];
  habits: Habit[];
  medications: Medication[];
  transactions: Transaction[];
  financeCategories: string[];
  plans: Record<string, PlanDay>;
  goals: Goal[];
};

const storageKey = "soft-planner-recovered-v2";
const images = [
  "/quote-moods/quote-harmony.jpeg",
  "/quote-moods/quote-just-be.jpeg",
  "/quote-moods/quote-aura.jpeg",
  "/quote-moods/quote-waterfall.jpeg",
  "/quote-moods/quote-power.jpeg",
  "/quote-moods/quote-levi-night.jpeg",
  "/quote-moods/quote-levi-sunset.jpeg",
  "/quote-moods/quote-lucky-you.jpeg"
];
const nav: { id: Section; label: string; icon: typeof CalendarDays }[] = [
  { id: "today", label: "Сегодня", icon: Sunrise },
  { id: "calendar", label: "Календарь", icon: CalendarDays },
  { id: "events", label: "События", icon: Clock },
  { id: "tasks", label: "Задачи", icon: ListChecks },
  { id: "plans", label: "Планы", icon: Edit3 },
  { id: "habits", label: "Привычки", icon: Heart },
  { id: "medications", label: "Таблетки", icon: Pill },
  { id: "finance", label: "Финансы", icon: CreditCard },
  { id: "deadlines", label: "Дедлайны", icon: Bell },
  { id: "goals", label: "Цели", icon: Target },
  { id: "settings", label: "Настройки", icon: Settings }
];

const today = isoToday();
const seed: PlannerData = {
  theme: "pink",
  tasks: [
    { id: "t1", title: "Английский — reported speech", date: today, time: "10:00", completed: false, category: "Учёба", recurrence: "weekly" },
    { id: "t2", title: "Сделать пост для кураторов", date: today, time: "14:00", completed: false, category: "Работа", recurrence: "none" }
  ],
  deadlines: [
    { id: "d1", title: "Тест в школу кураторов", date: today, time: "20:00", category: "Учёба", recurrence: "none" },
    { id: "d2", title: "Отчёт по проекту", date: addDays(2), time: "17:00", category: "Работа", recurrence: "none" }
  ],
  events: [{ id: "e1", title: "Встреча с наставником", date: today, time: "18:30", recurrence: "none" }],
  habits: [
    { id: "h1", title: "Тренировка", color: "#e8749b", logs: {} },
    { id: "h2", title: "Вода", color: "#9ccfc3", logs: {} }
  ],
  medications: [{ id: "m1", title: "D3", dose: "1 таблетка 5000 · после еды", time: "09:30", period: "morning", recurrence: "daily", logs: {} }],
  transactions: [
    { id: "f1", amount: 10000, type: "expense", category: "Другое", date: today, note: "покупка" },
    { id: "f2", amount: 706, type: "expense", category: "Расходы", date: today, note: "учебник по английскому" }
  ],
  financeCategories: ["Доходы", "Расходы", "Другое", "Рестораны", "Подписки", "Транспорт"],
  plans: {
    [today]: {
      date: today,
      description: "Спокойный день без гонки: важное — первым, остальное мягко.",
      top: ["Закрыть главное дело", "Разобрать дедлайны", "Отдохнуть без чувства вины"],
      checklist: [{ id: "c1", text: "Проверить планы на день", done: false }]
    }
  },
  goals: [{ id: "g1", title: "Учёба без хаоса", color: "#b99ae8", taskIds: ["t1"] }]
};

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoToday(date);
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function PlannerApp({ initialSection }: { initialSection: string }) {
  const section = initialSection as Section;
  const [data, setData] = useState<PlannerData>(seed);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<null | "task" | "deadline" | "event" | "med" | "finance" | "goal" | "habit">(null);
  const [now, setNow] = useState(new Date());
  const [image, setImage] = useState(images[0]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setData(JSON.parse(saved));
    setImage(images[Math.floor(Math.random() * images.length)]);
    setHydrated(true);
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, JSON.stringify(data));
    document.documentElement.dataset.theme = data.theme;
  }, [data, hydrated]);

  const results = useMemo(() => plannerSearch(query, { ...data, plans: Object.values(data.plans) }), [data, query]);

  function patch(update: Partial<PlannerData>) {
    setData((current) => ({ ...current, ...update }));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/today">myday</a>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <a key={item.id} className={section === item.id ? "active" : ""} href={`/${item.id}`}>
                <Icon size={18} />
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="profile">Доброе время дня,<br />Елизавета Сергеевна ✨</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <h2>{nav.find((item) => item.id === section)?.label || "Сегодня"}</h2>
          <div className="search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" />
            {results.length > 0 && (
              <div className="search-results">
                {results.map((item, index) => <p key={index}><span>{item.type}</span>{item.text}</p>)}
              </div>
            )}
          </div>
          <Bell />
          {section !== "today" && <button className="primary" onClick={() => setModal(defaultModal(section))}><Plus />Добавить</button>}
        </header>
        {section === "today" && <TodayPage data={data} now={now} image={image} setData={setData} />}
        {section === "tasks" && <TasksPage data={data} setData={setData} />}
        {section === "deadlines" && <DeadlinesPage data={data} now={now} setData={setData} />}
        {section === "events" && <EventsPage data={data} setData={setData} />}
        {section === "calendar" && <CalendarPage data={data} />}
        {section === "plans" && <PlansPage data={data} setData={setData} />}
        {section === "habits" && <HabitsPage data={data} setData={setData} />}
        {section === "medications" && <MedicationPage data={data} setData={setData} />}
        {section === "finance" && <FinancePage data={data} setData={setData} />}
        {section === "goals" && <GoalsPage data={data} setData={setData} />}
        {section === "settings" && <SettingsPage data={data} patch={patch} />}
      </main>
      {modal && <QuickModal kind={modal} data={data} setData={setData} close={() => setModal(null)} />}
    </div>
  );
}

function defaultModal(section: Section) {
  if (section === "deadlines") return "deadline";
  if (section === "events") return "event";
  if (section === "medications") return "med";
  if (section === "finance") return "finance";
  if (section === "goals") return "goal";
  if (section === "habits") return "habit";
  return "task";
}

function TimeIcon({ date }: { date: Date }) {
  const kind = dayIconForHour(date.getHours());
  const Icon = kind === "dawn" ? Sunrise : kind === "day" ? SunMedium : kind === "sunset" ? Sunset : MoonStar;
  return <span className={`soft-icon ${kind}`}><Icon size={30} /></span>;
}

function TodayPage({ data, now, image, setData }: {
  data: PlannerData;
  now: Date;
  image: string;
  setData: React.Dispatch<React.SetStateAction<PlannerData>>;
}) {
  const todaysTasks = data.tasks.filter((task) => occursOn(task.date, task.recurrence, today));
  const todaysEvents = data.events.filter((event) => occursOn(event.date, event.recurrence, today));
  const spent = data.transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const budget = 40000;
  const todayDay = String(now.getDate());
  const todaysLogs = Object.fromEntries(data.medications.map((med) => [med.id, med.logs[today]]));
  const medProgress = (["morning", "evening"] as MedicationPeriod[]).map((period) => ({
    period,
    progress: medicationPeriodProgress(data.medications, todaysLogs, period)
  }));
  const doneHabits = data.habits.filter((habit) => habit.logs[todayDay]).length;

  return (
    <div>
      <section className="greeting">
        <h1>{greetingForHour(now.getHours())}, Елизавета Сергеевна!</h1>
        <p>{prettyDate(now)}</p>
      </section>
      <div className="dashboard">
        <Card title="Сегодня" icon={<TimeIcon date={now} />}>
          {todaysTasks.length ? todaysTasks.map((task) => <CheckRow key={task.id} checked={task.completed} text={task.title} onClick={() => setData((d) => ({ ...d, tasks: d.tasks.map((x) => x.id === task.id ? { ...x, completed: !x.completed } : x) }))} />) : <Empty text="На сегодня задач нет" />}
        </Card>
        <Card title="Ближайшие дедлайны" icon={<CalendarDays />}>
          {data.deadlines.map((deadline) => {
            const status = statusForDeadline(deadline.date, deadline.time, now);
            return <div key={deadline.id} className={`deadline-row ${status.kind}`}><b>{dateRu(deadline.date)} · {deadline.time || "Без времени"}</b><span>{deadline.title}</span><small>{status.label}</small></div>;
          })}
        </Card>
        <Card title="События сегодня" icon={<Clock />}>
          {todaysEvents.length ? todaysEvents.map((event) => <div className="event-row" key={event.id}><b>{event.time}</b><span>{event.title}</span></div>) : <Empty text="Событий сегодня нет" />}
        </Card>
        <Card title="Привычки" icon={<Heart />}>
          <div className="overview-list">
            <b>{doneHabits}/{data.habits.length} привычек сегодня</b>
            {data.habits.map((habit) => <span key={habit.id} style={{ color: habit.color }}>{habit.logs[todayDay] ? "♥" : "♡"} {habit.title}</span>)}
          </div>
        </Card>
        <Card title="Таблетки" icon={<Pill />}>
          <div className="overview-list">
            {medProgress.map(({ period, progress }) => (
              <span key={period}>{progress.complete ? "♥" : "♡"} {period === "morning" ? "Утро" : "Вечер"} · {progress.label}</span>
            ))}
          </div>
        </Card>
        <Card title="Финансы" icon={<CreditCard />}>
          <div className="finance-mini">
            <div className="ring">{Math.round((spent / budget) * 100)}%</div>
            <p>
              <b>{money(spent)}</b>
              <span>потрачено</span>
              <small>из {money(budget)}</small>
            </p>
          </div>
        </Card>
        <Card title="Расходы сегодня" icon={<CreditCard />}>
          {data.transactions.filter((item) => item.type === "expense" && item.date === today).map((item) => <div className="money-row" key={item.id}><b>-{money(item.amount)}</b><span>{item.category}</span></div>)}
        </Card>
        <div className="image-card"><img src={image} alt="Настроение дня" /></div>
      </div>
    </div>
  );
}

function Card({ title, icon, action, onAction, children }: { title: string; icon: React.ReactNode; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return <section className="card"><h3>{icon}<span>{title}</span></h3><div className="card-body">{children}</div>{action && <button className="link-button" onClick={onAction}><Plus size={17} />{action}</button>}</section>;
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

function CheckRow({ checked, text, onClick }: { checked: boolean; text: string; onClick: () => void }) {
  return <button className={`check-row ${checked ? "done" : ""}`} onClick={onClick}><span>{checked && <Check size={13} />}</span>{text}</button>;
}

const taskCategories = ["Учёба", "Работа", "Личное", "Дом", "Здоровье", "Другое"];

function TasksPage({ data, setData }: { data: PlannerData; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  return <ListPage title="Задачи">{data.tasks.map((task) => <TaskRow key={task.id} task={task} data={data} setData={setData} />)}</ListPage>;
}

function TaskRow({ task, data, setData }: { task: Task; data: PlannerData; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task);
  const save = () => {
    setData((d) => ({ ...d, tasks: d.tasks.map((x) => x.id === task.id ? { ...draft, title: draft.title.trim() || x.title } : x) }));
    setEditing(false);
  };

  return <div className="editable-row full-edit-row"><button className="mini-check" onClick={() => setData((d) => ({ ...d, tasks: d.tasks.map((x) => x.id === task.id ? { ...x, completed: !x.completed } : x) }))}>{task.completed && <Check size={14} />}</button><div>{editing ? <EditGrid><label>Название<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label><label>День<input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label><label>Время<input type="time" value={draft.time || ""} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></label><label>Категория<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{taskCategories.map((cat) => <option key={cat}>{cat}</option>)}</select></label><label>Цель<select value={draft.goalId || ""} onChange={(e) => setDraft({ ...draft, goalId: e.target.value || undefined })}><option value="">Без цели</option>{data.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label><label>Повтор<select value={draft.recurrence} onChange={(e) => setDraft({ ...draft, recurrence: e.target.value as Recurrence })}>{recurrenceOptions()}</select></label></EditGrid> : <><h3>{task.title}</h3><p>{dateRu(task.date)} {task.time || "без времени"} · {task.category} · {recurrenceRu(task.recurrence)}{task.goalId ? ` · цель: ${data.goals.find((goal) => goal.id === task.goalId)?.title || "без названия"}` : ""}</p></>}</div>{editing ? <button aria-label="Сохранить" onClick={save}><Check /></button> : <button aria-label="Редактировать" onClick={() => { setDraft(task); setEditing(true); }}><Edit3 /></button>}<button aria-label="Удалить" onClick={() => setData((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== task.id), goals: d.goals.map((goal) => ({ ...goal, taskIds: goal.taskIds.filter((id) => id !== task.id) })) }))}><Trash2 /></button></div>;
}

function DeadlinesPage({ data, now, setData }: { data: PlannerData; now: Date; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  return <ListPage title="Дедлайны с временем">{data.deadlines.map((deadline) => <DeadlineRow key={deadline.id} deadline={deadline} now={now} setData={setData} />)}</ListPage>;
}

function DeadlineRow({ deadline, now, setData }: { deadline: Deadline; now: Date; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(deadline);
  const status = statusForDeadline(deadline.date, deadline.time, now);
  const save = () => {
    setData((d) => ({ ...d, deadlines: d.deadlines.map((x) => x.id === deadline.id ? { ...draft, title: draft.title.trim() || x.title } : x) }));
    setEditing(false);
  };

  return <div className={`editable-row full-edit-row ${status.kind}`}><div>{editing ? <EditGrid><label>Название<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label><label>День<input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label><label>Время<input type="time" value={draft.time || ""} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></label><label>Категория<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{taskCategories.map((cat) => <option key={cat}>{cat}</option>)}</select></label><label>Повтор<select value={draft.recurrence} onChange={(e) => setDraft({ ...draft, recurrence: e.target.value as Recurrence })}>{recurrenceOptions()}</select></label></EditGrid> : <><h3>{deadline.title}</h3><p>{dateRu(deadline.date)} · {deadline.time || "Без времени"} · {deadline.category} · {recurrenceRu(deadline.recurrence)} · {status.label}</p></>}</div>{editing ? <button aria-label="Сохранить" onClick={save}><Check /></button> : <button aria-label="Редактировать" onClick={() => { setDraft(deadline); setEditing(true); }}><Edit3 /></button>}<button aria-label="Удалить" onClick={() => setData((d) => ({ ...d, deadlines: d.deadlines.filter((x) => x.id !== deadline.id) }))}><Trash2 /></button></div>;
}

function EventsPage({ data, setData }: { data: PlannerData; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  return <ListPage title="События">{data.events.map((event) => <EventRow key={event.id} event={event} setData={setData} />)}</ListPage>;
}

function EventRow({ event, setData }: { event: EventItem; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(event);
  const save = () => {
    setData((d) => ({ ...d, events: d.events.map((x) => x.id === event.id ? { ...draft, title: draft.title.trim() || x.title } : x) }));
    setEditing(false);
  };

  return <div className="editable-row full-edit-row"><div>{editing ? <EditGrid><label>Название<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label><label>День<input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label><label>Время<input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></label><label>Повтор<select value={draft.recurrence} onChange={(e) => setDraft({ ...draft, recurrence: e.target.value as Recurrence })}>{recurrenceOptions()}</select></label></EditGrid> : <><h3>{event.title}</h3><p>{dateRu(event.date)} · {event.time} · {recurrenceRu(event.recurrence)}</p></>}</div>{editing ? <button aria-label="Сохранить" onClick={save}><Check /></button> : <button aria-label="Редактировать" onClick={() => { setDraft(event); setEditing(true); }}><Edit3 /></button>}<button aria-label="Удалить" onClick={() => setData((d) => ({ ...d, events: d.events.filter((x) => x.id !== event.id) }))}><Trash2 /></button></div>;
}

function CalendarPage({ data }: { data: PlannerData }) {
  const month = new Date();
  const firstOffset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const monthLabel = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(month);
  return <ListPage title="Календарь"><div className="calendar-panel"><div className="calendar-title"><h2>{monthLabel}</h2><p>Задачи, события, дедлайны и планы в одном месячном обзоре</p></div><div className="weekday-row">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid pretty">{Array.from({ length: firstOffset }).map((_, index) => <div key={`empty-${index}`} className="calendar-cell muted" />)}{Array.from({ length: monthDays(month) }, (_, i) => i + 1).map((day) => {
    const date = localIsoDate(month.getFullYear(), month.getMonth(), day);
    const summary = calendarDaySummary(date, { ...data, plans: Object.values(data.plans) });
    const total = summary.tasks + summary.events + summary.deadlines + (summary.hasPlan ? 1 : 0);
    return <div key={day} className={`calendar-cell ${date === today ? "today-cell" : ""} ${total ? "has-items" : ""}`}><b>{day}</b>{total ? <div className="calendar-pills">{summary.tasks > 0 && <span className="task-dot">{summary.tasks} задач</span>}{summary.events > 0 && <span className="event-dot">{summary.events} событий</span>}{summary.deadlines > 0 && <span className="deadline-dot">{summary.deadlines} дедл.</span>}{summary.hasPlan && <em>план</em>}</div> : <small>тихо</small>}</div>;
  })}</div></div></ListPage>;
}

function PlansPage({ data, setData }: { data: PlannerData; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  const [date, setDate] = useState(today);
  const plan = data.plans[date] || { date, description: "", top: ["", "", ""], checklist: [] };
  const save = (next: PlanDay) => setData((d) => ({ ...d, plans: { ...d.plans, [date]: next } }));
  return <ListPage title="Планы на день"><div className="form-grid"><label>День<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label className="wide">Описание дня<textarea value={plan.description} onChange={(e) => save({ ...plan, description: e.target.value })} /></label>{[0, 1, 2].map((i) => <label key={i}>Главное дело {i + 1}<input value={plan.top[i] || ""} onChange={(e) => { const top = [...plan.top]; top[i] = e.target.value; save({ ...plan, top }); }} /></label>)}<div className="wide checklist"><h3>Чеклист</h3>{plan.checklist.map((item) => <div className="check-edit-row" key={item.id}><CheckRow checked={item.done} text="" onClick={() => save({ ...plan, checklist: plan.checklist.map((x) => x.id === item.id ? { ...x, done: !x.done } : x) })} /><input value={item.text} onChange={(e) => save({ ...plan, checklist: plan.checklist.map((x) => x.id === item.id ? { ...x, text: e.target.value } : x) })} /><button aria-label="Удалить пункт" onClick={() => save({ ...plan, checklist: plan.checklist.filter((x) => x.id !== item.id) })}><Trash2 size={18} /></button></div>)}<button className="secondary" onClick={() => save({ ...plan, checklist: [...plan.checklist, { id: uid("c"), text: "Новый пункт", done: false }] })}>+ пункт</button></div></div></ListPage>;
}

function HabitsPage({ data, setData }: { data: PlannerData; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  return <ListPage title="Трекер привычек">{data.habits.map((habit) => <section className="tracker" key={habit.id} style={{ ["--habit" as string]: habit.color }}><div className="tracker-head"><input value={habit.title} onChange={(e) => setData((d) => ({ ...d, habits: d.habits.map((x) => x.id === habit.id ? { ...x, title: e.target.value } : x) }))} /><input type="color" value={habit.color} onChange={(e) => setData((d) => ({ ...d, habits: d.habits.map((x) => x.id === habit.id ? { ...x, color: e.target.value } : x) }))} /><button onClick={() => setData((d) => ({ ...d, habits: d.habits.filter((x) => x.id !== habit.id) }))}><Trash2 /></button></div><HeartGrid logs={habit.logs} color={habit.color} onToggle={(day) => setData((d) => ({ ...d, habits: d.habits.map((x) => x.id === habit.id ? { ...x, logs: { ...x.logs, [day]: !x.logs[day] } } : x) }))} /></section>)}</ListPage>;
}

function MedicationPage({ data, setData }: { data: PlannerData; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  const todaysLogs = Object.fromEntries(data.medications.map((med) => [med.id, med.logs[today]]));
  const now = new Date();
  return <ListPage title="Трекер таблеток"><div className="two-cols">{(["morning", "evening"] as MedicationPeriod[]).map((period) => {
    const progress = medicationPeriodProgress(data.medications, todaysLogs, period);
    const periodLogs = periodHeartLogs(data.medications, period, now.getFullYear(), now.getMonth());
    return <section className="tracker" key={period}><h2>{period === "morning" ? "Утро" : "Вечер"} <span>{progress.label}</span></h2><HeartGrid logs={periodLogs} color="#e8749b" onToggle={(day) => toggleMedicationPeriodDay(setData, period, localIsoDate(now.getFullYear(), now.getMonth(), Number(day)), !periodLogs[day])} /></section>;
  })}</div>{data.medications.map((med) => <MedicationRow key={med.id} med={med} setData={setData} />)}</ListPage>;
}

function HeartGrid({ logs, color, onToggle, readOnly }: { logs: Record<string, boolean>; color: string; onToggle?: (day: string) => void; readOnly?: boolean }) {
  return <div className="heart-grid">{Array.from({ length: monthDays() }, (_, i) => String(i + 1)).map((day) => <button disabled={readOnly} key={day} onClick={() => onToggle?.(day)} style={{ color }}><span>{day}</span><Heart fill={logs[day] ? "currentColor" : "transparent"} /></button>)}</div>;
}

function FinancePage({ data, setData }: { data: PlannerData; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  const [category, setCategory] = useState("");
  return <ListPage title="Финансы"><FinanceEntryForm data={data} setData={setData} /><div className="category-manager"><input placeholder="Новая категория" value={category} onChange={(e) => setCategory(e.target.value)} /><button onClick={() => { if (category.trim()) setData((d) => ({ ...d, financeCategories: [...new Set([...d.financeCategories, category.trim()])] })); setCategory(""); }}>Добавить категорию</button></div>{data.transactions.map((item) => <FinanceRow key={item.id} item={item} categories={data.financeCategories} setData={setData} />)}</ListPage>;
}

function FinanceEntryForm({ data, setData }: { data: PlannerData; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  const [draft, setDraft] = useState<Omit<Transaction, "id">>({ amount: 0, type: "expense", category: data.financeCategories[1] || "Расходы", date: today, note: "" });
  const save = () => {
    const amount = Math.abs(Number(draft.amount));
    if (!amount) return;
    setData((d) => ({ ...d, transactions: [{ ...draft, id: uid("f"), amount }, ...d.transactions] }));
    setDraft({ amount: 0, type: "expense", category: data.financeCategories[1] || "Расходы", date: today, note: "" });
  };

  return <section className="inline-form"><h3>Новая операция</h3><EditGrid><label>Тип<select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Transaction["type"] })}><option value="expense">Расход</option><option value="income">Доход</option></select></label><label>Сумма<input type="number" value={draft.amount || ""} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} /></label><label>Категория<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{data.financeCategories.map((cat) => <option key={cat}>{cat}</option>)}</select></label><label>Дата<input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label><label className="wide">Комментарий<input value={draft.note || ""} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label></EditGrid><button className="primary" onClick={save}><Plus />Добавить операцию</button></section>;
}

function FinanceRow({ item, categories, setData }: { item: Transaction; categories: string[]; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);
  const save = () => {
    setData((d) => ({ ...d, transactions: d.transactions.map((x) => x.id === item.id ? { ...draft, amount: Math.abs(Number(draft.amount)) || x.amount } : x) }));
    setEditing(false);
  };

  return <div className="editable-row full-edit-row"><div>{editing ? <EditGrid><label>Тип<select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Transaction["type"] })}><option value="expense">Расход</option><option value="income">Доход</option></select></label><label>Сумма<input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} /></label><label>Категория<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{categories.map((cat) => <option key={cat}>{cat}</option>)}</select></label><label>Дата<input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label><label className="wide">Комментарий<input value={draft.note || ""} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label></EditGrid> : <><h3>{item.type === "income" ? "+" : "-"}{money(item.amount)}</h3><p>{item.category} · {dateRu(item.date)} {item.note || ""}</p></>}</div>{editing ? <button aria-label="Сохранить" onClick={save}><Check /></button> : <button aria-label="Редактировать" onClick={() => { setDraft(item); setEditing(true); }}><Edit3 /></button>}<button aria-label="Удалить" onClick={() => setData((d) => ({ ...d, transactions: d.transactions.filter((x) => x.id !== item.id) }))}><Trash2 /></button></div>;
}

function GoalsPage({ data, setData }: { data: PlannerData; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  return <ListPage title="Цели и связанные задачи">{data.goals.map((goal) => {
    const linked = data.tasks.filter((task) => goal.taskIds.includes(task.id) || task.goalId === goal.id);
    const done = linked.filter((task) => task.completed).length;
    return <GoalEditor key={goal.id} goal={goal} data={data} linked={linked} done={done} setData={setData} />;
  })}</ListPage>;
}

function GoalEditor({ goal, data, linked, done, setData }: { goal: Goal; data: PlannerData; linked: Task[]; done: number; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  const [newTask, setNewTask] = useState("");
  const [newDate, setNewDate] = useState(today);
  const [newTime, setNewTime] = useState("12:00");

  return <section className="goal-card" style={{ ["--goal" as string]: goal.color }}><div className="goal-head"><input value={goal.title} onChange={(e) => setData((d) => ({ ...d, goals: d.goals.map((x) => x.id === goal.id ? { ...x, title: e.target.value } : x) }))} /><input aria-label="Цвет цели" type="color" value={goal.color} onChange={(e) => setData((d) => ({ ...d, goals: d.goals.map((x) => x.id === goal.id ? { ...x, color: e.target.value } : x) }))} /><button aria-label="Удалить цель" onClick={() => setData((d) => ({ ...d, goals: d.goals.filter((x) => x.id !== goal.id), tasks: d.tasks.map((task) => task.goalId === goal.id ? { ...task, goalId: undefined } : task) }))}><Trash2 /></button></div><h2>Прогресс<span>{done}/{linked.length}</span></h2><progress max={Math.max(linked.length, 1)} value={done} />{linked.map((task) => <div className="goal-task-row" key={task.id}><CheckRow checked={task.completed} text={task.title} onClick={() => setData((d) => ({ ...d, tasks: d.tasks.map((x) => x.id === task.id ? { ...x, completed: !x.completed } : x) }))} /><button onClick={() => setData((d) => ({ ...d, goals: d.goals.map((x) => x.id === goal.id ? { ...x, taskIds: x.taskIds.filter((id) => id !== task.id) } : x), tasks: d.tasks.map((x) => x.id === task.id ? { ...x, goalId: undefined } : x) }))}>Убрать</button></div>)}<div className="goal-linker"><select onChange={(e) => e.target.value && setData((d) => ({ ...d, goals: d.goals.map((x) => x.id === goal.id ? { ...x, taskIds: [...new Set([...x.taskIds, e.target.value])] } : x), tasks: d.tasks.map((task) => task.id === e.target.value ? { ...task, goalId: goal.id } : task) }))}><option value="">Добавить существующую задачу</option>{data.tasks.filter((task) => !linked.some((x) => x.id === task.id)).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select><input placeholder="Новая задача для цели" value={newTask} onChange={(e) => setNewTask(e.target.value)} /><input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /><input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} /><button className="secondary" onClick={() => { const title = newTask.trim(); if (!title) return; const id = uid("t"); setData((d) => ({ ...d, tasks: [...d.tasks, { id, title, date: newDate, time: newTime, completed: false, category: "Личное", goalId: goal.id, recurrence: "none" }], goals: d.goals.map((x) => x.id === goal.id ? { ...x, taskIds: [...new Set([...x.taskIds, id])] } : x) })); setNewTask(""); }}>+ задача</button></div></section>;
}

function SettingsPage({ data, patch }: { data: PlannerData; patch: (data: Partial<PlannerData>) => void }) {
  return <ListPage title="Настройки"><div className="theme-grid">{["pink", "black", "blue", "beige", "white", "matcha"].map((theme) => <button key={theme} className={`theme-dot ${theme} ${data.theme === theme ? "selected" : ""}`} onClick={() => patch({ theme })}>{themeRu(theme)}</button>)}</div></ListPage>;
}

function QuickModal({ kind, data, setData, close }: { kind: NonNullable<ReturnType<typeof defaultModal>>; data: PlannerData; setData: React.Dispatch<React.SetStateAction<PlannerData>>; close: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("12:00");
  const [category, setCategory] = useState("Другое");
  const [dose, setDose] = useState("1 таблетка · после еды");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [amount, setAmount] = useState("0");
  const [financeType, setFinanceType] = useState<Transaction["type"]>("expense");
  const [note, setNote] = useState("");
  const [period, setPeriod] = useState<MedicationPeriod>("morning");

  function save() {
    const name = title.trim() || "Новое";
    setData((d) => {
      if (kind === "task") return { ...d, tasks: [...d.tasks, { id: uid("t"), title: name, date, time, completed: false, category, recurrence }] };
      if (kind === "deadline") return { ...d, deadlines: [...d.deadlines, { id: uid("d"), title: name, date, time, category, recurrence }] };
      if (kind === "event") return { ...d, events: [...d.events, { id: uid("e"), title: name, date, time, recurrence }] };
      if (kind === "med") return { ...d, medications: [...d.medications, { id: uid("m"), title: name, dose, time, period, recurrence, logs: {} }] };
      if (kind === "finance") return { ...d, transactions: [...d.transactions, { id: uid("f"), amount: Math.abs(Number(amount)), type: financeType, category, date, note }] };
      if (kind === "goal") return { ...d, goals: [...d.goals, { id: uid("g"), title: name, color: "#e8749b", taskIds: [] }] };
      return { ...d, habits: [...d.habits, { id: uid("h"), title: name, color: "#e8749b", logs: {} }] };
    });
    close();
  }

  return <div className="modal-backdrop"><div className="modal"><h2>Добавить</h2>{kind !== "finance" && <input placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} />}{kind === "finance" && <><select value={financeType} onChange={(e) => setFinanceType(e.target.value as Transaction["type"])}><option value="expense">Расход</option><option value="income">Доход</option></select><input aria-label="Сумма операции" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /><input placeholder="Комментарий" value={note} onChange={(e) => setNote(e.target.value)} /></>}{kind !== "goal" && kind !== "habit" && <><input type="date" value={date} onChange={(e) => setDate(e.target.value)} />{kind !== "finance" && <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />}</>}{kind === "med" && <><input placeholder="Дозировка и заметка" value={dose} onChange={(e) => setDose(e.target.value)} /><select value={period} onChange={(e) => setPeriod(e.target.value as MedicationPeriod)}><option value="morning">Утро</option><option value="evening">Вечер</option></select></>}{kind !== "goal" && kind !== "habit" && kind !== "med" && <select value={category} onChange={(e) => setCategory(e.target.value)}>{data.financeCategories.map((cat) => <option key={cat}>{cat}</option>)}</select>}{kind !== "goal" && kind !== "habit" && kind !== "finance" && <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>{recurrenceOptions()}</select>}<div className="modal-actions"><button onClick={close}>Отмена</button><button className="primary" onClick={save}>Сохранить</button></div></div></div>;
}

function MedicationRow({ med, setData }: { med: Medication; setData: React.Dispatch<React.SetStateAction<PlannerData>> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(med);

  function save() {
    setData((d) => ({ ...d, medications: d.medications.map((x) => x.id === med.id ? { ...draft, title: draft.title.trim() || x.title, dose: draft.dose.trim() || x.dose } : x) }));
    setEditing(false);
  }

  return <div className={`med-row ${med.logs[today] || ""}`}><b>{med.time}</b><div>{editing ? <EditGrid><label>Название<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label><label>Доза<input value={draft.dose} onChange={(e) => setDraft({ ...draft, dose: e.target.value })} /></label><label>Время<input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></label><label>Период<select value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value as MedicationPeriod })}><option value="morning">Утро</option><option value="evening">Вечер</option></select></label><label>Повтор<select value={draft.recurrence} onChange={(e) => setDraft({ ...draft, recurrence: e.target.value as Recurrence })}>{recurrenceOptions()}</select></label></EditGrid> : <><h3>{med.title}</h3><p>{med.dose} · {med.period === "morning" ? "утро" : "вечер"} · {recurrenceRu(med.recurrence)}</p>{med.logs[today] === "postponed" && <small>Отложено: не забыто</small>}</>}</div><div className="med-actions">{editing ? <button onClick={save}>Сохранить</button> : <button aria-label="Редактировать таблетку" onClick={() => { setDraft(med); setEditing(true); }}><Edit3 /></button>}<button onClick={() => logMed(setData, med.id, "taken")}>Приняла</button><button onClick={() => logMed(setData, med.id, "missed")}>Пропуск</button><button onClick={() => logMed(setData, med.id, "postponed")}>Отложено</button><button aria-label="Удалить таблетку" onClick={() => setData((d) => ({ ...d, medications: d.medications.filter((x) => x.id !== med.id) }))}><Trash2 /></button></div></div>;
}

function EditableRow({ title, meta, checked, tone, onCheck, onRename, onDelete }: { title: string; meta: string; checked?: boolean; tone?: string; onCheck?: () => void; onRename?: (title: string) => void; onDelete?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const save = () => {
    const next = draft.trim();
    if (next) onRename?.(next);
    setEditing(false);
  };

  return <div className={`editable-row ${tone || ""}`}>{onCheck && <button className="mini-check" onClick={onCheck}>{checked && <Check size={14} />}</button>}<div>{editing ? <input className="inline-title-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} autoFocus /> : <h3>{title}</h3>}<p>{meta}</p></div>{onRename && (editing ? <button aria-label="Сохранить" onClick={save}><Check /></button> : <button aria-label="Редактировать" onClick={() => setEditing(true)}><Edit3 /></button>)}{onDelete && <button aria-label="Удалить" onClick={onDelete}><Trash2 /></button>}</div>;
}

function ListPage({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="page-card"><h1>{title}</h1>{children}</section>;
}

function EditGrid({ children }: { children: React.ReactNode }) {
  return <div className="edit-grid">{children}</div>;
}

function logMed(setData: React.Dispatch<React.SetStateAction<PlannerData>>, id: string, status: MedicationLogStatus) {
  setData((d) => ({ ...d, medications: d.medications.map((med) => med.id === id ? { ...med, logs: { ...med.logs, [today]: status } } : med) }));
}

function toggleMedicationPeriodDay(setData: React.Dispatch<React.SetStateAction<PlannerData>>, period: MedicationPeriod, date: string, shouldTake: boolean) {
  setData((d) => ({
    ...d,
    medications: d.medications.map((med) => {
      if (med.period !== period) return med;
      const logs = { ...med.logs };
      if (shouldTake) logs[date] = "taken";
      else delete logs[date];
      return { ...med, logs };
    })
  }));
}

function dateRu(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function money(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

function recurrenceRu(value: Recurrence) {
  return { none: "без повтора", daily: "каждый день", weekly: "каждую неделю", monthly: "каждый месяц" }[value];
}

function recurrenceOptions() {
  return <>
    <option value="none">Без повтора</option>
    <option value="daily">Каждый день</option>
    <option value="weekly">Каждую неделю</option>
    <option value="monthly">Каждый месяц</option>
  </>;
}

function themeRu(theme: string) {
  return { pink: "розовая", black: "чёрная", blue: "голубая", beige: "бежевая", white: "белая", matcha: "матча" }[theme] || theme;
}
