import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { EngineContext, Plugin } from "@agentic-deployment/plugin-sdk";

const defaultBuildContext = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../demo-app",
);

type DockerPluginArgs = {
  buildContext?: string;
  containerName?: string;
  dockerfile?: string;
  env?: Record<string, string>;
  imageTag?: string;
  ports?: string[];
};

function runDocker(
  args: string[],
): { stderr: string; stdout: string } {
  try {
    const stdout = execFileSync("docker", args, {
      encoding: "utf8",
    });

    return { stdout: stdout.trim(), stderr: "" };
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & {
      stderr?: string;
      stdout?: string;
    };

    throw new Error(
      execError.stderr?.toString() ||
        execError.message ||
        "docker command failed",
    );
  }
}

function containerExists(containerName: string): boolean {
  try {
    execFileSync(
      "docker",
      ["inspect", "--type", "container", containerName],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    return true;
  } catch {
    return false;
  }
}

function isContainerRunning(containerName: string): boolean {
  const { stdout } = runDocker([
    "inspect",
    "--type",
    "container",
    "-f",
    "{{.State.Running}}",
    containerName,
  ]);
  return stdout === "true";
}

function stopAndRemoveContainer(containerName: string): void {
  if (!containerExists(containerName)) {
    return;
  }

  if (isContainerRunning(containerName)) {
    runDocker(["container", "stop", containerName]);
  }

  runDocker(["container", "rm", containerName]);
}

export const dockerPlugin: Plugin = {
  name: "docker-plugin",
  execute: async (args: DockerPluginArgs, _context: EngineContext) => {
    const buildContext = args?.buildContext ?? defaultBuildContext;
    const dockerfile = args?.dockerfile ?? "Dockerfile";
    const imageTag = args?.imageTag ?? "demo-app:latest";
    const containerName = args?.containerName ?? "demo-app";
    const ports = args?.ports ?? ["3002:3000"];

    const dockerfilePath = path.isAbsolute(dockerfile)
      ? dockerfile
      : path.join(buildContext, dockerfile);

    const buildResult = runDocker([
      "build",
      "-t",
      imageTag,
      "-f",
      dockerfilePath,
      buildContext,
    ]);

    stopAndRemoveContainer(containerName);

    const runArgs = ["run", "-d", "--name", containerName];

    for (const port of ports) {
      runArgs.push("-p", port);
    }

    if (args?.env) {
      for (const [key, value] of Object.entries(args.env)) {
        runArgs.push("-e", `${key}=${value}`);
      }
    }

    runArgs.push(imageTag);

    const runResult = runDocker(runArgs);

    return {
      buildContext,
      containerId: runResult.stdout,
      containerName,
      dockerfile: dockerfilePath,
      imageTag,
      build: {
        stderr: buildResult.stderr,
        stdout: buildResult.stdout,
      },
      run: {
        stderr: runResult.stderr,
        stdout: runResult.stdout,
      },
    };
  },
};
