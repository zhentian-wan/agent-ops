import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";

import type { FlowRunner } from "../services/flow-runner.js";
import type { DeploymentLogStore } from "../store/deployment-log-store.js";

type DeploymentRunRouteDeps = {
  flowRunner: FlowRunner;
  logStore: DeploymentLogStore;
};

function sendStoreError(res: Response, status: number, error: unknown): void {
  res.status(status).json(error);
}

function getErrorStatus(code: string | undefined): number {
  if (code === "FLOW_NOT_FOUND" || code === "RUN_NOT_FOUND") {
    return 404;
  }

  if (code === "IO_ERROR") {
    return 500;
  }

  return 400;
}

export function createDeploymentRunRouter(
  deps: DeploymentRunRouteDeps,
): Router {
  const router = createRouter();
  const { flowRunner, logStore } = deps;

  router.post("/flows/:id/run", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const flowId = req.params.id;

    if (!flowId) {
      res.status(400).json({
        code: "INVALID_FLOW",
        message: "Flow id is required",
      });
      return;
    }

    const outcome = await flowRunner.executeFlow(flowId);

    if (!outcome.success) {
      sendStoreError(res, getErrorStatus(outcome.error.code), outcome.error);
      return;
    }

    res.status(201).json({ run: outcome.data });
  });

  router.get("/flows/:id/runs", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const flowId = req.params.id;

    if (!flowId) {
      res.status(400).json({
        code: "INVALID_FLOW",
        message: "Flow id is required",
      });
      return;
    }

    const outcome = await logStore.listRunsByFlowId(flowId);

    if (!outcome.success) {
      sendStoreError(res, getErrorStatus(outcome.error.code), outcome.error);
      return;
    }

    res.json({ runs: outcome.data });
  });

  router.get("/runs/:runId", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const runId = req.params.runId;

    if (!runId) {
      res.status(400).json({
        code: "INVALID_RUN",
        message: "Run id is required",
      });
      return;
    }

    const outcome = await logStore.getRun(runId);

    if (!outcome.success) {
      sendStoreError(res, getErrorStatus(outcome.error.code), outcome.error);
      return;
    }

    if (!outcome.data) {
      res.status(404).json({
        code: "RUN_NOT_FOUND",
        message: `Deployment run '${runId}' not found`,
        runId,
      });
      return;
    }

    res.json({ run: outcome.data });
  });

  router.get("/runs/:runId/logs", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const runId = req.params.runId;

    if (!runId) {
      res.status(400).json({
        code: "INVALID_RUN",
        message: "Run id is required",
      });
      return;
    }

    const outcome = await logStore.getRun(runId);

    if (!outcome.success) {
      sendStoreError(res, getErrorStatus(outcome.error.code), outcome.error);
      return;
    }

    if (!outcome.data) {
      res.status(404).json({
        code: "RUN_NOT_FOUND",
        message: `Deployment run '${runId}' not found`,
        runId,
      });
      return;
    }

    res.json({
      runId: outcome.data.id,
      flowId: outcome.data.flowId,
      entries: outcome.data.entries,
    });
  });

  return router;
}
