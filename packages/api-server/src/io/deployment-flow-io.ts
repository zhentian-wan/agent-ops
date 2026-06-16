import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { DeploymentFlow } from "../types/deployment-flow.js";

const FLOW_FILE_EXTENSION = ".json";

export type DeploymentFlowIoError = {
  code: "IO_ERROR" | "INVALID_STORED_FLOW";
  cause?: unknown;
  flowId?: string;
  message: string;
};

export type DeploymentFlowIoResult<T> =
  | { success: true; data: T }
  | { success: false; error: DeploymentFlowIoError };

export type DeploymentFlowIo = {
  delete: (id: string) => Promise<DeploymentFlowIoResult<void>>;
  ensureDataDirectory: () => Promise<DeploymentFlowIoResult<void>>;
  exists: (id: string) => Promise<boolean>;
  list: () => Promise<DeploymentFlowIoResult<DeploymentFlow[]>>;
  read: (id: string) => Promise<DeploymentFlowIoResult<DeploymentFlow | null>>;
  write: (flow: DeploymentFlow) => Promise<DeploymentFlowIoResult<void>>;
};

function createIoError(
  code: DeploymentFlowIoError["code"],
  message: string,
  options?: Pick<DeploymentFlowIoError, "flowId" | "cause">,
): DeploymentFlowIoError {
  return {
    code,
    message,
    ...options,
  };
}

function isSafeFlowId(id: string): boolean {
  return id.length > 0 && !id.includes("/") && !id.includes("\\") && id !== "." && id !== "..";
}

function getFlowFilePath(dataDir: string, id: string): string {
  if (!isSafeFlowId(id)) {
    throw new Error(`Invalid flow id '${id}'`);
  }

  return path.join(dataDir, `${id}${FLOW_FILE_EXTENSION}`);
}

function parseStoredFlow(
  raw: string,
  flowId: string,
): DeploymentFlowIoResult<DeploymentFlow> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    return {
      success: false,
      error: createIoError(
        "INVALID_STORED_FLOW",
        `Failed to parse deployment flow '${flowId}'`,
        { flowId, cause },
      ),
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {
      success: false,
      error: createIoError(
        "INVALID_STORED_FLOW",
        `Deployment flow '${flowId}' must be a JSON object`,
        { flowId },
      ),
    };
  }

  const candidate = parsed as Record<string, unknown>;

  if (typeof candidate.id !== "string" || candidate.id !== flowId) {
    return {
      success: false,
      error: createIoError(
        "INVALID_STORED_FLOW",
        `Deployment flow file '${flowId}' has a mismatched id`,
        { flowId },
      ),
    };
  }

  if (typeof candidate.name !== "string" || candidate.name.trim() === "") {
    return {
      success: false,
      error: createIoError(
        "INVALID_STORED_FLOW",
        `Deployment flow '${flowId}' must have a non-empty name`,
        { flowId },
      ),
    };
  }

  if (!Array.isArray(candidate.steps)) {
    return {
      success: false,
      error: createIoError(
        "INVALID_STORED_FLOW",
        `Deployment flow '${flowId}' must have a steps array`,
        { flowId },
      ),
    };
  }

  const steps = [];

  for (const step of candidate.steps) {
    if (typeof step !== "object" || step === null) {
      return {
        success: false,
        error: createIoError(
          "INVALID_STORED_FLOW",
          `Deployment flow '${flowId}' has an invalid step`,
          { flowId },
        ),
      };
    }

    const stepCandidate = step as Record<string, unknown>;

    if (
      typeof stepCandidate.id !== "string" ||
      stepCandidate.id.trim() === "" ||
      typeof stepCandidate.pluginName !== "string" ||
      stepCandidate.pluginName.trim() === ""
    ) {
      return {
        success: false,
        error: createIoError(
          "INVALID_STORED_FLOW",
          `Deployment flow '${flowId}' has an invalid step`,
          { flowId },
        ),
      };
    }

    steps.push({
      id: stepCandidate.id,
      pluginName: stepCandidate.pluginName,
      ...(stepCandidate.args !== undefined
        ? { args: stepCandidate.args }
        : {}),
    });
  }

  return {
    success: true,
    data: {
      id: candidate.id,
      name: candidate.name,
      steps,
    },
  };
}

export function getDefaultFlowsDataDir(): string {
  return path.join(process.cwd(), "data", "flows");
}

export function createDeploymentFlowIo(dataDir: string): DeploymentFlowIo {
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
            `Failed to create data directory '${dataDir}'`,
            { cause },
          ),
        };
      }
    },

    async exists(id) {
      if (!isSafeFlowId(id)) {
        return false;
      }

      try {
        await readFile(getFlowFilePath(dataDir, id), "utf8");
        return true;
      } catch (cause) {
        const error = cause as NodeJS.ErrnoException;

        if (error.code === "ENOENT") {
          return false;
        }

        throw cause;
      }
    },

    async read(id) {
      if (!isSafeFlowId(id)) {
        return {
          success: false,
          error: createIoError(
            "INVALID_STORED_FLOW",
            `Invalid deployment flow id '${id}'`,
            { flowId: id },
          ),
        };
      }

      try {
        const raw = await readFile(getFlowFilePath(dataDir, id), "utf8");
        const parsed = parseStoredFlow(raw, id);

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
            `Failed to read deployment flow '${id}'`,
            { flowId: id, cause },
          ),
        };
      }
    },

    async write(flow) {
      if (!isSafeFlowId(flow.id)) {
        return {
          success: false,
          error: createIoError(
            "INVALID_STORED_FLOW",
            `Invalid deployment flow id '${flow.id}'`,
            { flowId: flow.id },
          ),
        };
      }

      const filePath = getFlowFilePath(dataDir, flow.id);
      const tempFilePath = `${filePath}.tmp`;
      const payload = `${JSON.stringify(flow, null, 2)}\n`;

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
            `Failed to write deployment flow '${flow.id}'`,
            { flowId: flow.id, cause },
          ),
        };
      }
    },

    async delete(id) {
      if (!isSafeFlowId(id)) {
        return {
          success: false,
          error: createIoError(
            "INVALID_STORED_FLOW",
            `Invalid deployment flow id '${id}'`,
            { flowId: id },
          ),
        };
      }

      try {
        await unlink(getFlowFilePath(dataDir, id));
        return { success: true, data: undefined };
      } catch (cause) {
        const error = cause as NodeJS.ErrnoException;

        if (error.code === "ENOENT") {
          return {
            success: false,
            error: createIoError(
              "IO_ERROR",
              `Deployment flow '${id}' does not exist`,
              { flowId: id, cause },
            ),
          };
        }

        return {
          success: false,
          error: createIoError(
            "IO_ERROR",
            `Failed to delete deployment flow '${id}'`,
            { flowId: id, cause },
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
            `Failed to list deployment flows in '${dataDir}'`,
            { cause },
          ),
        };
      }

      const flows: DeploymentFlow[] = [];

      for (const entry of entries) {
        if (!entry.endsWith(FLOW_FILE_EXTENSION)) {
          continue;
        }

        const flowId = entry.slice(0, -FLOW_FILE_EXTENSION.length);
        const readResult = await this.read(flowId);

        if (!readResult.success) {
          console.warn(
            `[deployment-flow-io] Skipping invalid flow file '${entry}': ${readResult.error.message}`,
          );
          continue;
        }

        if (readResult.data) {
          flows.push(readResult.data);
        }
      }

      return { success: true, data: flows };
    },
  };
}
