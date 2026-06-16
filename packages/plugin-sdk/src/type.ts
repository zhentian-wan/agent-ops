export type EngineContext = {
  git: {
    destination?: string;
    repoUrl: string;
  };
};

export type Plugin = {
  execute: (args: any, context: EngineContext) => any | Promise<any>;
  name: string;
};
