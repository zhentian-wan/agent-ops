import type {
  CreateDeploymentFlowInput,
  DeploymentFlow,
  PluginInfo,
  UpdateDeploymentFlowInput,
} from "../types/deployment-flow.js";
import type { DeploymentRun, RunLogsResponse } from "../types/deployment-run.js";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

type ApiError = {
  code?: string;
  message: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | ApiError;

  if (!response.ok) {
    const error = payload as ApiError;
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return payload as T;
}

export async function listPlugins(): Promise<PluginInfo[]> {
  const response = await fetch(`${API_BASE}/plugins`);
  const payload = await readJson<{ plugins: PluginInfo[] }>(response);
  return payload.plugins;
}

export async function listFlows(): Promise<DeploymentFlow[]> {
  const response = await fetch(`${API_BASE}/flows`);
  const payload = await readJson<{ flows: DeploymentFlow[] }>(response);
  return payload.flows;
}

export async function getFlow(id: string): Promise<DeploymentFlow> {
  const response = await fetch(`${API_BASE}/flows/${id}`);
  const payload = await readJson<{ flow: DeploymentFlow }>(response);
  return payload.flow;
}

export async function createFlow(
  input: CreateDeploymentFlowInput,
): Promise<DeploymentFlow> {
  const response = await fetch(`${API_BASE}/flows`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readJson<{ flow: DeploymentFlow }>(response);
  return payload.flow;
}

export async function updateFlow(
  id: string,
  input: UpdateDeploymentFlowInput,
): Promise<DeploymentFlow> {
  const response = await fetch(`${API_BASE}/flows/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readJson<{ flow: DeploymentFlow }>(response);
  return payload.flow;
}

export async function deleteFlow(id: string): Promise<DeploymentFlow> {
  const response = await fetch(`${API_BASE}/flows/${id}`, {
    method: "DELETE",
  });
  const payload = await readJson<{ flow: DeploymentFlow }>(response);
  return payload.flow;
}

export async function listRunsByFlowId(flowId: string): Promise<DeploymentRun[]> {
  const response = await fetch(`${API_BASE}/flows/${flowId}/runs`);
  const payload = await readJson<{ runs: DeploymentRun[] }>(response);
  return payload.runs;
}

export async function getRun(runId: string): Promise<DeploymentRun> {
  const response = await fetch(`${API_BASE}/runs/${runId}`);
  const payload = await readJson<{ run: DeploymentRun }>(response);
  return payload.run;
}

export async function getRunLogs(runId: string): Promise<RunLogsResponse> {
  const response = await fetch(`${API_BASE}/runs/${runId}/logs`);
  return readJson<RunLogsResponse>(response);
}

export async function runFlow(flowId: string): Promise<DeploymentRun> {
  const response = await fetch(`${API_BASE}/flows/${flowId}/run`, {
    method: "POST",
  });
  const payload = await readJson<{ run: DeploymentRun }>(response);
  return payload.run;
}
