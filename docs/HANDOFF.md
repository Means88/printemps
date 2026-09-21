# Printemps 开发交接

更新时间：2026-09-20（第二轮）。本轮按上一版交接的“下一步”完成了 macOS 验收推进与新包/CI 验证；没有新增功能范围，也不宣布项目最终交付。

## 先读与当前目标

- 仓库 `/Users/means88/x/stems`，远端 `git@github.com:Means88/printemps.git`，工作分支 `codex/clip-workspace-desktop`；2026-09-20 已快进合并到 `main`（`a0328d6`），之后两分支同步推进。
- 先读根目录 `AGENTS.md`，再读本文件、`docs/implementation-status.md`、`docs/acceptance.md`。验收记录按时间追加，较新的证据覆盖旧的待办。
- 总目标仍是忠实还原设计并完成应用，不能宣布全部完成。用户确认：没有 Windows/Linux 桌面环境，**先完成 macOS 验收**，另两平台 GUI 验收延期。
- 所有 UI 变更先修改 Pen，再实现；不要重复询问已授权事项，不要用用户真实音频项目测试。

## 当前实现

Electron + React/TypeScript/Radix，pnpm 11.6.0，应用 ID `com.means88.printemps`。每个项目一个导入音频；本地分析、分离、试听、历史记录、导出；模型按需下载。原生菜单、自绘标题栏和系统窗口控件已实现。

支持多剪辑的非破坏式分割、裁剪。`start/end` 是源文件秒数，`offset` 是时间轴起点；右侧展示剪辑详情，分离和导出仅处理所选片段。结果范围从 0 开始，继承原 offset。二次分离隐藏来源剪辑并保留同轨其他剪辑；来源轨所有剪辑都被消费后整轨隐藏；插入剩余轨与目标轨，剩余轨命名 `{来源剪辑名} - 其它/Other`。私有媒体不得提供直接打开入口，导出创建独立副本。

BPM/调性/拍号/第一拍支持手动修改及主动分析；不自动分析。节拍器独立轨道和音量、轨道排序/隐藏、恢复、原始/分轨互斥试听均已有实现。预览是示例数据，不能证明真实播放和推理正确。

## 源码、构建与远端

