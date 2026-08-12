import PlannerApp from "@/components/planner-app";

const allowed = new Set([
  "today",
  "calendar",
  "events",
  "tasks",
  "plans",
  "habits",
  "medications",
  "finance",
  "deadlines",
  "goals",
  "settings"
]);

export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  const current = section?.[0] || "today";

  return <PlannerApp initialSection={allowed.has(current) ? current : "today"} />;
}
