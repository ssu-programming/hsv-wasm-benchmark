/// <reference types="vite/client" />

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*/wasm/hsv.js" {
  const createModule: (moduleArg?: any) => Promise<any>;
  export default createModule;
}

