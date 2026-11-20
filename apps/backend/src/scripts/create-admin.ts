import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

type StoredUser = {
  id: string;
  hostname: string;
  displayName: string;
  password: string;
  deviceId: string;
  role: "intern" | "admin";
  preferences: Record<string, string>;
};

type UsersFile = { users: StoredUser[] };

async function main(): Promise<void> {
  const hostname = process.env.ADMIN_HOSTNAME?.trim();
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!hostname || !displayName || !password) {
    throw new Error(
      [
        "Missing admin bootstrap configuration.",
        "Set ADMIN_HOSTNAME, ADMIN_DISPLAY_NAME, and ADMIN_PASSWORD.",
      ].join("\n"),
    );
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,127}$/.test(hostname)) {
    throw new Error("ADMIN_HOSTNAME must be a valid 2–128 character profile ID.");
  }
  if (displayName.length < 2 || displayName.length > 80) {
    throw new Error("ADMIN_DISPLAY_NAME must be between 2 and 80 characters.");
  }
  if (password.length < 12 || password.length > 1024) {
    throw new Error("ADMIN_PASSWORD must be between 12 and 1024 characters.");
  }

  const dataDirectory = path.resolve(
    process.env.BACKEND_DATA_DIR ?? path.join(process.cwd(), "data"),
  );
  const usersFilePath = path.join(dataDirectory, "users.json");
  await mkdir(dataDirectory, { recursive: true });

  let stored: UsersFile = { users: [] };
  try {
    stored = JSON.parse(await readFile(usersFilePath, "utf8")) as UsersFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  if (!Array.isArray(stored.users)) {
    throw new Error("users.json must contain a users array.");
  }
  if (stored.users.some((user) => user.role === "admin")) {
    throw new Error("An administrator already exists. Admin bootstrap is single-use.");
  }
  if (
    stored.users.some(
      (user) => user.hostname.toLowerCase() === hostname.toLowerCase(),
    )
  ) {
    throw new Error("ADMIN_HOSTNAME is already assigned to an existing profile.");
  }

  const admin: StoredUser = {
    id: randomUUID(),
    hostname,
    displayName,
    password,
    deviceId: hostname,
    role: "admin",
    preferences: {
      "utoolity.icon-size": "large",
      "utoolity.grain": "none",
      "utoolity.theme": "device",
      "utoolity.wallpaper": "Default",
    },
  };
  const temporaryPath = `${usersFilePath}.${process.pid}.${randomUUID()}.tmp`;

  await writeFile(
    temporaryPath,
    JSON.stringify({ users: [...stored.users, admin] }, null, 2) + "\n",
    { encoding: "utf8", flag: "wx" },
  );
  try {
    await rename(temporaryPath, usersFilePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }

  console.info(`Administrator profile created: ${hostname}`);
}

main().catch((error: unknown) => {
  console.error("Admin bootstrap failed:", error);
  process.exitCode = 1;
});