- 代码检查点：**签名包与三平台 CI 对应 `049a3d8`**。其后有两批用户反馈修正（见 acceptance.md “Workspace feedback fixes” 与 “Second feedback round”），本地包 `9da5785` 含第一批；第二批（顶栏图标固定、logo 回首页、设备探测、导出对齐/导出音轨、字号缩小、返回箭头等）与设计系统 token 化**尚未进包**（本轮末尾会再打一次本地包），CI 按用户要求暂不触发。049a3d8 所含改动：画板 30/03/04/13/05/07/09/10/14/15/16 偏差决定的实现（总音量扬声器图标 + 内联电平、循环范围行、起始位置剪辑颜色、首页/全部项目只计可见音轨 `visibleTrackCount`、首页引导文案与步骤行、顶栏图标顺序、声部弹窗标题/来源行/搜索/分类选中态/处理设备行、历史页副标题与“新建项目”主按钮、模型管理排序/主按钮/页脚、设置说明文字、声部搜索结果/空态、删除弹窗与空态卡、模型下载弹窗标题/计数/已缓存行、错误提示标题+图标与下载失败动作）；`src/shared/diagnostic.ts` 剥离技术详情里的 IPC 错误前缀（三个面板接入）；`src/shared/task-recovery.ts` 不再在重开时复现无部分结果的已取消分离提示。均附回归测试，96 passed / 3 skipped，生产构建通过。以 `git log -5` 查看最终检查点（其后提交只改 docs）。
- **最后推送、签名包和三平台 CI 现在都对应 `049a3d8876a57a7fd42fac5ea4c1224d48299fa4`**。18799ce 的原生回归证据仍有效（源码只在 UI 层变化），但其包与 CI 已被覆盖。
- CI：https://github.com/Means88/printemps/actions/runs/35501611789 ，三平台成功；产物 ID/哈希见 acceptance.md 最后一节，2026-09-27 过期。workflow 只在 `pull_request` 和 `workflow_dispatch` 触发，推送不会自动跑；用 `gh workflow run native-build.yml --ref codex/clip-workspace-desktop`。
- **CI 发布链路已跑通（2026-09-21，run 35548906860，提交 `352342b`）**：三平台全绿，草稿 Release `v0.1.1` 含 DMG 359 MB、mac zip 369 MB、AppImage 495 MB、Windows exe 328 MB 及 blockmap 与 `latest*.yml`。macOS 日志有 `notarization successful`，Apple 侧对应记录 Accepted。**草稿尚未发布**；发布前需决定仓库是否转 public（匿名下载与 electron-updater 需要）。
- **已公证的包（2026-09-21，源码同 b9776bd）**：`release-notarized/`（DMG 373.6 MB、zip 383.7 MB），Developer ID 签名 + 公证 + staple。`spctl -a -vv -t install` 对 `.app` 返回 `accepted / source=Notarized Developer ID`。DMG 本身按设计不 staple，验证要对 `.app` 做。公证配置与 CI secrets 见 `docs/RELEASE.md`。
- **最新本地包（2026-09-20，提交 b9776bd）**：`release-b9776bd/`（DMG 373.6 MB），Developer ID 签名、深度严格校验通过、未公证；`app.asar` SHA256 `bfdbab43a538cd88ae7e…`，包内 `out/main/index.js` 与本地构建逐字节一致，渲染样式含 34px/13px 按钮基线、`.switch` 豁免与节拍器行 14px。
- 上一包（提交 05ea070）：`release-05ea070/`（DMG 373.6 MB、zip 383.7 MB、blockmap、latest-mac.yml），Developer ID 签名、深度严格校验通过、未公证；`app.asar` SHA256 `bff7c4f81e57d5671a4b…`，包内 `out/main/index.js` 与本地构建逐字节一致，含分析结果直接应用、36px 控件与 14px 箭头、网络代理。
- 上一包（提交 b17e7bb）：`release-b17e7bb/`（`pnpm run dist --mac -c.directories.output=release-b17e7bb`）：`mac-arm64/Printemps.app`、`Printemps-0.1.1-arm64.dmg`（373.6 MB）、`-mac.zip`（383.7 MB）、两份 blockmap、`latest-mac.yml`。Developer ID 签名，`codesign --verify --deep --strict` 通过，`spctl` 为 Unnotarized Developer ID（未公证，预期）。`app.asar` SHA256 `8ec1ff2a9c2a5f3c5f86f642de7f6bf8de978ca22a4914eab6f355aae7383693`，含网络代理、导出音轨/对齐、MPS 修复等 a0328d6 之后的全部改动；包内 worker 为 select_chunk 版本。隔离 profile 启动包内应用：设置页出现「网络代理」，切自定义并填 socks5 地址后 settings.json 落盘 `proxyMode:manual`。**注意**：第一次 `pnpm run dist` 用默认输出目录时 electron-builder 清理 `release/mac-arm64` 报 ENOTEMPTY 失败，旧 049a3d8/a0328d6 包已被清掉；以后打包请用 `-c.directories.output=release-<commit>`（`.gitignore` 已加 `release-*/`），不要覆盖正在运行的包目录。
- 本地签名包 `release/mac-arm64/Printemps.app`（Developer ID，未公证），`app.asar` SHA256 `2004d3f922567161422afd9b181a6ea7f8ae7c16c107dc6a2e785c7aa57d5cf6`。日志：`/tmp/printemps-049a3d8-package.log`、`-signature.log`、`-packaged-analysis.log`；18799ce 的日志 `/tmp/printemps-18799-*.log` 仍在。
- `out/` 由本轮 `pnpm package` 重建，与源码一致。

## 本轮完成的 macOS 验收（详见 acceptance.md 末尾两节）

