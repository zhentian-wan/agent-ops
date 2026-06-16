export type DeploymentStep = {
  id: string;
  pluginName: string;
  args?: unknown;
};

export type DeploymentFlow = {
  id: string;
  name: string;
  steps: DeploymentStep[];
};

export type CreateDeploymentStepInput = {
  pluginName: string;
  args?: unknown;
};

export type CreateDeploymentFlowInput = {
  name: string;
  steps: CreateDeploymentStepInput[];
};

export type UpdateDeploymentFlowInput = {
  name?: string;
  steps?: CreateDeploymentStepInput[];
};
