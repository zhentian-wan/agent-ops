import {
  createEngine,
  createEngineError,
} from "@agentic-deployment/code-engine";
import express from "express";

export function startServer(port = 3000) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const engine = createEngine();

  engine.register({
    name: "ping",
    execute: () => {
      console.log("ping");
      return { ok: true };
    },
  });

  app.get("/api/ping", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const registry = engine.getRegistry();
    const firstEntry = registry[0];

    if (!firstEntry) {
      res
        .status(500)
        .json(createEngineError("PLUGIN_NOT_FOUND", "No plugins registered"));
      return;
    }

    const outcome = engine.execute(firstEntry.name, {});

    if (!outcome.success) {
      res.status(500).json(outcome.error);
      return;
    }

    res.json(outcome.result);
  });

  app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`);
  });
}

startServer();
