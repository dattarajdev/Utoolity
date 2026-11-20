import type { FastifyInstance, FastifyRequest } from "fastify";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

type SessionRequest = FastifyRequest & { session: { userId?: string } };
type User = { id: string; hostname: string; displayName: string; role: "intern" | "admin" };
type TaskStatus = "todo" | "in_progress" | "review" | "done";
type Task = {
  id: string; title: string; description: string; assigneeId: string;
  datasetPath: string; status: TaskStatus; createdBy: string;
  createdAt: string; updatedAt: string;
};
type DayRecord = {
  userId: string; date: string; firstLoginAt: string; lastSeenAt: string;
  lastAppClosedAt: string | null; presentMs: number; activeMs: number;
  appUsageMs: Record<string, number>; lastTickAt: number;
  lastState: string; openApps: string[];
};
type Store = { tasks: Task[]; attendance: Record<string, DayRecord> };
const dataDir = path.resolve(process.env.BACKEND_DATA_DIR ?? path.join(process.cwd(), "data"));
const storePath = path.join(dataDir, "work-management.json");
let writeQueue: Promise<void> = Promise.resolve();

async function readStore(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(storePath, "utf8")) as Partial<Store>;
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      attendance: parsed.attendance && typeof parsed.attendance === "object" ? parsed.attendance : {},
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { tasks: [], attendance: {} };
  }
}
async function updateStore(mutator: (store: Store) => void): Promise<void> {
  const operation = writeQueue.then(async () => {
    const store = await readStore();
    mutator(store);
    await mkdir(dataDir, { recursive: true });
    const temp = `${storePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    await writeFile(temp, `${JSON.stringify(store, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    try { await rename(temp, storePath); }
    catch (error) { await unlink(temp).catch(() => undefined); throw error; }
  });
  writeQueue = operation.catch(() => undefined);
  await operation;
}

async function getUsers(): Promise<User[]> {
  const raw = JSON.parse(await readFile(path.join(dataDir, "users.json"), "utf8")) as { users?: User[] };
  return Array.isArray(raw.users) ? raw.users : [];
}
function dayKey(now: Date): string { return now.toISOString().slice(0, 10); }
function validStatus(value: unknown): value is TaskStatus {
  return value === "todo" || value === "in_progress" || value === "review" || value === "done";
}
function safeApps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.slice(0, 30).map((entry) => {
    if (typeof entry === "string") return entry.slice(0, 80);
    if (entry && typeof entry === "object" && "app" in entry && typeof entry.app === "string") return entry.app.slice(0, 80);
    return "";
  }).filter(Boolean))];
}
function isAdmin(user: User | undefined): boolean { return user?.role === "admin"; }

