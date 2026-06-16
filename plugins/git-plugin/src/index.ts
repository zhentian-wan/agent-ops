export { gitPlugin } from "./git-plugin.js";

import type { Plugin } from "@agentic-deployment/plugin-sdk";

export const testPlugin: Plugin = {
  name: "test-plugin",
  execute: (_args, _context) => ({
    plugin: "test-plugin",
    args: _args,
  }),
};
