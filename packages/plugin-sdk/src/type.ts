export type Plugin = {
  execute: (args: any) => any | Promise<any>;
  name: string;
};
