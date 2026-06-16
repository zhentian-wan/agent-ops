import { randomUUID } from "node:crypto";

import type { Engine } from "@agentic-deployment/code-engine";

import {
  createDeploymentFlowIo,
  getDefaultFlowsDataDir,
  type DeploymentFlowIo,
} from "../io/deployment-flow-io.js";
import type {
  CreateDeploymentFlowInput,
  DeploymentFlow,
  DeploymentStep,
  UpdateDeploymentFlowInput,
} from "../types/deployment-flow.js";

export type FlowStoreError = {
  code:
    | "FLOW_NOT_FOUND"
    | "INVALID_FLOW"
    | "PLUGIN_NOT_FOUND"
    | "DUPLICATE_STEP_ID"
    | "IO_ERROR"
    | "INVALID_STORED_FLOW";
  cause?: unknown;
  flowId?: string;
  message: string;
  pluginName?: string;
};

export type FlowStoreResult<T> =
  | { success: true; data: T }
  | { success: false; error: FlowStoreError };

export type DeploymentFlowStore = {
  create: (
    input: CreateDeploymentFlowInput,
  ) => Promise<FlowStoreResult<DeploymentFlow>>;
  delete: (id: string) => Promise<FlowStoreResult<DeploymentFlow>>;
  get: (id: string) => Promise<FlowStoreResult<DeploymentFlow | null>>;
  list: () => Promise<FlowStoreResult<DeploymentFlow[]>>;
  update: (
    id: string,
    input: UpdateDeploymentFlowInput,
  ) => Promise<FlowStoreResult<DeploymentFlow>>;
};

export type CreateDeploymentFlowStoreOptions = {
  dataDir?: string;
  engine: Engine;
  io?: DeploymentFlowIo;
};

function createFlowStoreError(
  code: FlowStoreError["code"],
  message: string,
  options?: Pick<FlowStoreError, "flowId" | "pluginName" | "cause">,
): FlowStoreError {
  return {
    code,
    message,
    ...options,
  };
}

function validateFlowName(name: unknown): FlowStoreError | null {
  if (typeof name !== "string" || name.trim() === "") {
    return createFlowStoreError(
      "INVALID_FLOW",
      "Flow name must be a non-empty string",
    );
  }

  return null;
}

function validateSteps(
  steps: unknown,
  engine: Engine,
): FlowStoreError | { steps: DeploymentStep[] } {
  if (!Array.isArray(steps)) {
    return createFlowStoreError("INVALID_FLOW", "Flow steps must be an array");
  }

  const seenStepIds = new Set<string>();
  const normalizedSteps: DeploymentStep[] = [];

  for (const step of steps) {
    if (typeof step !== "object" || step === null) {
      return createFlowStoreError(
        "INVALID_FLOW",
        "Each step must be an object",
      );
    }

    const candidate = step as Record<string, unknown>;

    if (
      typeof candidate.pluginName !== "string" ||
      candidate.pluginName.trim() === ""
    ) {
      return createFlowStoreError(
        "INVALID_FLOW",
        "Each step must have a non-empty pluginName",
      );
    }

    if (!engine.getPlugin(candidate.pluginName)) {
      return createFlowStoreError(
        "PLUGIN_NOT_FOUND",
        `Plugin '${candidate.pluginName}' is not registered`,
        { pluginName: candidate.pluginName },
      );
    }

    const stepId =
      typeof candidate.id === "string" && candidate.id.trim() !== ""
        ? candidate.id
        : randomUUID();

    if (seenStepIds.has(stepId)) {
      return createFlowStoreError(
        "DUPLICATE_STEP_ID",
        `Duplicate step id '${stepId}'`,
      );
    }

    seenStepIds.add(stepId);

    normalizedSteps.push({
      id: stepId,
      pluginName: candidate.pluginName,
      ...(candidate.args !== undefined ? { args: candidate.args } : {}),
    });
  }

  return { steps: normalizedSteps };
}

