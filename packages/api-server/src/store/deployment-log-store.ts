import { randomUUID } from "node:crypto";

import {
  createDeploymentLogIo,
  getDefaultLogsDataDir,
  type DeploymentLogIo,
} from "../io/deployment-log-io.js";
import type {
  CreateLogEntryInput,
  DeploymentRun,
  LogEntry,
  RunStatus,
  RunStepRecord,
  StepStatus,
} from "../types/deployment-run.js";

export type LogStoreError = {
  code: "RUN_NOT_FOUND" | "IO_ERROR" | "INVALID_STORED_RUN";
  cause?: unknown;
  message: string;
  runId?: string;
};

export type LogStoreResult<T> =
  | { success: true; data: T }
  | { success: false; error: LogStoreError };

export type DeploymentLogStore = {
  appendEntry: (
    runId: string,
    input: CreateLogEntryInput,
  ) => Promise<LogStoreResult<LogEntry>>;
  createRun: (input: {
    flowId: string;
    flowName: string;
    steps: Array<{ id: string; pluginName: string }>;
  }) => Promise<LogStoreResult<DeploymentRun>>;
  finalizeRun: (
    runId: string,
    status: RunStatus,
  ) => Promise<LogStoreResult<DeploymentRun>>;
  getRun: (runId: string) => Promise<LogStoreResult<DeploymentRun | null>>;
  listRunsByFlowId: (flowId: string) => Promise<LogStoreResult<DeploymentRun[]>>;
  updateStepStatus: (
    runId: string,
    stepId: string,
    status: StepStatus,
  ) => Promise<LogStoreResult<DeploymentRun>>;
};

export type CreateDeploymentLogStoreOptions = {
  dataDir?: string;
  io?: DeploymentLogIo;
};

function createLogStoreError(
  code: LogStoreError["code"],
  message: string,
  options?: Pick<LogStoreError, "runId" | "cause">,
): LogStoreError {
  return {
    code,
    message,
    ...options,
  };
}

function mapIoError(error: {
  code: LogStoreError["code"];
  message: string;
  runId?: string;
  cause?: unknown;
}): LogStoreError {
  return createLogStoreError(error.code, error.message, {
    runId: error.runId,
    cause: error.cause,
  });
}

export async function createDeploymentLogStore(
  options: CreateDeploymentLogStoreOptions = {},
): Promise<DeploymentLogStore> {
  const dataDir = options.dataDir ?? getDefaultLogsDataDir();
  const io = options.io ?? createDeploymentLogIo(dataDir);

  const ensureResult = await io.ensureDataDirectory();

  if (!ensureResult.success) {
    throw new Error(ensureResult.error.message);
  }

  async function readRunOrError(
    runId: string,
  ): Promise<LogStoreResult<DeploymentRun>> {
    const readResult = await io.read(runId);

    if (!readResult.success) {
      return {
        success: false,
        error: mapIoError(readResult.error),
      };
    }

    if (!readResult.data) {
      return {
        success: false,
        error: createLogStoreError(
          "RUN_NOT_FOUND",
          `Deployment run '${runId}' not found`,
          { runId },
        ),
      };
    }

    return { success: true, data: readResult.data };
  }

  return {
    async createRun(input) {
      const now = new Date().toISOString();
      const steps: RunStepRecord[] = input.steps.map((step) => ({
        id: step.id,
        pluginName: step.pluginName,
        status: "pending",
      }));

      const run: DeploymentRun = {
        id: randomUUID(),
        flowId: input.flowId,
        flowName: input.flowName,
        status: "pending",
        startedAt: now,
        steps,
        entries: [
          {
            id: randomUUID(),
            timestamp: now,
            level: "info",
            message: `Created deployment run for flow '${input.flowName}'`,
          },
        ],
      };

      const writeResult = await io.write(run);

      if (!writeResult.success) {
        return {
          success: false,
          error: mapIoError(writeResult.error),
        };
      }

      return { success: true, data: run };
    },

    async getRun(runId) {
      const readResult = await io.read(runId);

      if (!readResult.success) {
        return {
          success: false,
          error: mapIoError(readResult.error),
        };
      }

      return { success: true, data: readResult.data };
    },

    async listRunsByFlowId(flowId) {
      const listResult = await io.listByFlowId(flowId);

      if (!listResult.success) {
        return {
          success: false,
          error: mapIoError(listResult.error),
        };
      }

      return { success: true, data: listResult.data };
    },

    async appendEntry(runId, input) {
      const runResult = await readRunOrError(runId);

      if (!runResult.success) {
        return runResult;
      }

      const entry: LogEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        level: input.level,
        message: input.message,
        ...(input.stepId !== undefined ? { stepId: input.stepId } : {}),
        ...(input.pluginName !== undefined ? { pluginName: input.pluginName } : {}),
        ...(input.details !== undefined ? { details: input.details } : {}),
      };

      const updated: DeploymentRun = {
        ...runResult.data,
        entries: [...runResult.data.entries, entry],
      };

      const writeResult = await io.write(updated);

      if (!writeResult.success) {
        return {
          success: false,
          error: mapIoError(writeResult.error),
        };
      }

      return { success: true, data: entry };
    },

    async updateStepStatus(runId, stepId, status) {
      const runResult = await readRunOrError(runId);

      if (!runResult.success) {
        return runResult;
      }

      const now = new Date().toISOString();
      let stepFound = false;

      const steps = runResult.data.steps.map((step) => {
        if (step.id !== stepId) {
          return step;
        }

        stepFound = true;

        if (status === "running") {
          return {
            ...step,
            status,
            startedAt: now,
          };
        }

        if (status === "success" || status === "failed" || status === "skipped") {
          return {
            ...step,
            status,
            finishedAt: now,
          };
        }

        return {
          ...step,
          status,
        };
      });

      if (!stepFound) {
        return {
          success: false,
          error: createLogStoreError(
            "RUN_NOT_FOUND",
            `Step '${stepId}' not found in run '${runId}'`,
            { runId },
          ),
        };
      }

      const updated: DeploymentRun = {
        ...runResult.data,
        status: runResult.data.status === "pending" ? "running" : runResult.data.status,
        steps,
      };

      const writeResult = await io.write(updated);

      if (!writeResult.success) {
        return {
          success: false,
          error: mapIoError(writeResult.error),
        };
      }

      return { success: true, data: updated };
    },

    async finalizeRun(runId, status) {
      const runResult = await readRunOrError(runId);

      if (!runResult.success) {
        return runResult;
      }

      const updated: DeploymentRun = {
        ...runResult.data,
        status,
        finishedAt: new Date().toISOString(),
      };

      const writeResult = await io.write(updated);

      if (!writeResult.success) {
        return {
          success: false,
          error: mapIoError(writeResult.error),
        };
      }

      return { success: true, data: updated };
    },
  };
}
