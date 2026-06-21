import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

void initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.module.rules.push({
      test: /content[\\/]courses[\\/].*\.md$/,
      type: "asset/source",
    });

    return config;
  },
};

export default nextConfig;
