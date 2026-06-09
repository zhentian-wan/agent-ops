export { gitPlugin } from "./git-plugin.js";

import type { Plugin } from "@agentic-deployment/plugin-sdk";

export const testPlugin: Plugin = {
  name: "test-plugin",
  execute: (args) => ({
    plugin: "test-plugin",
    args,
  }),
};
