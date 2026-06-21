import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 付费课程正文不进入构建产物，公开内容走静态/服务端渲染。
  // 部署目标为 Cloudflare Workers（@opennextjs/cloudflare），后续接入时再补适配。
};

export default nextConfig;
