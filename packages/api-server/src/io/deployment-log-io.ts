import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { DeploymentRun } from "../types/deployment-run.js";

const RUN_FILE_EXTENSION = ".json";

export type DeploymentLogIoError = {
  code: "IO_ERROR" | "INVALID_STORED_RUN";
  cause?: unknown;
  message: string;
  runId?: string;
};

export type DeploymentLogIoResult<T> =
  | { success: true; data: T }
  | { success: false; error: DeploymentLogIoError };

export type DeploymentLogIo = {
  delete: (runId: string) => Promise<DeploymentLogIoResult<void>>;
  ensureDataDirectory: () => Promise<DeploymentLogIoResult<void>>;
  exists: (runId: string) => Promise<boolean>;
  list: () => Promise<DeploymentLogIoResult<DeploymentRun[]>>;
  listByFlowId: (flowId: string) => Promise<DeploymentLogIoResult<DeploymentRun[]>>;
  read: (runId: string) => Promise<DeploymentLogIoResult<DeploymentRun | null>>;
  write: (run: DeploymentRun) => Promise<DeploymentLogIoResult<void>>;
};

function createIoError(
  code: DeploymentLogIoError["code"],
  message: string,
  options?: Pick<DeploymentLogIoError, "runId" | "cause">,
): DeploymentLogIoError {
  return {
    code,
    message,
    ...options,
  };
}

function isSafeId(id: string): boolean {
  return id.length > 0 && !id.includes("/") && !id.includes("\\") && id !== "." && id !== "..";
}

function getRunFilePath(dataDir: string, runId: string): string {
  if (!isSafeId(runId)) {
    throw new Error(`Invalid run id '${runId}'`);
  }

  return path.join(dataDir, `${runId}${RUN_FILE_EXTENSION}`);
}

function parseStoredRun(
  raw: string,
  runId: string,
): DeploymentLogIoResult<DeploymentRun> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    return {
      success: false,
      error: createIoError(
        "INVALID_STORED_RUN",
        `Failed to parse deployment run '${runId}'`,
        { runId, cause },
      ),
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {
      success: false,
      error: createIoError(
        "INVALID_STORED_RUN",
        `Deployment run '${runId}' must be a JSON object`,
        { runId },
      ),
    };
  }

  const candidate = parsed as Record<string, unknown>;

  if (typeof candidate.id !== "string" || candidate.id !== runId) {
    return {
      success: false,
      error: createIoError(
        "INVALID_STORED_RUN",
        `Deployment run file '${runId}' has a mismatched id`,
        { runId },
      ),
    };
  }

  if (typeof candidate.flowId !== "string" || candidate.flowId.trim() === "") {
    return {
      success: false,
      error: createIoError(
        "INVALID_STORED_RUN",
        `Deployment run '${runId}' must have a flowId`,
        { runId },
      ),
    };
  }

  if (typeof candidate.flowName !== "string" || candidate.flowName.trim() === "") {
    return {
      success: false,
      error: createIoError(
        "INVALID_STORED_RUN",
        `Deployment run '${runId}' must have a flowName`,
        { runId },
      ),
    };
  }

  if (typeof candidate.status !== "string") {
    return {
      success: false,
      error: createIoError(
        "INVALID_STORED_RUN",
        `Deployment run '${runId}' must have a status`,
        { runId },
      ),
    };
  }

  if (typeof candidate.startedAt !== "string") {
    return {
      success: false,
      error: createIoError(
        "INVALID_STORED_RUN",
        `Deployment run '${runId}' must have a startedAt timestamp`,
        { runId },
      ),
    };
  }

  if (!Array.isArray(candidate.steps) || !Array.isArray(candidate.entries)) {
    return {
      success: false,
      error: createIoError(
        "INVALID_STORED_RUN",
        `Deployment run '${runId}' must have steps and entries arrays`,
        { runId },
      ),
    };
  }

  return {
    success: true,
    data: candidate as DeploymentRun,
  };
}

export function getDefaultLogsDataDir(): string {
  return path.join(process.cwd(), "data", "logs");
}