export async function createDeploymentFlowStore(
  options: CreateDeploymentFlowStoreOptions,
): Promise<DeploymentFlowStore> {
  const { engine } = options;
  const dataDir = options.dataDir ?? getDefaultFlowsDataDir();
  const io = options.io ?? createDeploymentFlowIo(dataDir);

  const ensureResult = await io.ensureDataDirectory();

  if (!ensureResult.success) {
    throw new Error(ensureResult.error.message);
  }

  return {
    async create(input) {
      const nameError = validateFlowName(input.name);

      if (nameError) {
        return { success: false, error: nameError };
      }

      const stepsResult = validateSteps(input.steps, engine);

      if ("code" in stepsResult) {
        return { success: false, error: stepsResult };
      }

      const flow: DeploymentFlow = {
        id: randomUUID(),
        name: input.name.trim(),
        steps: stepsResult.steps,
      };

      const writeResult = await io.write(flow);

      if (!writeResult.success) {
        return {
          success: false,
          error: createFlowStoreError(
            writeResult.error.code,
            writeResult.error.message,
            {
              flowId: writeResult.error.flowId,
              cause: writeResult.error.cause,
            },
          ),
        };
      }

      return { success: true, data: flow };
    },

    async delete(id) {
      const readResult = await io.read(id);

      if (!readResult.success) {
        return {
          success: false,
          error: createFlowStoreError(
            readResult.error.code,
            readResult.error.message,
            {
              flowId: readResult.error.flowId,
              cause: readResult.error.cause,
            },
          ),
        };
      }

      if (!readResult.data) {
        return {
          success: false,
          error: createFlowStoreError(
            "FLOW_NOT_FOUND",
            `Deployment flow '${id}' not found`,
            { flowId: id },
          ),
        };
      }

      const deleteResult = await io.delete(id);

      if (!deleteResult.success) {
        return {
          success: false,
          error: createFlowStoreError(
            deleteResult.error.code,
            deleteResult.error.message,
            {
              flowId: deleteResult.error.flowId,
              cause: deleteResult.error.cause,
            },
          ),
        };
      }

      return { success: true, data: readResult.data };
    },

    async get(id) {
      const readResult = await io.read(id);

      if (!readResult.success) {
        return {
          success: false,
          error: createFlowStoreError(
            readResult.error.code,
            readResult.error.message,
            {
              flowId: readResult.error.flowId,
              cause: readResult.error.cause,
            },
          ),
        };
      }

      return { success: true, data: readResult.data };
    },

    async list() {
      const listResult = await io.list();

      if (!listResult.success) {
        return {
          success: false,
          error: createFlowStoreError(
            listResult.error.code,
            listResult.error.message,
            { cause: listResult.error.cause },
          ),
        };
      }

      return { success: true, data: listResult.data };
    },

    async update(id, input) {
      const readResult = await io.read(id);

      if (!readResult.success) {
        return {
          success: false,
          error: createFlowStoreError(
            readResult.error.code,
            readResult.error.message,
            {
              flowId: readResult.error.flowId,
              cause: readResult.error.cause,
            },
          ),
        };
      }

      const existing = readResult.data;

      if (!existing) {
        return {
          success: false,
          error: createFlowStoreError(
            "FLOW_NOT_FOUND",
            `Deployment flow '${id}' not found`,
            { flowId: id },
          ),
        };
      }

      if (input.name !== undefined) {
        const nameError = validateFlowName(input.name);

        if (nameError) {
          return { success: false, error: nameError };
        }
      }

      let steps = existing.steps;

      if (input.steps !== undefined) {
        const stepsResult = validateSteps(input.steps, engine);

        if ("code" in stepsResult) {
          return { success: false, error: stepsResult };
        }

        steps = stepsResult.steps;
      }

      const updated: DeploymentFlow = {
        id: existing.id,
        name: input.name?.trim() ?? existing.name,
        steps,
      };

      const writeResult = await io.write(updated);

      if (!writeResult.success) {
        return {
          success: false,
          error: createFlowStoreError(
            writeResult.error.code,
            writeResult.error.message,
            {
              flowId: writeResult.error.flowId,
              cause: writeResult.error.cause,
            },
          ),
        };
      }

      return { success: true, data: updated };
    },
  };
}
