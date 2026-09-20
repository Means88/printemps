# 发布流程（GitHub Releases + printemps.dev）

## 前提

- 仓库目前是 **private**。GitHub Pages 在私有仓库需要付费计划；私有仓库的 Release 资产也无法匿名下载，electron-updater 的 GitHub provider 同样需要 token。要让 printemps.dev 对外可用，需要把 `Means88/printemps` 设为 public，或者新建一个公开的发布仓库并把 `site/app.js` 的 `REPO` 与 `package.json#build.publish` 指向它。这是产品决定，未在代码里替你做。
- macOS 包目前只签名未公证：用户首次打开要在“系统设置 › 隐私与安全性”放行一次；CI 上没有证书时为 ad-hoc 签名（提示“已损坏”），所以 macOS 资产建议用本机 Developer ID 打出的 DMG 覆盖。公证见下文。

## 发一个版本

1. 在 `main` 上把 `package.json#version` 改成新版本（例如 `0.1.2`），提交。
2. 打 tag 并推送：

```bash
git tag v0.1.2 && git push origin v0.1.2
```

3. `.github/workflows/release.yml` 会在三平台跑测试、准备运行时、`pnpm run dist`、包内分析检查，然后创建 **草稿** Release `v0.1.2` 并附上 dmg/zip/exe/AppImage/blockmap/latest*.yml。也可以在 Actions 里 `workflow_dispatch` 并填已有 tag。
4. 在本机用签名证书重打 macOS 包并覆盖草稿里的 macOS 资产：

```bash
pnpm dist --mac && gh release upload v0.1.2 release/*.dmg release/*.zip release/*.blockmap release/latest-mac.yml --clobber
```

5. 校对自动生成的说明，点 **Publish release**。`site/app.js` 读取 `releases/latest`，页面上的按钮自动指向新资产（草稿不会被读到）。

## 站点与域名

- 站点是 `site/` 下的纯静态文件（无构建步骤），`.github/workflows/pages.yml` 在 `site/**` 变更推到 `main` 时部署。2026-09-20 已通过 API 创建 Pages 站点（Source = GitHub Actions，`public: true`）、首次部署成功，并把 Custom domain 设为 `printemps.dev`；GitHub 侧已把 `means88.github.io/printemps/` 301 到 `printemps.dev`。
- 缓存：Cloudflare 代理会按 GitHub 的 `max-age=14400` 缓存 CSS/JS 四小时。HTML 里引用写成 `styles.css?v=__BUILD__`，`pages.yml` 部署时把 `__BUILD__` 替换成提交短号，所以每次部署后浏览器都会拿到新样式；HTML 本身仍可能被缓存最多 4 小时，需要立刻生效时在 Cloudflare 里 Purge Everything。
- 隐私政策：`site/privacy.html`（画板 34），部署后地址为 `https://printemps.dev/privacy`（站内链接省略 `.html`，GitHub Pages 会自动解析扩展名；本地 `python -m http.server` 预览时需手动加 `.html`）。文本按 Apple App 隐私详情结构撰写，向 App Store / Microsoft Store / 其它需要隐私条款链接的渠道提交时直接填这个地址；应用内数据处理方式变化时同步改页面并更新生效日期。
- 自定义域名：`site/CNAME` 已写 `printemps.dev`。在 DNS 侧添加：
  - `printemps.dev` A 记录 → `185.199.108.153`、`185.199.109.153`、`185.199.110.153`、`185.199.111.153`
  - `printemps.dev` AAAA 记录 → `2606:50c0:8000::153`、`2606:50c0:8001::153`、`2606:50c0:8002::153`、`2606:50c0:8003::153`
  - `www.printemps.dev` CNAME → `means88.github.io`
- `printemps.dev` 的 DNS 托管在 Cloudflare（nile/aliza.ns.cloudflare.com），当前 A/AAAA 仍指向 Cloudflare 代理地址，站点尚未生效。需要在 Cloudflare 把根域改为上面的 GitHub A/AAAA 记录（或 CNAME 到 `means88.github.io`），并把代理设为 **DNS only**（灰云）；若保留橙云代理，SSL/TLS 模式需为 Full。DNS 生效、GitHub 签发证书后，再在 Settings › Pages 勾选 **Enforce HTTPS**（API `https_enforced` 在证书签发前会返回 404）。
- 本地预览：`python3 -m http.server 8080 --directory site`。

## 公证（暂不处理，记录步骤）

设置 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`（或 App Store Connect API Key），electron-builder 会自动 notarize 并 staple。首轮公证很可能被退回并列出未签名的 Python `.so`/`.dylib`，需要为 `extraResources` 里的运行时补签名与 entitlements。通过后 `spctl -a -vv -t install Printemps.dmg` 应显示 `source=Notarized Developer ID`。