export function createDeploymentLogIo(dataDir: string): DeploymentLogIo {
  return {
    async ensureDataDirectory() {
      try {
        await mkdir(dataDir, { recursive: true });
        return { success: true, data: undefined };
      } catch (cause) {
        return {
          success: false,
          error: createIoError(
            "IO_ERROR",
            `Failed to create logs directory '${dataDir}'`,
            { cause },
          ),
        };
      }
    },

    async exists(runId) {
      if (!isSafeId(runId)) {
        return false;
      }

      try {
        await readFile(getRunFilePath(dataDir, runId), "utf8");
        return true;
      } catch (cause) {
        const error = cause as NodeJS.ErrnoException;

        if (error.code === "ENOENT") {
          return false;
        }

        throw cause;
      }
    },

    async read(runId) {
      if (!isSafeId(runId)) {
        return {
          success: false,
          error: createIoError(
            "INVALID_STORED_RUN",
            `Invalid deployment run id '${runId}'`,
            { runId },
          ),
        };
      }

      try {
        const raw = await readFile(getRunFilePath(dataDir, runId), "utf8");
        const parsed = parseStoredRun(raw, runId);

        if (!parsed.success) {
          return parsed;
        }

        return { success: true, data: parsed.data };
      } catch (cause) {
        const error = cause as NodeJS.ErrnoException;

        if (error.code === "ENOENT") {
          return { success: true, data: null };
        }

        return {
          success: false,
          error: createIoError(
            "IO_ERROR",
            `Failed to read deployment run '${runId}'`,
            { runId, cause },
          ),
        };
      }
    },

    async write(run) {
      if (!isSafeId(run.id)) {
        return {
          success: false,
          error: createIoError(
            "INVALID_STORED_RUN",
            `Invalid deployment run id '${run.id}'`,
            { runId: run.id },
          ),
        };
      }

      const filePath = getRunFilePath(dataDir, run.id);
      const tempFilePath = `${filePath}.tmp`;
      const payload = `${JSON.stringify(run, null, 2)}\n`;

      try {
        await writeFile(tempFilePath, payload, "utf8");
        await rename(tempFilePath, filePath);
        return { success: true, data: undefined };
      } catch (cause) {
        try {
          await unlink(tempFilePath);
        } catch {
          // Ignore cleanup errors.
        }

        return {
          success: false,
          error: createIoError(
            "IO_ERROR",
            `Failed to write deployment run '${run.id}'`,
            { runId: run.id, cause },
          ),
        };
      }
    },

    async delete(runId) {
      if (!isSafeId(runId)) {
        return {
          success: false,
          error: createIoError(
            "INVALID_STORED_RUN",
            `Invalid deployment run id '${runId}'`,
            { runId },
          ),
        };
      }

      try {
        await unlink(getRunFilePath(dataDir, runId));
        return { success: true, data: undefined };
      } catch (cause) {
        const error = cause as NodeJS.ErrnoException;

        if (error.code === "ENOENT") {
          return {
            success: false,
            error: createIoError(
              "IO_ERROR",
              `Deployment run '${runId}' does not exist`,
              { runId, cause },
            ),
          };
        }

        return {
          success: false,
          error: createIoError(
            "IO_ERROR",
            `Failed to delete deployment run '${runId}'`,
            { runId, cause },
          ),
        };
      }
    },

    async list() {
      const ensureResult = await this.ensureDataDirectory();

      if (!ensureResult.success) {
        return ensureResult;
      }

      let entries: string[];

      try {
        entries = await readdir(dataDir);
      } catch (cause) {
        return {
          success: false,
          error: createIoError(
            "IO_ERROR",
            `Failed to list deployment runs in '${dataDir}'`,
            { cause },
          ),
        };
      }

      const runs: DeploymentRun[] = [];

      for (const entry of entries) {
        if (!entry.endsWith(RUN_FILE_EXTENSION) || entry.endsWith(".tmp.json")) {
          continue;
        }

        const runId = entry.slice(0, -RUN_FILE_EXTENSION.length);
        const readResult = await this.read(runId);

        if (!readResult.success) {
          console.warn(
            `[deployment-log-io] Skipping invalid run file '${entry}': ${readResult.error.message}`,
          );
          continue;
        }

        if (readResult.data) {
          runs.push(readResult.data);
        }
      }

      runs.sort(
        (left, right) =>
          new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
      );

      return { success: true, data: runs };
    },

    async listByFlowId(flowId) {
      const listResult = await this.list();

      if (!listResult.success) {
        return listResult;
      }

      return {
        success: true,
        data: listResult.data.filter((run) => run.flowId === flowId),
      };
    },
  };
}