1. 检查了上一轮恢复分离的完成画面：Other/Drums 各 0.75 s、offset 4.25，来源片段隐藏、同轨 2 秒片段保留。
2. IME：用 CDP `Input.imeSetComposition` 走 Chromium 真实组合管线，剪辑名和项目名在组合期间 Enter/Escape 不提交不失焦，提交中文后保存落盘（`你好世界`、`测试项目`）。**这不是物理拼音候选窗实操**，那一项仍需用户本人或有屏幕控制的环境确认。
3. 真实播放：原生窗口 AudioContext running、默认输出设备（MacBook Air 扬声器）outputLatency 26 ms，母线分析仪读到真实信号；节拍器 120 BPM 每 0.499 s 一次点击，峰值与 −12 dB×母线增益一致。**证明信号到达系统默认设备，不证明人耳听感。**
4. 签名包 18799ce 原生验收（第一批）：原生文件选择器导入 40 字节损坏 WAV → 紧凑横幅 52 px（展开 72.5 px），项目目录无残留；真实 drums 分离 33% 时 `kill -9` 主进程 → 包内 Python 1 s 内退出 → 重启恢复 interrupted 并保留 `clipId` → Retry 重开预选声部弹窗 → Start 完成（~48 s），结果 0–2 s、offset 8，来源轨全部片段消费后整轨隐藏。Cmd+Q 1 s 内退出，无 singleton 锁和残留进程。
5. 签名包 18799ce 原生验收（第二批，acceptance.md 最后一节）：Source out 精确裁剪落盘并复原；FLAC 剪辑经真实文件夹面板导出 0.75 s 24-bit，面板 Escape 取消后无文件、弹窗回到空闲；项目目录只读 → 改名 → 紧凑 EACCES 横幅 → 恢复权限 → Retry save 落盘 → Cmd+Q → 重启保留；缓存 bass 二次分离 33% 取消 → Python 3 s 内退出、任务 cancelled、来源片段保留、无新轨、Dismiss 清除提示。
6. 中文工作台对照画板 30 的 5 处偏差已做设计决定并实现（决定表见 acceptance.md “Board 30 deviation decisions implemented”）：缩放按钮组、导出文案、去掉提示行改在 Pen 侧同步；扬声器图标 + 内联电平、循环范围行、起始位置剪辑颜色、首页可见音轨计数在应用侧实现。1440×900 与 1280×800 已复核。
7. 全部画板对照完成：03/04/08/13/02（acceptance.md “Boards 03 / 04 / 08 / 13 / 02…”）与 05/07/09/10/14/15/16（“Boards 05 / 07 / 09 / 10 / 14 / 15 / 16…”）。02 仅作尺寸参考、11 为交互规范表，未重构。模型下载与下载失败状态通过 `preview.html?separationDownloadPreview=1` 夹具在内置浏览器验证，不是真实下载。
8. 排除了一个疑似缺陷：关窗后用 AppleScript `tell application "Electron" to quit` 不退出，是因为本机还运行着另一个同名 Electron 进程（见下），对 QA 进程直接 Cmd+Q 正常退出。

## QA 自动化方法（可复用）

- UI 夹具预览入口是 `http://127.0.0.1:5174/preview.html?...`（不是 `/`）；本机已有一个长期运行的 `vite --config scripts/preview.vite.mjs`（端口 5174），可直接用内置浏览器访问；参数见 `preview/main.ts`（`separationDownloadPreview=1`、`saveFailure=once`、`importFailure=once`、`taskStates=1` 等）。

- 没有桌面 CUA 工具时，用 `--remote-debugging-port=<port>` 启动应用，再用 Node 内置 WebSocket 连 CDP 驱动渲染层（点击、读取文本、截图、IME 组合、Input.dispatchKeyEvent）。原生文件面板用 System Events：`keystroke "g" using {command down, shift down}` → 输入路径 → 两次 return；Cmd+W/Cmd+Q 也用 System Events 针对具体 unix id 发送，避免同名进程歧义。
- 本轮脚本在会话临时目录 `/private/tmp/claude-501/-Users-means88-x-stems/79386748-aa6e-47c6-b16e-5107bb3bb98a/scratchpad/`（`cdp.mjs`、`ime-test.mjs`、`audio-test.mjs`、`click-timing.mjs`、`import-fail.mjs`、`separate.mjs`），可能被清理；需要时按上述方法重写即可，不要提交到仓库。
- Retry 中断分离的语义是“重开 Choose stems 并预选来源剪辑与声部”，需再点 Start separation；不要把它误判为失败。

