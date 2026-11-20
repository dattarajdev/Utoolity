"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, Bug, Clock3, Plus, RefreshCw, ShieldCheck, Users, Activity, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type User = { id: string; hostname: string; displayName: string; role: "intern" | "admin"; passwordConfigured: boolean };
type Report = { id: string; appName: string; errorName: string; source: string; description: string; requestId: string; reportedAt: string; status: string };
type TaskStatus = "todo" | "in_progress" | "review" | "done";
type Task = { id: string; title: string; description: string; assigneeId: string; datasetPath: string; status: TaskStatus; createdAt: string; updatedAt: string };
type Attendance = { userId: string; displayName: string; hostname: string; date?: string; firstLoginAt?: string; lastSeenAt?: string; lastAppClosedAt?: string | null; presentMs?: number; activeMs?: number; appUsageMs?: Record<string, number> };
type DashboardData = { stats: { totalUsers: number; interns: number; admins: number; openIssues: number }; users: User[]; reports: Report[] };
type WorkData = { tasks: Task[]; attendance: Attendance[]; interns: Array<{ id: string; displayName: string; hostname: string }> };

const FileManager = dynamic(() => import("@/components/files/FileManager"), { ssr: false });

const columns: Array<{ status: TaskStatus; title: string }> = [
  { status: "todo", title: "To do" },
  { status: "in_progress", title: "In progress" },
  { status: "review", title: "Review" },
  { status: "done", title: "Completed" },
];
const formatDuration = (value = 0) => {
  const minutes = Math.floor(Math.max(0, value) / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
};
const formatClock = (value?: string | null) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [work, setWork] = useState<WorkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIntern, setSelectedIntern] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [datasetPath, setDatasetPath] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboard, workManagement] = await Promise.all([
        api<DashboardData>("/api/admin/dashboard"),
        api<WorkData>("/api/admin/work-management"),
      ]);
      setData(dashboard);
      setWork(workManagement);
      setSelectedIntern((current) => current || workManagement.interns[0]?.id || "");
      setAssigneeId((current) => current || workManagement.interns[0]?.id || "");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const selectedAttendance = work?.attendance.find((item) => item.userId === selectedIntern);
  const totals = useMemo(() => {
    const rows = work?.attendance ?? [];
    const present = rows.reduce((sum, row) => sum + (row.presentMs ?? 0), 0);
    const active = rows.reduce((sum, row) => sum + (row.activeMs ?? 0), 0);
    return { present, active, efficiency: present > 0 ? Math.round((active / present) * 100) : 0 };
  }, [work]);
  const createTask = async () => {
    if (title.trim().length < 2 || !assigneeId) return;
    setSaving(true);
    try {
      await api("/api/admin/tasks", { method: "POST", body: JSON.stringify({ title, description, assigneeId, datasetPath }) });
      setTitle(""); setDescription(""); setDatasetPath(""); setCreateOpen(false);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to assign work.");
    } finally { setSaving(false); }
  };
  const moveTask = async (task: Task, status: TaskStatus) => {
    try {
      await api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setWork((current) => current ? { ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, status } : item) } : current);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to update task.");
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-7 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[1500px] space-y-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground"><ShieldCheck className="size-4" /> Administrator workspace</div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Work allocation, attendance and application wellbeing.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"><RefreshCw className={cn("size-4", loading && "animate-spin")} /> Refresh</button>
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="size-4" /> Assign work</button>
          </div>
        </header>

        {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>{error}</p></div>}

        <section aria-label="Today's overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Registered interns", value: data?.stats.interns ?? 0, icon: Users, note: `${data?.stats.totalUsers ?? 0} total profiles` },
            { label: "Tasks in progress", value: work?.tasks.filter((task) => task.status === "in_progress").length ?? 0, icon: CheckCircle2, note: `${work?.tasks.length ?? 0} assigned tasks` },
            { label: "Total app working time", value: formatDuration(totals.active), icon: Activity, note: `${formatDuration(totals.present)} total present time` },
            { label: "Overall work efficiency", value: `${totals.efficiency}%`, icon: Clock3, note: "App working time ÷ present time" },
          ].map(({ label, value, icon: Icon, note }) => (
            <article key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><span className="rounded-lg bg-muted p-2 text-muted-foreground"><Icon className="size-4" /></span></div>
              <p className="mt-4 text-3xl font-semibold tabular-nums">{loading ? "—" : value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
            </article>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Work kanban</h2><p className="text-sm text-muted-foreground">Track assignments across the intern team.</p></div><span className="text-xs text-muted-foreground">{work?.tasks.length ?? 0} tasks</span></div>
          <div className="grid gap-3 xl:grid-cols-4">
            {columns.map((column) => {
              const tasks = work?.tasks.filter((task) => task.status === column.status) ?? [];
              return <section key={column.status} className="min-w-0 rounded-xl border border-border bg-muted/30 p-3">
                <div className="mb-3 flex items-center justify-between px-1"><h3 className="text-sm font-semibold">{column.title}</h3><span className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{tasks.length}</span></div>
                <div className="space-y-2">
                  {tasks.map((task) => <article key={task.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                    <p className="text-sm font-semibold">{task.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{work?.interns.find((intern) => intern.id === task.assigneeId)?.displayName ?? "Unassigned"}</p>
                    {task.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
                    {task.datasetPath && <p className="mt-2 truncate rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">Dataset · {task.datasetPath}</p>}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {columns.filter((item) => item.status !== column.status).map((item) => <button key={item.status} type="button" onClick={() => void moveTask(task, item.status)} className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent">{item.title}</button>)}
                    </div>
                  </article>)}
                  {!tasks.length && <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">No tasks</p>}
                </div>
              </section>;
            })}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Intern attendance</h2><p className="mt-1 text-sm text-muted-foreground">First login, last app close and daily time accounting.</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Intern</th><th className="px-3 py-3 font-medium">First login</th><th className="px-3 py-3 font-medium">Last app close</th><th className="px-3 py-3 font-medium">Present</th><th className="px-3 py-3 font-medium">Working</th><th className="px-3 py-3 font-medium">Efficiency</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {(work?.attendance ?? []).map((row) => { const present = row.presentMs ?? 0; const active = row.activeMs ?? 0; const efficiency = present ? Math.round(active / present * 100) : 0; return <tr key={row.userId} className={cn("cursor-pointer hover:bg-muted/40", selectedIntern === row.userId && "bg-muted/50")} onClick={() => setSelectedIntern(row.userId)}>
                    <td className="px-5 py-3"><p className="font-medium">{row.displayName}</p><p className="text-xs text-muted-foreground">{row.hostname}</p></td>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">{formatClock(row.firstLoginAt)}</td><td className="px-3 py-3 tabular-nums text-muted-foreground">{formatClock(row.lastAppClosedAt)}</td><td className="px-3 py-3 tabular-nums">{formatDuration(present)}</td><td className="px-3 py-3 tabular-nums">{formatDuration(active)}</td><td className="px-3 py-3 tabular-nums">{efficiency}%</td>
                  </tr>; })}
                </tbody>
              </table>
              {!work?.attendance.length && <p className="p-6 text-sm text-muted-foreground">No intern activity has been recorded today.</p>}
            </div>
          </article>

          <article className="min-w-0 rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="font-semibold">Digital wellbeing</h2><p className="mt-1 text-sm text-muted-foreground">Per-app usage for the selected intern.</p></div><select aria-label="Select intern" value={selectedIntern} onChange={(event) => setSelectedIntern(event.target.value)} className="h-9 max-w-40 rounded-lg border border-border bg-background px-2 text-xs">{(work?.interns ?? []).map((intern) => <option key={intern.id} value={intern.id}>{intern.displayName}</option>)}</select></div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Present time</p><p className="mt-1 text-xl font-semibold tabular-nums">{formatDuration(selectedAttendance?.presentMs)}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">App working time</p><p className="mt-1 text-xl font-semibold tabular-nums">{formatDuration(selectedAttendance?.activeMs)}</p></div></div>
              <div className="space-y-3">
                {Object.entries(selectedAttendance?.appUsageMs ?? {}).sort((a, b) => b[1] - a[1]).map(([appName, duration]) => { const total = selectedAttendance?.activeMs ?? 0; const percent = total ? Math.round(duration / total * 100) : 0; return <div key={appName}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-medium">{appName}</span><span className="tabular-nums text-muted-foreground">{formatDuration(duration)} · {percent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, percent)}%` }} /></div></div>; })}
                {!Object.keys(selectedAttendance?.appUsageMs ?? {}).length && <p className="py-5 text-center text-sm text-muted-foreground">No application usage recorded for this intern today.</p>}
              </div>
              <div className="border-t border-border pt-3 text-xs text-muted-foreground"><p>Last activity: {selectedAttendance?.lastSeenAt ? new Date(selectedAttendance.lastSeenAt).toLocaleString() : "—"}</p><p className="mt-1">Last app close: {selectedAttendance?.lastAppClosedAt ? new Date(selectedAttendance.lastAppClosedAt).toLocaleString() : "—"}</p></div>
            </div>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4"><div className="flex items-center gap-2"><Bug className="size-4 text-muted-foreground" /><h2 className="font-semibold">Recent issue reports</h2></div></div>
          <div className="divide-y divide-border">
            {(data?.reports ?? []).slice(0, 8).map((report) => <div key={report.id || report.requestId} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3"><div className="min-w-0"><p className="text-sm font-medium">{report.appName} · {report.errorName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{report.description || report.source}</p></div><span className="text-xs text-muted-foreground">{report.reportedAt ? new Date(report.reportedAt).toLocaleString() : report.status}</span></div>)}
            {!data?.reports.length && <p className="p-5 text-sm text-muted-foreground">No issue reports have been submitted.</p>}
          </div>
        </section>
      </div>

      {createOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="assign-work-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3"><div><h2 id="assign-work-title" className="text-lg font-semibold">Assign work</h2><p className="mt-1 text-sm text-muted-foreground">Create an assignment and attach an uploaded dataset.</p></div><button type="button" onClick={() => setCreateOpen(false)} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted">Close</button></div>
          <div className="mt-5 space-y-4">
            <label className="block space-y-1.5"><span className="text-sm font-medium">Work title</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="e.g. Annotate vehicle images" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
            <label className="block space-y-1.5"><span className="text-sm font-medium">Instructions</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} placeholder="Describe the expected work..." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
            <label className="block space-y-1.5"><span className="text-sm font-medium">Assign to intern</span><select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{(work?.interns ?? []).map((intern) => <option key={intern.id} value={intern.id}>{intern.displayName} · {intern.hostname}</option>)}</select></label>
            <div className="space-y-2"><span className="text-sm font-medium">Dataset</span><div className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{datasetPath || "No dataset selected"}</span><button type="button" onClick={() => setFilePickerOpen(true)} className="h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-accent">Upload / select</button></div><p className="text-xs text-muted-foreground">Uses the existing File Manager upload and storage workflow.</p></div>
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="h-10 rounded-lg border border-border px-4 text-sm hover:bg-accent">Cancel</button><button type="button" onClick={() => void createTask()} disabled={saving || title.trim().length < 2 || !assigneeId} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Assigning…" : "Assign work"}</button></div>
        </section>
      </div>}

      {filePickerOpen && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"><section className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"><div className="flex items-center justify-between border-b border-border px-5 py-3"><h2 className="font-semibold">Choose dataset</h2><button type="button" onClick={() => setFilePickerOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">Close</button></div><div className="min-h-0 flex-1 overflow-y-auto"><FileManager onOpenFile={(path) => { setDatasetPath(path); setFilePickerOpen(false); }} /></div></section></div>}
    </div>
  );
}
