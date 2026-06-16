import { execFileSync } from "node:child_process";

import type { EngineContext, Plugin } from "@agentic-deployment/plugin-sdk";

type GitPluginArgs = {
  destination?: string;
  repoUrl?: string;
};

function runGitClone(
  repoUrl: string,
  destination: string,
): { stderr: string; stdout: string } {
  try {
    const stdout = execFileSync("git", ["clone", repoUrl, destination], {
      encoding: "utf8",
    });

    return { stdout, stderr: "" };
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & {
      stderr?: string;
      stdout?: string;
    };

    throw new Error(
      execError.stderr?.toString() ||
        execError.message ||
        "git clone failed",
    );
  }
}

export const gitPlugin: Plugin = {
  name: "git-plugin",
  execute: async (args: GitPluginArgs, context: EngineContext) => {
    const repoUrl = args?.repoUrl ?? context.git.repoUrl;
    const destination =
      args?.destination ?? context.git.destination ?? `repo-${Date.now()}`;

    if (!repoUrl || typeof repoUrl !== "string") {
      throw new Error("context.git.repoUrl is required");
    }

    const { stdout, stderr } = runGitClone(repoUrl, destination);

    return {
      destination,
      repoUrl,
      stderr,
      stdout,
    };
  },
};