## 留下的 QA 环境

- 所有 QA 应用均已退出；无待完成的 CI、打包任务。
- 隔离 profile `/var/folders/hh/0nr41s6j25d6xp6g97dq9m0w0000gn/T/printemps-close-native-xa56q9gc`（路径亦在 `/tmp/printemps-close-native-path.txt`）。项目 `e0691b7b-…` 现名 `测试项目`，BPM 120、节拍器开、5 条可见轨，历史两次分离均 complete。
- 应用副本：`/private/tmp/Printemps-049a3d8-QA.app`（当前签名包 APFS 克隆）、`/private/tmp/Printemps-18799-QA.app`（上一版）、`/private/tmp/Printemps-Close-QA.app`（Electron 运行时 + 仓库 `out/`）。重开时显式传 `--user-data-dir` 上述 profile；后者还要传仓库路径作为第一个参数。
- 模型缓存 `/Users/means88/x/stems/.cache/model-reference/v1`（drums/bass），已在 QA settings.json 中指定；不要重复下载。
- 损坏音频夹具 `/tmp/printemps-invalid-audio-qa.wav`（40 字节）。
- 本机另有一个不属于本轮的旧开发实例在运行：`node node_modules/.bin/electron . --user-data-dir=/tmp/printemps-native-menu-qa`（PID 51019/51020，已运行 4 小时以上），进程名也叫 Electron。没有动它；如确认无用可由用户关闭。
- 临时路径可能被系统清理；不要提交缓存、私有音频、运行时或安装包。

## Pen 设计稿整理（2026-09-20）

- 删除：空画板 `bi8Au`、`k5wPO`（08 archive 整轨导出旧稿）、`mnZnS`（01 旧工作台）、`TrsWn`（19 早期分析页方案）、`Ac4ta`（23 中间修订稿）。对应的 `exports/01-*`、`exports/19-*`、`screens/01|19|06|20|21-*.html`（过时静态导出）与 `workspace-revision/*.png` 副本已删；旧稿仍可从 git 历史取回。
- 重建（Copy 自画板 30 再改内容，因此 nodeId 变了）：06 `pV6c6`（紧凑分离进度行 60px，鼓组/贝斯 42%）、20 `HjUpo`（刻度改小节 1,9,17…，时间格式"小节与拍"）、21 `PB14C`（仅原始音轨，剪辑详情为原始音频）、24 `Y5roB`（所有音轨弹窗覆盖在 30 上）、25 `UJXIc`（节奏与调性弹窗，字段 36px）。22B `lcLVd` 顶栏与返回箭头改为画板 13 样式。
- 登记：`screens.json` 现有 34 条，新增 22B、24–31；PNG 全部在 `design/exports/`，`design/index.html` 按钮已改指向。画板 30 `ymoeh` 仍是工作台基准；02 `aA8yW` 仅作 1280×800 尺寸参考。
- **教训（2026-09-20 晚）**：第一次整理后的 Pen 修改在提交时丢失了——`git checkout main` / 合并 / 切回的过程会让工作树里的 `Printemps.pen` 先回退再前进，Pen 会跟着从磁盘重载，未落盘的内存修改被覆盖。整理已重做。之后合并到 main 一律用 `git push origin codex/clip-workspace-desktop:main`（不切分支、不触碰工作树），并在每次原生保存后用 `Get` 重新列一次顶层节点确认修改在文档里。
- 画板 09 新增「应用更新」行（当前版本 + 34px「检查更新」按钮），完成按钮下移，画板高 1040。
- 已知：画板 30 内有若干 `enabled:false` 的历史节点（试听结果、在文件夹中显示、Other 轨等），复制出的新板也带着，不影响渲染；如需彻底清理可在 30 上删除后再同步。

## 发布页与发布流程

