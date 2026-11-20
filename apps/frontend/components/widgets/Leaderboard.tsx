"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Productivity = {
  role: string;
  attendance: { presentMs: number; activeMs: number; appUsageMs: Record<string, number> } | null;
  leaderboard: Array<{ userId: string; displayName: string; totalAppTimeMs: number }>;
};
function formatDuration(value: number): string {
  const minutes = Math.floor(Math.max(0, value) / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}
export default function Leaderboard() {
  const [data, setData] = useState<Productivity | null>(null);
  const load = useCallback(() => {
    void api<Productivity>("/api/auth/productivity").then(setData).catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
    const interval = window.setInterval(load, 60_000);
    return () => window.clearInterval(interval);
  }, [load]);
  const apps = Object.entries(data?.attendance?.appUsageMs ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (!data || data.role !== "intern") return null;
  return (
    <aside className="absolute right-5 top-5 z-30 w-72 max-w-[calc(100%-2.5rem)] overflow-hidden rounded-xl border border-border/70 bg-card/90 text-card-foreground shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div><p className="text-sm font-semibold">Team leaderboard</p><p className="text-xs text-muted-foreground">Today's app usage</p></div>
        <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">LIVE</span>
      </div>
      <div className="max-h-56 space-y-2 overflow-y-auto p-3">
        {data?.leaderboard.length ? data.leaderboard.map((person, index) => (
          <div key={person.userId} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <span className="w-5 text-center text-xs font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium">{person.displayName}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{formatDuration(person.totalAppTimeMs)}</span>
          </div>
        )) : <p className="px-2 py-3 text-xs text-muted-foreground">Usage rankings appear as interns use their apps.</p>}
      </div>
      <div className="border-t border-border px-4 py-3">
        <p className="text-xs font-semibold">Your app usage</p>
        {apps.length ? <div className="mt-2 space-y-2">{apps.map(([name, duration]) => (
          <div key={name} className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-muted-foreground">{name}</span><span className="shrink-0 tabular-nums">{formatDuration(duration)}</span></div>
        ))}</div> : <p className="mt-1 text-xs text-muted-foreground">No app time recorded yet.</p>}
      </div>
    </aside>
  );
}
