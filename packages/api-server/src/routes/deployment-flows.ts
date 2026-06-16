import type { Engine } from "@agentic-deployment/code-engine";
import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";

import type { DeploymentFlowStore } from "../store/deployment-flow-store.js";
import type {
  CreateDeploymentFlowInput,
  UpdateDeploymentFlowInput,
} from "../types/deployment-flow.js";

type DeploymentFlowRouteDeps = {
  engine: Engine;
  flowStore: DeploymentFlowStore;
};

function sendStoreError(res: Response, status: number, error: unknown): void {
  res.status(status).json(error);
}

function getStoreErrorStatus(code: string | undefined): number {
  if (code === "FLOW_NOT_FOUND") {
    return 404;
  }

  if (code === "IO_ERROR") {
    return 500;
  }

  return 400;
}

export function createDeploymentFlowRouter(
  deps: DeploymentFlowRouteDeps,
): Router {
  const router = createRouter();
  const { engine, flowStore } = deps;

  router.get("/plugins", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const plugins = engine.getRegistry().map((plugin) => ({
      name: plugin.name,
    }));

    res.json({ plugins });
  });

  router.get("/flows", async (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const outcome = await flowStore.list();

    if (!outcome.success) {
      sendStoreError(res, getStoreErrorStatus(outcome.error.code), outcome.error);
      return;
    }

    res.json({ flows: outcome.data });
  });

  router.get("/flows/:id", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const flowId = req.params.id;

    if (!flowId) {
      res.status(400).json({
        code: "INVALID_FLOW",
        message: "Flow id is required",
      });
      return;
    }

    const outcome = await flowStore.get(flowId);

    if (!outcome.success) {
      sendStoreError(res, getStoreErrorStatus(outcome.error.code), outcome.error);
      return;
    }

    if (!outcome.data) {
      res.status(404).json({
        code: "FLOW_NOT_FOUND",
        message: `Deployment flow '${flowId}' not found`,
        flowId,
      });
      return;
    }

    res.json({ flow: outcome.data });
  });

  router.post("/flows", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const input = req.body as CreateDeploymentFlowInput;
    const outcome = await flowStore.create(input);

    if (!outcome.success) {
      sendStoreError(res, getStoreErrorStatus(outcome.error.code), outcome.error);
      return;
    }

    res.status(201).json({ flow: outcome.data });
  });

  router.put("/flows/:id", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const flowId = req.params.id;

    if (!flowId) {
      res.status(400).json({
        code: "INVALID_FLOW",
        message: "Flow id is required",
      });
      return;
    }

    const input = req.body as UpdateDeploymentFlowInput;
    const outcome = await flowStore.update(flowId, input);

    if (!outcome.success) {
      sendStoreError(res, getStoreErrorStatus(outcome.error.code), outcome.error);
      return;
    }

    res.json({ flow: outcome.data });
  });

  router.delete("/flows/:id", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const flowId = req.params.id;

    if (!flowId) {
      res.status(400).json({
        code: "INVALID_FLOW",
        message: "Flow id is required",
      });
      return;
    }

    const outcome = await flowStore.delete(flowId);

    if (!outcome.success) {
      sendStoreError(res, getStoreErrorStatus(outcome.error.code), outcome.error);
      return;
    }

    res.json({ flow: outcome.data });
  });

  return router;
}
