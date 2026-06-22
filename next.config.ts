import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

void initOpenNextCloudflareForDev();

const appVersion = JSON.parse(
  readFileSync("./package.json", "utf8"),
).version as string;

// 构建期注入短 SHA：CI 用 GITHUB_SHA，本地回退到 git，再不行用 "dev"。
function resolveBuildSha(): string {
  const ci = process.env.GITHUB_SHA;
  if (ci) return ci.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    APP_VERSION: appVersion,
    APP_BUILD_SHA: resolveBuildSha(),
  },
  webpack(config) {
    config.module.rules.push({
      test: /content[\\/]courses[\\/].*\.md$/,
      type: "asset/source",
    });

    return config;
  },
};

export default nextConfig;