export default async function workRoutes(app: FastifyInstance) {
  app.post<{ Body: { shellState?: unknown; openApps?: unknown } }>("/auth/telemetry", async (request, reply) => {
    const userId = (request as SessionRequest).session.userId;
    if (!userId) return reply.code(401).send({ message: "Not authenticated." });
    const shellState = request.body?.shellState;
    if (!["authenticated", "sleep", "locked"].includes(String(shellState))) {
      return reply.code(400).send({ message: "Invalid desktop state." });
    }
    const users = await getUsers();
    const user = users.find((entry) => entry.id === userId);
    if (!user) return reply.code(401).send({ message: "Session user no longer exists." });
    const now = Date.now();
    const date = dayKey(new Date(now));
    const key = `${userId}:${date}`;
    const apps = shellState === "authenticated" ? safeApps(request.body?.openApps) : [];
    await updateStore((store) => {
      const previous = store.attendance[key];
      const elapsed = previous ? Math.max(0, Math.min(now - previous.lastTickAt, 45_000)) : 0;
      const wasWorking = previous?.lastState === "authenticated" && previous.openApps.length > 0;
      const wasPresent = previous?.lastState === "authenticated" || previous?.lastState === "sleep" || previous?.lastState === "locked";
      const record: DayRecord = previous ?? {
        userId, date, firstLoginAt: new Date(now).toISOString(), lastSeenAt: new Date(now).toISOString(),
        lastAppClosedAt: null, presentMs: 0, activeMs: 0, appUsageMs: {}, lastTickAt: now,
        lastState: String(shellState), openApps: [],
      };
      if (previous && wasPresent) record.presentMs += elapsed;
      if (previous && wasWorking) {
        record.activeMs += elapsed;
        for (const appName of previous.openApps) record.appUsageMs[appName] = (record.appUsageMs[appName] ?? 0) + elapsed;
      }
      if (previous?.openApps.length && apps.length === 0) record.lastAppClosedAt = new Date(now).toISOString();
      record.lastSeenAt = new Date(now).toISOString();
      record.lastTickAt = now;
      record.lastState = String(shellState);
      record.openApps = apps;
      store.attendance[key] = record;
    });
    return { success: true };
  });

  app.get("/tasks", async (request, reply) => {
    const userId = (request as SessionRequest).session.userId;
    if (!userId) return reply.code(401).send({ message: "Not authenticated." });
    const users = await getUsers();
    const user = users.find((entry) => entry.id === userId);
    if (!user) return reply.code(401).send({ message: "Session user no longer exists." });
    const store = await readStore();
    return { tasks: user.role === "admin" ? store.tasks : store.tasks.filter((task) => task.assigneeId === userId) };
  });

  app.get("/auth/productivity", async (request, reply) => {
    const userId = (request as SessionRequest).session.userId;
    if (!userId) return reply.code(401).send({ message: "Not authenticated." });
    const store = await readStore();
    const date = dayKey(new Date());
    const own = store.attendance[`${userId}:${date}`] ?? null;
    const users = await getUsers();
    const leaderboard = users.filter((user) => user.role === "intern").map((user) => {
      const record = store.attendance[`${user.id}:${date}`];
      const totalAppTimeMs = Object.values(record?.appUsageMs ?? {}).reduce((sum, value) => sum + value, 0);
      return { userId: user.id, displayName: user.displayName, totalAppTimeMs };
    }).sort((a, b) => b.totalAppTimeMs - a.totalAppTimeMs);
    return {
      attendance: own ? { ...own, presentMs: own.presentMs + (own.lastState ? Math.max(0, Math.min(Date.now() - own.lastTickAt, 45_000)) : 0) } : null,
      leaderboard,
    };
  });

  app.get("/admin/work-management", async (request, reply) => {
    const userId = (request as SessionRequest).session.userId;
    if (!userId) return reply.code(401).send({ message: "Not authenticated." });
    const users = await getUsers();
    if (!isAdmin(users.find((user) => user.id === userId))) return reply.code(403).send({ message: "Administrator access required." });
    const store = await readStore();
    const date = dayKey(new Date());
    const attendance = users.filter((user) => user.role === "intern").map((user) => {
      const record = store.attendance[`${user.id}:${date}`] ?? null;
      return { userId: user.id, displayName: user.displayName, hostname: user.hostname, ...(record ?? {}) };
    });
    return { tasks: store.tasks, attendance, interns: users.filter((user) => user.role === "intern").map(({ id, displayName, hostname }) => ({ id, displayName, hostname })) };
  });

  app.post<{ Body: { title?: unknown; description?: unknown; assigneeId?: unknown; datasetPath?: unknown } }>("/admin/tasks", async (request, reply) => {
    const userId = (request as SessionRequest).session.userId;
    if (!userId) return reply.code(401).send({ message: "Not authenticated." });
    const users = await getUsers();
    if (!isAdmin(users.find((user) => user.id === userId))) return reply.code(403).send({ message: "Administrator access required." });
    const title = typeof request.body?.title === "string" ? request.body.title.trim() : "";
    const description = typeof request.body?.description === "string" ? request.body.description.trim() : "";
    const assigneeId = typeof request.body?.assigneeId === "string" ? request.body.assigneeId : "";
    const datasetPath = typeof request.body?.datasetPath === "string" ? request.body.datasetPath.trim().slice(0, 1024) : "";
    if (title.length < 2 || title.length > 120 || description.length > 2000 || !users.some((user) => user.id === assigneeId && user.role === "intern")) {
      return reply.code(400).send({ message: "Enter a valid title and select a registered intern." });
    }
    const now = new Date().toISOString();
    const task: Task = { id: randomUUID(), title, description, assigneeId, datasetPath, status: "todo", createdBy: userId, createdAt: now, updatedAt: now };
    await updateStore((store) => { store.tasks.push(task); });
    return reply.code(201).send({ task });
  });

  app.patch<{ Params: { taskId: string }; Body: { status?: unknown } }>("/tasks/:taskId", async (request, reply) => {
    const userId = (request as SessionRequest).session.userId;
    if (!userId) return reply.code(401).send({ message: "Not authenticated." });
    if (!validStatus(request.body?.status)) return reply.code(400).send({ message: "Invalid task status." });
    const users = await getUsers();
    const user = users.find((entry) => entry.id === userId);
    if (!user) return reply.code(401).send({ message: "Session user no longer exists." });
    let updatedTask: Task | undefined;
    await updateStore((store) => {
      const task = store.tasks.find((entry) => entry.id === request.params.taskId);
      if (!task) return;
      task.status = request.body.status as TaskStatus;
      task.updatedAt = new Date().toISOString();
      updatedTask = task;
    });
    if (!updatedTask) return reply.code(404).send({ message: "Task not found." });
    return { task: updatedTask };
  });
}
