import { createEngine, type EngineContext } from "@agentic-deployment/code-engine";
import { dockerPlugin } from "@agentic-deployment/docker-plugin";
import { gitPlugin } from "@agentic-deployment/git-plugin";
import express from "express";

import { getDefaultFlowsDataDir } from "./io/deployment-flow-io.js";
import { getDefaultLogsDataDir } from "./io/deployment-log-io.js";
import { createDeploymentFlowRouter } from "./routes/deployment-flows.js";
import { createDeploymentRunRouter } from "./routes/deployment-runs.js";
import { createFlowRunner } from "./services/flow-runner.js";
import { createDeploymentFlowStore } from "./store/deployment-flow-store.js";
import { createDeploymentLogStore } from "./store/deployment-log-store.js";

const defaultGitContext: EngineContext["git"] = {
  repoUrl:
    process.env.GIT_REPO_URL ?? "https://github.com/vuejs/vitepress.git",
  destination: process.env.GIT_DESTINATION,
};

export async function startServer(port = 3000) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const engine = createEngine({
    context: {
      git: defaultGitContext,
    },
  });

  engine.register(gitPlugin);
  engine.register(dockerPlugin);

  const flowStore = await createDeploymentFlowStore({ engine });
  const logStore = await createDeploymentLogStore();
  const flowRunner = createFlowRunner({
    engine,
    flowStore,
    logStore,
  });

  app.use(
    "/api",
    createDeploymentFlowRouter({
      engine,
      flowStore,
    }),
  );

  app.use(
    "/api",
    createDeploymentRunRouter({
      flowRunner,
      logStore,
    }),
  );

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
    const flowsDataDir = getDefaultFlowsDataDir();
    const logsDataDir = getDefaultLogsDataDir();
    console.log(`API server listening on http://localhost:${port}`);
    console.log(`Deployment flows data directory: ${flowsDataDir}`);
    console.log(`Deployment logs data directory: ${logsDataDir}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start API server:", error);
  process.exit(1);
});