- `site/` 是 printemps.dev 静态站（画板 33 `f2cQi`），`pages.yml` 部署（Pages 已启用并首次部署成功，Custom domain 已设为 printemps.dev，DNS 已于 2026-09-20 切到 Cloudflare 代理并生效，站点与 `/privacy` 在线；CSS/JS/主视觉带 `?v=<commit>` 缓存戳），`release.yml` 按 `v*` tag 出三平台草稿 Release；流程与 DNS 见 `docs/RELEASE.md`。`site/privacy.html` 是独立隐私政策页（画板 34 `VE9BB`，1440×2295），按 Apple App 隐私详情的数据类型分类写成 13 节（结论“不收集数据”，列出设备上处理的数据、Hugging Face/GitHub 两类联网、保留与删除、权限、追踪、儿童、权利、网站、变更、联系），中英双语共用 `printemps-lang` 语言偏好；导航“隐私”、首页隐私摘要与页脚均链到它，供以后上架需要隐私条款链接的渠道使用。首页 GitHub 链接改为图标。`site/guide.html` 是完整使用说明页（画板 35 `VeLMf`，14 节，中英，含快捷键表），导航/页脚/首页按钮均已链接；改功能或快捷键时要同步这页。**仓库仍是 private**：Pages 与匿名下载需要公开仓库或付费计划，这是待用户决定的事项。公证暂不处理。

## 网络代理（模型下载）

- 设置新增「网络代理」：`proxyMode` = `system` / `direct` / `manual` + `proxyUrl`（`src/shared/domain.ts`），`SettingsService.save` 用 `normalizeProxyUrl` 规范化地址（支持 http/https/socks4/socks5，可带用户名密码，无路径）。
- 主进程用独立 session `printemps-downloads` 承载模型下载：`applyProxy()` 在启动与每次 `settings:save` 后调用 `session.setProxy(proxyConfig(...))`；`ModelCache` 的 fetcher 换成 `createDownloadFetcher(net.request)`（`src/main/download-fetch.ts`），走 session 代理、回答代理 `login` 挑战（凭据来自地址）、支持 AbortSignal。更新检查仍走默认 session（系统代理），未纳入此设置。
- 画板 09 `WbwXU` 增加代理行（高度改为 1000），设置页副标题同步为「语言、处理设备、网络代理与存储位置」；使用说明 §12/§14、隐私政策 §5 已提及。
- 验证：单元测试（`tests/proxy.test.ts`、`tests/download-fetch.test.ts`、`tests/settings.test.ts`）+ 真实 Electron 运行时端到端（scratch 脚本起本地 HTTP 代理与源站：manual 经代理、direct 不经代理、地址带凭据时 407 → login → 带 Basic 重试成功、无凭据时返回 407）。注意 Chromium 默认不代理 loopback 地址，测试时需 `proxyBypassRules:'<-loopback>'`；真实下载目标是 huggingface.co，不受影响。未在真实上游代理软件上验证。

## 处理设备

- MPS 曾“卡死”：20 秒推理 chunk 的注意力激活超出统一内存导致抖动。`worker/separate.py` 的 `select_chunk` 在 MPS 上封顶为 10 秒（`audio.chunk_size`），显存预算 <12 GB 时 5 秒；每个声部后 `torch.mps.empty_cache()`。实测 MPS 19.7 s vs CPU 45.3 s（10 秒合成音频，drums），应用内真实分离 25 s 完成。仍标“实验性”，`自动选择` 不会选 MPS。
- 进度：Transformer 层 forward hook 发出 chunk 内子进度；协议事件写 `sys.__stdout__`（模型输出被重定向到 stderr 时也不丢）。
- 备选：pymss 的 MLX 后端（`mlx>=0.31.0`，失败回退 Torch MPS）。若需更快或更稀释内存，可评估 MLX 版 BS-Roformer；未开始。

## 设计系统与 lint

