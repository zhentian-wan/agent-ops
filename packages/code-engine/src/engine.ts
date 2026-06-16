import type { EngineContext, Plugin } from "@agentic-deployment/plugin-sdk";

export type PluginRegistry = Map<string, Plugin>;

export type CreateEngineOptions = {
  context: EngineContext;
};

export type Engine = {
  register(plugin: unknown): EngineError | null;
  getPlugin(name: string): Plugin | undefined;
  getRegistry(): Plugin[];
  getContext(): EngineContext;
  execute(
    name: string,
    args: unknown,
  ): Promise<
    | { success: true; result: unknown }
    | { success: false; error: EngineError }
  >;
};

export type EngineError = {
  code:
    | "PLUGIN_NOT_FOUND"
    | "PLUGIN_ALREADY_REGISTERED"
    | "PLUGIN_EXECUTION_FAILED";
  message: string;
  pluginName?: string;
  cause?: unknown;
};

export function createEngineError(
  code: EngineError["code"],
  message: string,
  options?: Pick<EngineError, "pluginName" | "cause">,
): EngineError {
  return {
    code,
    message,
    ...options,
  };
}

export function validatePlugin(plugin: unknown): EngineError | null {
  if (typeof plugin !== "object" || plugin === null) {
    return createEngineError(
      "PLUGIN_EXECUTION_FAILED",
      "Plugin must be an object",
    );
  }

  const candidate = plugin as Record<string, unknown>;

  if (typeof candidate.name !== "string" || candidate.name.trim() === "") {
    return createEngineError(
      "PLUGIN_EXECUTION_FAILED",
      "Plugin name must be a non-empty string",
    );
  }

  if (typeof candidate.execute !== "function") {
    return createEngineError(
      "PLUGIN_EXECUTION_FAILED",
      "Plugin execute must be a function",
      { pluginName: candidate.name },
    );
  }

  return null;
}

export function createEngine(options: CreateEngineOptions): Engine {
  const registry: PluginRegistry = new Map();
  const { context } = options;

  return {
    register(plugin: unknown): EngineError | null {
      const validationError = validatePlugin(plugin);

      if (validationError) {
        return validationError;
      }

      const validPlugin = plugin as Plugin;

      if (registry.has(validPlugin.name)) {
        return createEngineError(
          "PLUGIN_ALREADY_REGISTERED",
          `Plugin '${validPlugin.name}' is already registered`,
          { pluginName: validPlugin.name },
        );
      }

      registry.set(validPlugin.name, validPlugin);
      return null;
    },

    getPlugin(name: string): Plugin | undefined {
      return registry.get(name);
    },
    getRegistry(): Array<Plugin> {
      return Array.from(registry.values());
    },

    getContext(): EngineContext {
      return context;
    },

    async execute(
      name: string,
      args: unknown,
    ): Promise<
      | { success: true; result: unknown }
      | { success: false; error: EngineError }
    > {
      const plugin = registry.get(name);

      if (!plugin) {
        return {
          success: false,
          error: createEngineError(
            "PLUGIN_NOT_FOUND",
            `Plugin '${name}' not found`,
            { pluginName: name },
          ),
        };
      }

      try {
        const result = await plugin.execute(args, context);
        return { success: true, result };
      } catch (cause) {
        return {
          success: false,
          error: createEngineError(
            "PLUGIN_EXECUTION_FAILED",
            `Plugin '${name}' execution failed`,
            { pluginName: name, cause },
          ),
        };
      }
    },
  };
}
