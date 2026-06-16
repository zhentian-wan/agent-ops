export const CODE_ENGINE_VERSION = "0.0.0";

export { createEngine, createEngineError, validatePlugin } from "./engine.js";
export type { CreateEngineOptions, Engine, EngineError, PluginRegistry } from "./engine.js";
export type { EngineContext } from "@agentic-deployment/plugin-sdk";
