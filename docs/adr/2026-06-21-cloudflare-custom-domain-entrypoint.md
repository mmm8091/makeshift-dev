# Cloudflare 自定义域名作为生产入口

- 日期：2026-06-21
- 状态：已采纳（Accepted）

## Context

第一版需要尽快让学员能访问站点并注册。默认 `workers.dev` 地址不适合作为正式入口，也不利于后续 GitHub OAuth 回调、招生传播和中国大陆用户访问排查。

项目域名 `digitalleft.org` 已在 Cloudflare 管理，当前部署目标仍是 Cloudflare Workers + D1。

## Decision

生产入口使用 `https://makeshift-dev.digitalleft.org`。

Worker 通过 Wrangler `routes` 绑定自定义域名：

- `makeshift-dev.digitalleft.org`
- `digitalleft.org`（临时别名，避免根域名返回 Cloudflare 522）

Better Auth 的生产 `baseURL` 同步改为 `https://makeshift-dev.digitalleft.org`。GitHub OAuth App 的回调地址应配置为：

```txt
https://makeshift-dev.digitalleft.org/api/auth/callback/github
```

## Consequences

- 学员访问和注册优先使用项目自有子域名，不再依赖 `workers.dev`。
- 根域名 `digitalleft.org` 暂时作为同站别名，未来可改成正式首页、招生页或跳转规则。
- Cloudflare 会处理 Worker 自定义域名绑定和证书，不需要在 DNS 里手工把根域名 CNAME 到 `workers.dev`。
- 这只是常规 Cloudflare 全球网络入口，并不等同于 Cloudflare China Network。若未来需要中国大陆境内加速节点，需要 Enterprise 计划、China Network 订阅和 ICP 备案等流程。
