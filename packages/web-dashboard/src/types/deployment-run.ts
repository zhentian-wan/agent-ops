export type LogLevel = "debug" | "info" | "warn" | "error";

export type StepStatus = "pending" | "running" | "success" | "failed" | "skipped";

export type RunStatus = "pending" | "running" | "success" | "failed";

export type LogEntry = {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  stepId?: string;
  pluginName?: string;
  details?: unknown;
};

export type RunStepRecord = {
  id: string;
  pluginName: string;
  status: StepStatus;
  startedAt?: string;
  finishedAt?: string;
};

export type DeploymentRun = {
  id: string;
  flowId: string;
  flowName: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  steps: RunStepRecord[];
  entries: LogEntry[];
};

export type RunLogsResponse = {
  runId: string;
  flowId: string;
  entries: LogEntry[];
};
