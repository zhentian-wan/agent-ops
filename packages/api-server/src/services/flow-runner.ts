import type { Engine } from "@agentic-deployment/code-engine";

import type { DeploymentFlowStore } from "../store/deployment-flow-store.js";
import type { DeploymentLogStore } from "../store/deployment-log-store.js";
import type { DeploymentRun } from "../types/deployment-run.js";

export type FlowRunnerError = {
  code: string;
  cause?: unknown;
  flowId?: string;
  message: string;
  runId?: string;
};

export type FlowRunnerResult<T> =
  | { success: true; data: T }
  | { success: false; error: FlowRunnerError };

export type FlowRunner = {
  executeFlow: (flowId: string) => Promise<FlowRunnerResult<DeploymentRun>>;
};

export type CreateFlowRunnerOptions = {
  engine: Engine;
  flowStore: DeploymentFlowStore;
  logStore: DeploymentLogStore;
};

function createRunnerError(
  code: string,
  message: string,
  options?: Pick<FlowRunnerError, "flowId" | "runId" | "cause">,
): FlowRunnerError {
  return {
    code,
    message,
    ...options,
  };
}

function formatErrorDetails(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return error;
}

export function createFlowRunner(options: CreateFlowRunnerOptions): FlowRunner {
  const { engine, flowStore, logStore } = options;

  return {
    async executeFlow(flowId) {
      const flowResult = await flowStore.get(flowId);

      if (!flowResult.success) {
        return {
          success: false,
          error: createRunnerError(flowResult.error.code, flowResult.error.message, {
            flowId,
            cause: flowResult.error.cause,
          }),
        };
      }

      const flow = flowResult.data;

      if (!flow) {
        return {
          success: false,
          error: createRunnerError(
            "FLOW_NOT_FOUND",
            `Deployment flow '${flowId}' not found`,
            { flowId },
          ),
        };
      }

      const runResult = await logStore.createRun({
        flowId: flow.id,
        flowName: flow.name,
        steps: flow.steps.map((step) => ({
          id: step.id,
          pluginName: step.pluginName,
        })),
      });

      if (!runResult.success) {
        return {
          success: false,
          error: createRunnerError(runResult.error.code, runResult.error.message, {
            flowId,
            runId: runResult.error.runId,
            cause: runResult.error.cause,
          }),
        };
      }

      const run = runResult.data;

      await logStore.appendEntry(run.id, {
        level: "info",
        message: `Starting deployment run with ${flow.steps.length} step(s)`,
      });

      let runFailed = false;

      for (const [index, step] of flow.steps.entries()) {
        const stepNumber = index + 1;

        await logStore.updateStepStatus(run.id, step.id, "running");
        await logStore.appendEntry(run.id, {
          level: "info",
          stepId: step.id,
          pluginName: step.pluginName,
          message: `Step ${stepNumber}: executing '${step.pluginName}'`,
          details: step.args,
        });

        const outcome = await engine.execute(step.pluginName, step.args);

        if (!outcome.success) {
          runFailed = true;

          await logStore.appendEntry(run.id, {
            level: "error",
            stepId: step.id,
            pluginName: step.pluginName,
            message: `Step ${stepNumber} failed: ${outcome.error.message}`,
            details: formatErrorDetails(outcome.error.cause ?? outcome.error),
          });
          await logStore.updateStepStatus(run.id, step.id, "failed");

          for (const remainingStep of flow.steps.slice(index + 1)) {
            await logStore.updateStepStatus(run.id, remainingStep.id, "skipped");
            await logStore.appendEntry(run.id, {
              level: "warn",
              stepId: remainingStep.id,
              pluginName: remainingStep.pluginName,
              message: `Step skipped because a previous step failed`,
            });
          }

          break;
        }

        await logStore.appendEntry(run.id, {
          level: "info",
          stepId: step.id,
          pluginName: step.pluginName,
          message: `Step ${stepNumber} completed successfully`,
          details: outcome.result,
        });
        await logStore.updateStepStatus(run.id, step.id, "success");
      }

      const finalStatus = runFailed ? "failed" : "success";
      const finalizeResult = await logStore.finalizeRun(run.id, finalStatus);

      if (!finalizeResult.success) {
        return {
          success: false,
          error: createRunnerError(
            finalizeResult.error.code,
            finalizeResult.error.message,
            {
              flowId,
              runId: run.id,
              cause: finalizeResult.error.cause,
            },
          ),
        };
      }

      await logStore.appendEntry(run.id, {
        level: finalStatus === "success" ? "info" : "error",
        message:
          finalStatus === "success"
            ? "Deployment run completed successfully"
            : "Deployment run failed",
      });

      const finalRunResult = await logStore.getRun(run.id);

      if (!finalRunResult.success || !finalRunResult.data) {
        return {
          success: false,
          error: createRunnerError(
            "RUN_NOT_FOUND",
            `Failed to load completed run '${run.id}'`,
            { flowId, runId: run.id },
          ),
        };
      }

      return { success: true, data: finalRunResult.data };
    },
  };
}
