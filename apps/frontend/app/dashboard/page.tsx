"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bug, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type DashboardData = {
  stats: {
    totalUsers: number;
    interns: number;
    admins: number;
    openIssues: number;
  };
  users: Array<{
    id: string;
    hostname: string;
    displayName: string;
    role: "intern" | "admin";
    passwordConfigured: boolean;
  }>;
  reports: Array<{
    id: string;
    appName: string;
    errorName: string;
    source: string;
    description: string;
    requestId: string;
    reportedAt: string;
    status: string;
  }>;
};

const statCards = [
  { key: "totalUsers", label: "Total users", icon: Users },
  { key: "interns", label: "Intern accounts", icon: Users },
  { key: "admins", label: "Administrators", icon: ShieldCheck },
  { key: "openIssues", label: "Open issue reports", icon: Bug },
] as const;

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api<DashboardData>("/api/admin/dashboard");
      setData(response);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="size-4" />
              Administrator
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage visibility into users and incoming issue reports.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <section aria-label="Workspace statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ key, label, icon: Icon }) => (
            <article key={key} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                <span className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <Icon className="size-4" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold tabular-nums">
                {loading ? "—" : (data?.stats[key] ?? 0).toLocaleString()}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
          <article className="min-w-0 rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">Registered users</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Accounts are created as interns by default. Admin accounts are bootstrapped separately.
              </p>
            </div>
            <div className="max-h-[32rem] overflow-auto">
              {loading && !data ? (
                <p className="p-5 text-sm text-muted-foreground">Loading users…</p>
              ) : data?.users.length ? (
                <ul className="divide-y divide-border">
                  {data.users.map((user) => (
                    <li key={user.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{user.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.hostname}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs capitalize text-muted-foreground">
                        {user.role}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-5 text-sm text-muted-foreground">No registered users.</p>
              )}
            </div>
          </article>

          <article className="min-w-0 rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">Recent issue reports</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Latest reports submitted from the application.
              </p>
            </div>
            <div className="max-h-[32rem] overflow-auto">
              {loading && !data ? (
                <p className="p-5 text-sm text-muted-foreground">Loading reports…</p>
              ) : data?.reports.length ? (
                <ul className="divide-y divide-border">
                  {data.reports.map((report) => (
                    <li key={report.id || report.requestId} className="space-y-2 px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{report.appName}</p>
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">
                          {report.status}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{report.errorName}</p>
                      {report.source && (
                        <p className="break-all font-mono text-xs text-muted-foreground">{report.source}</p>
                      )}
                      {report.description && (
                        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{report.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {report.requestId && <span>Request: {report.requestId}</span>}
                        {report.reportedAt && (
                          <time dateTime={report.reportedAt}>
                            {new Date(report.reportedAt).toLocaleString()}
                          </time>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-5 text-sm text-muted-foreground">No issue reports have been submitted.</p>
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
