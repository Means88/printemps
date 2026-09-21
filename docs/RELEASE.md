# 发布流程（GitHub Releases + printemps.dev）

## 前提

- 仓库目前是 **private**。GitHub Pages 在私有仓库需要付费计划；私有仓库的 Release 资产也无法匿名下载，electron-updater 的 GitHub provider 同样需要 token。要让 printemps.dev 对外可用，需要把 `Means88/printemps` 设为 public，或者新建一个公开的发布仓库并把 `site/app.js` 的 `REPO` 与 `package.json#build.publish` 指向它。这是产品决定，未在代码里替你做。
- macOS 公证已打通（2026-09-21 首次成功，凭据为 App Store Connect API Key，CI 五个 secret 已配齐）。未公证的包用户首次打开要在“系统设置 › 隐私与安全性”放行一次；配置见下文，CI 上没有证书时为 ad-hoc 签名（提示“已损坏”），所以 macOS 资产建议用本机 Developer ID 打出的 DMG 覆盖。公证见下文。

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
- 缓存：Cloudflare 代理会按 GitHub 的 `max-age=14400` 缓存 CSS/JS/图片四小时。HTML 里引用写成 `styles.css?v=__BUILD__`（`app.js`、主视觉 `assets/workspace.png` 同样加戳），`pages.yml` 部署时把 `__BUILD__` 替换成提交短号，所以每次部署后浏览器都会拿到新样式；HTML 本身仍可能被缓存最多 4 小时，需要立刻生效时在 Cloudflare 里 Purge Everything。
- 使用说明：`site/guide.html`（画板 35），地址 `https://printemps.dev/guide`。功能或快捷键变化时同步更新（快捷键表对应 `src/renderer/shortcuts.tsx` 与 `src/main/native-menu.ts`）。
- 隐私政策：`site/privacy.html`（画板 34），部署后地址为 `https://printemps.dev/privacy`（站内链接省略 `.html`，GitHub Pages 会自动解析扩展名；本地 `python -m http.server` 预览时需手动加 `.html`）。文本按 Apple App 隐私详情结构撰写，向 App Store / Microsoft Store / 其它需要隐私条款链接的渠道提交时直接填这个地址；应用内数据处理方式变化时同步改页面并更新生效日期。
- 2026-09-20 DNS 已切到 Cloudflare 并生效：`printemps.dev` 解析到 Cloudflare 代理 IP（橙云），HTTPS 由 Cloudflare 的 Google Trust Services 证书终止，回源 GitHub 正常。因为是代理模式，GitHub 侧不会签发自己的证书、Pages 的 Enforce HTTPS 也无法勾选；建议在 Cloudflare 里开 SSL/TLS → Always Use HTTPS（目前 `http://printemps.dev` 直接 200 不跳转），SSL 模式用 Full。`www.printemps.dev` 尚无记录，如需支持请加 CNAME → `means88.github.io`（代理）。
- 自定义域名：`site/CNAME` 已写 `printemps.dev`。在 DNS 侧添加：
  - `printemps.dev` A 记录 → `185.199.108.153`、`185.199.109.153`、`185.199.110.153`、`185.199.111.153`
  - `printemps.dev` AAAA 记录 → `2606:50c0:8000::153`、`2606:50c0:8001::153`、`2606:50c0:8002::153`、`2606:50c0:8003::153`
  - `www.printemps.dev` CNAME → `means88.github.io`
- `printemps.dev` 的 DNS 托管在 Cloudflare（nile/aliza.ns.cloudflare.com），当前 A/AAAA 仍指向 Cloudflare 代理地址，站点尚未生效。需要在 Cloudflare 把根域改为上面的 GitHub A/AAAA 记录（或 CNAME 到 `means88.github.io`），并把代理设为 **DNS only**（灰云）；若保留橙云代理，SSL/TLS 模式需为 Full。DNS 生效、GitHub 签发证书后，再在 Settings › Pages 勾选 **Enforce HTTPS**（API `https_enforced` 在证书签发前会返回 404）。
- 本地预览：`python3 -m http.server 8080 --directory site`。

## 公证

electron-builder 26 的 `mac.notarize` 是**禁用**开关（设 `false` 才跳过），检测到下面任一组环境变量就自动 notarize 并 staple，`package.json` 不需要改。

凭据两选一，推荐 App Store Connect API Key（不绑定个人 Apple ID，可单独吊销）：

- `APPLE_API_KEY`（`.p8` 文件**路径**）、`APPLE_API_KEY_ID`、`APPLE_API_ISSUER`
- 或 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`（本项目团队 ID 为 `FM39C6H8AH`）

先验证凭据可用，再打包：

```bash
xcrun notarytool history --key <path>/AuthKey_XXXXXXXX.p8 --key-id XXXXXXXX --issuer <issuer-uuid>
```

```bash
APPLE_API_KEY=<path>/AuthKey_XXXXXXXX.p8 APPLE_API_KEY_ID=XXXXXXXX APPLE_API_ISSUER=<issuer-uuid> \
  pnpm run dist --mac -c.directories.output=release-notarized
```

打包会阻塞等待 Apple 返回，通常几分钟。验证：

```bash
spctl -a -vv -t install release-notarized/mac-arm64/Printemps.app
```

看到 `source=Notarized Developer ID` 即通过，用户首次打开不再需要去“隐私与安全性”放行。

**DMG 本身不会被 staple**，`xcrun stapler validate <dmg>` 会说没有票据、`spctl -t install <dmg>` 会 rejected，这是 electron-builder 的既定行为（`dmg.sign` 默认 `false`，其文档说签 DMG 会与公证要求冲突），不是配置错误。Gatekeeper 评估的是用户真正启动的那个 `.app`，它已带票据。验证要对 `.app` 做，不要对 DMG 做。

2026-09-21 实测：给 DMG 打上浏览器下载的隔离属性再挂载，里面的 `Printemps.app` 仍为 `accepted / source=Notarized Developer ID`，`stapler validate` 通过。

`.p8` 是凭据：放在仓库之外，`.gitignore` 已屏蔽 `*.p8` 与 `AuthKey_*`。泄露后到 App Store Connect 吊销该密钥即可。

### 关于内置 Python 运行时

旧文档说首轮公证会因未签名的 Python `.so`/`.dylib` 被退回，这条已过时：electron-builder 会连同 `extraResources` 里的运行时一起签。2026-09-20 对 `release-b9776bd` 全量扫描，包内 62 个 Mach-O 二进制全部带 Developer ID 签名与 hardened runtime，entitlements 为 `allow-jit`、`allow-unsigned-executable-memory`、`disable-library-validation`，无会导致退回的 `get-task-allow`。

### CI

`release.yml` 两条路径都接好了。用 API Key 时在仓库 secrets 里设 `APPLE_API_KEY_P8`（`.p8` 全文）、`APPLE_API_KEY_ID`、`APPLE_API_ISSUER`；工作流会把密钥写进 `RUNNER_TEMP` 的临时文件、把路径传给 electron-builder，并在构建后无条件删除。用密码路径则设 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`。两种都需要 `CSC_LINK` / `CSC_KEY_PASSWORD` 提供 Developer ID 证书，否则 macOS 构建仍是 ad-hoc 签名且不会公证。
