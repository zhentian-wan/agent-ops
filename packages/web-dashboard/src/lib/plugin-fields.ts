export type PluginFieldType = "text";

export type PluginFieldDefinition = {
  defaultValue?: string;
  helpText?: string;
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type: PluginFieldType;
};

export type PluginFormDefinition = {
  fields: PluginFieldDefinition[];
  label: string;
};

const pluginFormDefinitions: Record<string, PluginFormDefinition> = {
  "docker-plugin": {
    label: "Docker",
    fields: [
      {
        key: "imageTag",
        label: "Image name",
        placeholder: "demo-app:latest",
        helpText: "Docker image tag used for build and run.",
        type: "text",
      },
      {
        key: "containerName",
        label: "Container name",
        placeholder: "demo-app",
        type: "text",
      },
      {
        key: "buildContext",
        label: "Build context",
        placeholder: "/path/to/app",
        helpText: "Directory passed to docker build.",
        type: "text",
      },
      {
        key: "dockerfile",
        label: "Dockerfile",
        placeholder: "Dockerfile",
        type: "text",
      },
      {
        key: "ports",
        label: "Port mapping",
        placeholder: "3002:3000",
        helpText: "Host:container port mapping.",
        type: "text",
      },
    ],
  },
  "git-plugin": {
    label: "Git Clone",
    fields: [
      {
        key: "repoUrl",
        label: "Repository URL",
        placeholder: "https://github.com/org/repo.git",
        required: true,
        type: "text",
      },
      {
        key: "destination",
        label: "Clone destination",
        placeholder: "repo-my-app",
        helpText: "Local folder name for the cloned repository.",
        type: "text",
      },
    ],
  },
};

export function getPluginFormDefinition(
  pluginName: string,
): PluginFormDefinition | undefined {
  return pluginFormDefinitions[pluginName];
}

export function getPluginLabel(pluginName: string): string {
  return pluginFormDefinitions[pluginName]?.label ?? pluginName;
}

export function buildStepArgs(
  pluginName: string,
  values: Record<string, string>,
): Record<string, unknown> | undefined {
  const definition = getPluginFormDefinition(pluginName);

  if (!definition) {
    return undefined;
  }

  const args: Record<string, unknown> = {};

  for (const field of definition.fields) {
    const rawValue = values[field.key]?.trim() ?? "";

    if (!rawValue) {
      continue;
    }

    if (field.key === "ports" && pluginName === "docker-plugin") {
      args.ports = rawValue
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      continue;
    }

    args[field.key] = rawValue;
  }

  return Object.keys(args).length > 0 ? args : undefined;
}

export function parseStepArgsToFormValues(
  pluginName: string,
  args: Record<string, unknown> | undefined,
): Record<string, string> {
  const definition = getPluginFormDefinition(pluginName);
  const values: Record<string, string> = {};

  if (!definition) {
    return values;
  }

  for (const field of definition.fields) {
    const rawValue = args?.[field.key];

    if (rawValue === undefined || rawValue === null) {
      values[field.key] = field.defaultValue ?? "";
      continue;
    }

    if (field.key === "ports" && Array.isArray(rawValue)) {
      values[field.key] = rawValue.join(", ");
      continue;
    }

    values[field.key] = String(rawValue);
  }

  return values;
}
