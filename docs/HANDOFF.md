# Printemps 开发交接

更新时间：2026-09-20（第二轮）。本轮按上一版交接的“下一步”完成了 macOS 验收推进与新包/CI 验证；没有新增功能范围，也不宣布项目最终交付。

## 先读与当前目标

- 仓库 `/Users/means88/x/stems`，远端 `git@github.com:Means88/printemps.git`，分支 `codex/clip-workspace-desktop`。
- 先读根目录 `AGENTS.md`，再读本文件、`docs/implementation-status.md`、`docs/acceptance.md`。验收记录按时间追加，较新的证据覆盖旧的待办。
- 总目标仍是忠实还原设计并完成应用，不能宣布全部完成。用户确认：没有 Windows/Linux 桌面环境，**先完成 macOS 验收**，另两平台 GUI 验收延期。
- 所有 UI 变更先修改 Pen，再实现；不要重复询问已授权事项，不要用用户真实音频项目测试。

## 当前实现

Electron + React/TypeScript/Radix，pnpm 11.6.0，应用 ID `com.means88.printemps`。每个项目一个导入音频；本地分析、分离、试听、历史记录、导出；模型按需下载。原生菜单、自绘标题栏和系统窗口控件已实现。

支持多剪辑的非破坏式分割、裁剪。`start/end` 是源文件秒数，`offset` 是时间轴起点；右侧展示剪辑详情，分离和导出仅处理所选片段。结果范围从 0 开始，继承原 offset。二次分离隐藏来源剪辑并保留同轨其他剪辑；来源轨所有剪辑都被消费后整轨隐藏；插入剩余轨与目标轨，剩余轨命名 `{来源剪辑名} - 其它/Other`。私有媒体不得提供直接打开入口，导出创建独立副本。

BPM/调性/拍号/第一拍支持手动修改及主动分析；不自动分析。节拍器独立轨道和音量、轨道排序/隐藏、恢复、原始/分轨互斥试听均已有实现。预览是示例数据，不能证明真实播放和推理正确。

## 源码、构建与远端

- 代码检查点：**签名包与三平台 CI 对应 `049a3d8`**。其后又有一批用户反馈修正（最近项目 hover 内边距、时间码等宽数字防抖、播放头按住拖动、分离中允许定位、进度行紧凑、侧栏收起动画，见 acceptance.md “Workspace feedback fixes”），**尚未进包/CI**。049a3d8 所含改动：画板 30/03/04/13/05/07/09/10/14/15/16 偏差决定的实现（总音量扬声器图标 + 内联电平、循环范围行、起始位置剪辑颜色、首页/全部项目只计可见音轨 `visibleTrackCount`、首页引导文案与步骤行、顶栏图标顺序、声部弹窗标题/来源行/搜索/分类选中态/处理设备行、历史页副标题与“新建项目”主按钮、模型管理排序/主按钮/页脚、设置说明文字、声部搜索结果/空态、删除弹窗与空态卡、模型下载弹窗标题/计数/已缓存行、错误提示标题+图标与下载失败动作）；`src/shared/diagnostic.ts` 剥离技术详情里的 IPC 错误前缀（三个面板接入）；`src/shared/task-recovery.ts` 不再在重开时复现无部分结果的已取消分离提示。均附回归测试，96 passed / 3 skipped，生产构建通过。以 `git log -5` 查看最终检查点（其后提交只改 docs）。
- **最后推送、签名包和三平台 CI 现在都对应 `049a3d8876a57a7fd42fac5ea4c1224d48299fa4`**。18799ce 的原生回归证据仍有效（源码只在 UI 层变化），但其包与 CI 已被覆盖。
- CI：https://github.com/Means88/printemps/actions/runs/35501611789 ，三平台成功；产物 ID/哈希见 acceptance.md 最后一节，2026-09-27 过期。workflow 只在 `pull_request` 和 `workflow_dispatch` 触发，推送不会自动跑；用 `gh workflow run native-build.yml --ref codex/clip-workspace-desktop`。
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

## 设计文件

`design/Printemps.pen` 已在仓库，**加密文件禁止用文件系统读取、解析或改写**；只用 Pen MCP 编辑、原生 File → Save 保存。保留现有画板，更新对应 PNG 和索引。

- 最新 31：`OspP2`，保存/导入失败中英紧凑提示，1440×328，x4800/y11324。PNG `design/save-recovery/OspP2.png`，入口 `design/index.html`。
- 30 多剪辑工作台 `ymoeh`；29 原生窗口 `x0yR1`；03 首页 `u1mPk`；04 声部选择 `rAm7a`；05 下载 `RJx43`；08 导出 `S5oPw`；13 历史 `b1tMnW`。
- 修改先读取当前节点；复制节点会产生新 ID。显式定位曾比 fill_container 更稳定。保存后核实文件实际变化。
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