- 规范：`docs/DESIGN.md`（宏观规则）+ `AGENTS.md` “设计系统与规范”；token 在 `src/renderer/tokens.css`，`style.css` 只引用 `var(--token)`。
- 门禁：`pnpm lint` = `oxlint`（`@shadcn/lint`，检查 TSX className）+ `scripts/design-lint.mjs`（检查 `style.css` 的原始颜色/刻度外数值/裸动效与 TSX 内联主题色），当前 0 违规；发现即修，不放宽。
- Tailwind v4 仅提供映射到 token 的工具类（`src/renderer/tailwind.css`，无 preflight）；新界面布局类可用，主题值仍来自 token。
- 已知副作用：`pnpm add` 重新链接后 `node_modules/.bin` 目标曾丢失可执行位，`chmod +x` 即可。

## 设计文件

`design/Printemps.pen` 已在仓库，**加密文件禁止用文件系统读取、解析或改写**；只用 Pen MCP 编辑、原生 File → Save 保存。保留现有画板，更新对应 PNG 和索引。

- 最新 31：`OspP2`，保存/导入失败中英紧凑提示，1440×328，x4800/y11324。PNG `design/save-recovery/OspP2.png`，入口 `design/index.html`。
- 30 多剪辑工作台 `ymoeh`；29 原生窗口 `x0yR1`；03 首页 `u1mPk`；04 声部选择 `rAm7a`；05 下载 `RJx43`；08 导出 `S5oPw`；13 历史 `b1tMnW`。
- 修改先读取当前节点；复制节点会产生新 ID。显式定位曾比 fill_container 更稳定。保存后核实文件实际变化。
- 新增画板 32（`b8troH`，导出音轨）；画板 08 加“对齐”行；画板 10 六张卡按钮改右对齐、primary 在右；画板 13 加返回箭头；画板 03 去掉问号；画板 30 顶栏图标移入标题栏。
- 本轮改动画板 03（`u1mPk`）、04（`rAm7a`）、08（`S5oPw`）、13（`b1tMnW`）、02（`aA8yW`）、07（`N9u2S`）、09（`WbwXU`）、14（`T3jqc`）的文案/控件与应用同步，PNG 已重新导出到各自目录及 `design/exports/`。**画板 04/13 的控件是画板帧的直接子节点而非对话框面板的子节点，Copy 时必须放到同一父节点，否则渲染错位。**
- 本轮改动画板 30（`ymoeh`）：新增缩放按钮组（Copy 自 Split 按钮/标签）、删除提示行与示例注释、导出文案、起始位置颜色；已用原生 File → Save 保存并重新导出 `design/workspace-revision/ymoeh.png`，README 已注明。**注意：在该画板直接 Insert 新文本节点会出现 +50px 的 y 偏移并渲染错位，用 Copy 现有文本节点再改内容则正常。**

## 已知小问题

- 已修（源码，未进包）：技术详情曾带 IPC 包装前缀 `Error invoking remote method '…': Error:`；现由 `diagnosticDetail` 统一剥离。
- 已修（源码，未进包）：用户主动取消且无部分结果的分离，重开项目时不再反复显示“分离已取消”提示；失败任务与有部分结果的取消仍会复现供重试。
- 已修（源码，未进包）：首页/全部项目的音轨数只计工作台可见的音轨，与“音轨 / 05”一致。
- 预期行为：Original 试听模式下分轨列表整体置灰（互斥试听）；中断分离的 Retry 会重开 Choose stems 预选来源与声部，需再点 Start separation。

## 下一步（按优先级）

1. 把“Workspace feedback fixes”一批修正连同后续改动合并为下一次新包/CI；049a3d8 是最近一次已打包的检查点。
2. 画板对照已全部完成；后续设计变更走同样流程（先 Pen 后代码，PNG 重新导出）。
3. 可选：在 049a3d8 签名包上重跑一遍 18799ce 已过的原生回归（导入回滚、强杀恢复、裁剪/导出、EACCES、取消），本轮只做了变更屏幕的复核。
4. 仍缺原生证据：导出写入失败（磁盘满/只读导出目录）、离线缺模型下载失败、拖放导入。
5. 持续在 acceptance.md 和 implementation-status.md 区分已测/未测。物理输入法候选窗、人耳听感、Windows/Linux 桌面、真实差分升级、公证/公开发布不能冒充完成。
