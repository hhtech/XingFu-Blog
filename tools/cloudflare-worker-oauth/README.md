# Cloudflare Worker OAuth Gateway

这个 Worker 用来给 `blog-admin-web` 提供 GitHub OAuth 登录，不再手动输入 PAT。

## 作用

- 打开 GitHub 授权页面
- GitHub 回调后换取 access token
- 通过弹窗 `postMessage` 把 token 传回后台页面

## 你需要准备

1. 一个 Cloudflare 账号
2. 一个 GitHub OAuth App

## GitHub OAuth App 配置

在 GitHub 创建 OAuth App 时，建议这样填写：

- Homepage URL: `https://hhtech.github.io/XingFu-Blog/admin/`
- Authorization callback URL: `https://<你的-worker-域名>/auth/github/callback`

如果博客仓库是公开仓库，默认 `public_repo` scope 就够用。

## Worker 环境变量

在 Cloudflare 里配置：

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

在 `wrangler.toml` 里配置或修改：

- `ALLOWED_ORIGINS`
- `GITHUB_SCOPE`

当前默认值：

- `ALLOWED_ORIGINS = "https://hhtech.github.io"`
- `GITHUB_SCOPE = "public_repo"`

## 部署命令

在这个目录执行：

```bash
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler deploy
```

部署后会得到一个类似：

```text
https://xingfu-blog-auth.<subdomain>.workers.dev
```

## 后台配置

打开：

- `https://hhtech.github.io/XingFu-Blog/admin/`

把 Worker 地址填到后台里的：

- `OAuth Worker`

然后直接点：

- `GitHub 登录`

## 注意

- 这个方案解决的是“不手输 PAT”
- 当前 token 仍会保存在浏览器本地，用于后续直接调用 GitHub API
- 如果后续还想把 token 完全留在服务端，可以再升级成 Worker 代理 GitHub API 的方案
