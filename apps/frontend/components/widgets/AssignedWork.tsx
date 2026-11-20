"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
type Task = { id: string; title: string; description: string; datasetPath: string; status: "todo" | "in_progress" | "review" | "done" };
const nextStatus: Record<Task["status"], Task["status"]> = { todo: "in_progress", in_progress: "review", review: "done", done: "todo" };
export default function AssignedWork() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isIntern, setIsIntern] = useState(false);
  const load = useCallback(() => { void api<{ role: string; tasks: Task[] }>("/api/tasks").then((result) => { setIsIntern(result.role === "intern"); setTasks(result.tasks); }).catch(() => undefined); }, []);
  useEffect(() => { load(); const interval = window.setInterval(load, 60_000); return () => window.clearInterval(interval); }, [load]);
  const update = async (task: Task) => {
    const status = nextStatus[task.status];
    await api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
  };
  if (!isIntern) return null;
  return (
    <aside className="absolute bottom-5 right-5 z-30 w-72 max-w-[calc(100%-2.5rem)] overflow-hidden rounded-xl border border-border/70 bg-card/90 text-card-foreground shadow-xl backdrop-blur-xl">
      <div className="border-b border-border px-4 py-3"><p className="text-sm font-semibold">Assigned work</p><p className="text-xs text-muted-foreground">{tasks.length} tasks assigned to you</p></div>
      <div className="max-h-64 space-y-2 overflow-y-auto p-3">
        {tasks.filter((task) => task.status !== "done").length ? tasks.filter((task) => task.status !== "done").map((task) => (
          <div key={task.id} className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold">{task.title}</p>
            {task.description && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{task.description}</p>}
            {task.datasetPath && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("utoolity:open-assigned-dataset", { detail: { path: task.datasetPath } }))} className="mt-2 block max-w-full truncate text-[11px] font-semibold text-primary hover:underline">Open assigned dataset</button>}
            <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] capitalize text-muted-foreground">{task.status.replace("_", " ")}</span><button type="button" onClick={() => void update(task)} className="text-[11px] font-semibold text-primary hover:underline">{task.status === "review" ? "Complete" : "Move forward"}</button></div>
          </div>
        )) : <p className="px-2 py-3 text-xs text-muted-foreground">No open tasks assigned.</p>}
      </div>
    </aside>
  );
}
