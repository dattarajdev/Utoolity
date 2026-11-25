import type { ReactNode } from "react";

export type TaskStatus = "active" | "ready" | "external";

export interface AugmentationTask {
  id: string;
  taskNumber: string;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  isAssignedToUs: boolean;
  status: TaskStatus;
  statusLabel: string;
  color: string;
  icon: ReactNode;
  capabilities: string[];
}
