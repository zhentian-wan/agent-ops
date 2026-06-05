export type Plugin = {
  execute: (args: any) => any;
  name: string;
};
