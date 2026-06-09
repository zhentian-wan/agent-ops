import { createEngine } from "@agentic-deployment/code-engine";
import { dockerPlugin } from "@agentic-deployment/docker-plugin";
import { gitPlugin } from "@agentic-deployment/git-plugin";
import express from "express";

export function startServer(port = 3000) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const engine = createEngine();

  engine.register(gitPlugin);
  engine.register(dockerPlugin);

  app.post("/api/ping", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const outcome = await engine.execute("docker-plugin", req.body);

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
