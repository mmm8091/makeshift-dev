/** 站点级常量。 */
export const SITE = {
  name: "草台编子识字班",
  github: "https://github.com/mmm8091/makeshift-dev",
} as const;

/** 构建期注入（见 next.config.ts 的 env）。本地未注入时回退。 */
export const APP_VERSION = process.env.APP_VERSION ?? "0.3.1";
export const APP_BUILD_SHA = process.env.APP_BUILD_SHA ?? "dev";
