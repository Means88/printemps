# Printemps 项目约定

## 产品与范围

- Printemps 是 Windows、macOS、Linux 的 Electron 音频分离与试听应用。仓库为 `Means88/printemps`，应用标识符为 `com.means88.printemps`。
- 每个项目只导入一个音频；导入后直接进入工作区。基本功能（分析、分离、播放、项目记录、导出）在本地完成；模型按需下载并缓存，应用更新可联网。
- 支持非破坏式分割及首尾裁剪；不提供录音或插件系统，不自动分析 BPM/调性。分析由用户主动启动。
- 用户文案支持简体中文和英文。常驻界面仅保留必要标签、状态及错误操作；详细教程留给后续网站。

## 设计与交互

- 界面变更先修改 Pen 设计，再忠实实现。设计源是 `design/Printemps.pen`，禁止直接解析或改写加密 `.pen` 内容；用 Pen 工具操作并保存。保留现有画板，按当前分区整理，更新相关 PNG/说明。
- 设计索引见 `design/README.md` 和 `design/workspace-revision/README.md`；历史说明可能被较新的用户要求覆盖。
- 暗色、圆润 DAW 风格，蓝色主操作，Printemps 渐变笔刷品牌。复用现有 React/Radix 控件、图标与样式，不另造一套按钮。
- 同组操作只保留一个 primary。弹窗底部操作靠右，secondary 在 primary 左侧；保持紧凑尺寸和一致间距。
- 中文主工作台 1440×900，同时检查 1280×800 和英文长文案。选中滑块、进度条有平滑动画，进度末端圆角。
- 原始/分轨切换是试听模式：另一组操作禁用并置灰。静音波形置灰，可试听轨道保留稳定颜色。
- 项目名、音轨名支持 inline 编辑。所有音轨列表支持拖动排序、显示/隐藏、删除，颜色对应波形。
- 节拍器开启后作为最上方音轨显示，其音量使用相同推子交互；循环和出入点在底部播放控件旁。
- BPM、调性、拍号、第一拍位置可手动调整。计算推荐值保留并在选择项标星；未分析时显示“分析”，之后可以复位全部音乐参数到推荐值。
- 顶栏采用自绘 header + 原生窗口控件叠加（Pen 画板 29）：macOS 按钮在左，Windows/Linux 在右；预留系统安全区域，空白可拖动、控件 no-drag，不绘制假系统按钮。
- 原生菜单由 Electron 绘制；菜单语言、勾选、禁用状态与工作区一致。空格等单键快捷键仅在工作区生效，避免抢占输入框和弹窗操作。

## 设计系统与规范

- 设计系统是事实来源，不是记忆。颜色、字号、圆角、间距、时长只在 `src/renderer/tokens.css` 写一次字面量；`style.css` 与所有新样式只引用 `var(--token)`。不写 `#hex`、不写刻度外的 `font-size`/`border-radius`/`gap`/`padding`、不发明 cubic-bezier。
- 字号刻度 `--text-2xs…--text-display`（11/12/13/14/16/18/20/22/30），一屏最多三档；圆角表 sm 3 / md 8 / lg 10 / xl 12 / 2xl 16 / pill；间距刻度 `--space-*`（4…40）。缺档就说出来，不要写死。
- 组合现有控件（button、`.icon`、`.segments`、`.fader`、`.dialog`、`ErrorNotice`、`SaveRecovery`），className 只做布局；改颜色/内边距/形状/字号要在组件里加变体并注释原因。TSX 的 `style={{}}` 只放几何与数据颜色（`--clip-color`、音轨色），不放主题色。
- 一屏一个 primary；操作区右对齐、primary 在最右、secondary 在其左（弹窗、卡片、通知条一律如此）。每条边只用一种分界线索，两级深度，卡里不套卡，兄弟之间不画线。
- 宏观规则见 `docs/DESIGN.md`；改任何界面之前先读，改完对照 1–8 节逐项自查（中文 1440×900 / 1280×800 与英文长文案）。
- 机械检查：`pnpm lint`（`oxlint` + `@shadcn/lint` 检查 TSX className；`scripts/design-lint.mjs` 检查 `style.css` 与 TSX 内联主题色）。发现即 bug，用 token 或变体修，不得放宽规则、不得加 disable 注释。Tailwind v4 仅提供映射到 token 的工具类（`src/renderer/tailwind.css`，无 preflight），新界面的布局类可以用它；主题值仍来自 token。

## 音频与数据规则

- 原始音频和分离结果存于应用私有目录，不提供直接打开结果文件的入口。
- 诊断日志只在内存中保留本次运行的失败记录，**应用不上报任何数据**；用户在设置里主动导出为文件，自行附到 GitHub issue。导出内容经 `src/main/diagnostics.ts` 的 `redact` 脱敏：去掉用户名、家目录路径、音频文件名与项目 UUID，因为它会被贴到公开 issue 里。不要引入自动崩溃上报或分析 SDK，隐私政策对此有明确承诺。导出 WAV/FLAC 创建独立副本，外部修改不得影响试听。
- 分离模型使用 `noblebarkrr/BS-Roformer-MVSep-Mega-53-stems` 的 v1，按所选声部下载并验证；不默认下载整套模型。下载源可在设置里改（huggingface.co / hf-mirror.com / 自定义），但**仓库与 revision 始终来自 `model-manifest.json`，校验和不变**，换源不等于换模型。
- 分离必须展示剩余“其它”音轨。二次分离完成后保留并隐藏来源剪辑，在原位置插入剩余轨和目标轨；同轨其它剪辑保留，仅所有剪辑隐藏时隐藏来源轨，继承所需混音设置；失败/取消保留可恢复来源。
- 二次分离剩余轨命名为 `{来源剪辑当前名称} - 其它`，英文为 `{来源剪辑当前名称} - Other`。
- 声部选择和模型下载用弹窗；推理回工作区，以 loading 音轨显示进度，完成声部可试听。
- 主进程与 Python worker 之间用 UTF-8 通信：`runJsonWorker` 固定设 `PYTHONIOENCODING=utf-8`。Python 3.14 在 Windows 上仍按区域代码页解码 stdio，GBK 这类双字节页会把奇数个非 ASCII 字节后的反斜杠当成尾字节吞掉，使转义过的路径分隔符变成非法 JSON 转义——路径里有一个中文字符就足以让分离失败。不要移除这个环境变量。
- 分离、分析任务由主进程调度；长任务不要阻塞界面。保存、关闭、切换项目和任务恢复须保留现有防丢失行为。
- 三个平台的内置运行时统一是 **CPU 版 torch**：Linux 的默认 PyPI 轮子会捆绑整套 NVIDIA CUDA 运行库（约 2.5 GB），使 AppImage 超过 GitHub Release 单文件 2 GiB 上限，所以 `worker/requirements.txt` 用直接轮子 URL 钉 Linux 与 Windows 的 CPU 版 torch/torchaudio（macOS 走 PyPI）。不要为了 GPU 把 CUDA 轮子放回默认包，也不要改成 `--extra-index-url` + `unsafe-best-match`：那会让 macOS 的 torch 在两个源之间产生哈希歧义。
- GPU 由用户在设置的「推理环境」里指定自备 Python 环境提供，**只作用于分离**；ROCm 版 PyTorch 通过同一套 `torch.cuda` 接口暴露 AMD 显卡，所以设备值仍是 `cuda`，界面名称由 `device_probe.py` 报告的 `backend`（`torch.version.hip` 区分）决定，不要把标签写死成 NVIDIA。分析始终用内置运行时（它带固定版本的节拍模型）。`worker/device_probe.py` 校验该环境是否具备 separate.py 与内置 BS-Roformer 所需的包，缺包要明确列出而不是让分离崩掉。
- Beat This 用于节拍分析，Essentia WASM 用于调性分析。小型分析资源随包携带；不要将模型推断值当作绝对正确的乐理事实。

- 音轨包含多个剪辑；`start/end` 是私有源文件内的秒数，`offset` 是项目时间轴上的起点。分割与裁剪只修改元数据，试听按 source range 与 offset 映射，空隙静音。
- 右侧为剪辑详情；分离、导出只处理选中的可用剪辑。结果内部范围从 0 开始，时间轴 offset 继承源剪辑；导出不补齐时间轴前导静音。旧项目未保存 clips 时按整段单剪辑兼容。

## 代码结构与边界

- `src/main/`：Electron 主进程、私有存储、IPC 校验、模型缓存、任务调度、导入导出和更新。
- `src/preload/`：受限类型化桥接；保持 context isolation、sandbox，禁止 renderer 直接访问文件系统/Node。
- `src/shared/`：数据契约、Zod 校验、声部目录、时间轴及纯领域逻辑。
- `src/renderer/`：React/TypeScript、Radix、音频引擎和 UI；`preview/` 为独立示例入口。
- `worker/`：Python 推理/分析与 Node/WASM 子进程。`worker/requirements.lock` 是带哈希的 Python 锁文件，不是 JS 锁文件。
- `scripts/`：运行时准备、打包预检和集成检查。`tests/`：Vitest 单元/集成测试。
- IPC 参数需验证，私有媒体通过受控协议读取；不可为方便预览放宽权限或暴露私有目录。

## 包管理与命令

- 统一使用 **pnpm 11.6.0**，版本由 `package.json#packageManager` 固定；Node.js >=22.12，CI 用 Node 24。
- 唯一 JS 依赖锁文件为 `pnpm-lock.yaml`，不要生成 `package-lock.json` 或 yarn 锁文件。新增依赖使用 `pnpm add` / `pnpm add -D` 并提交锁文件。
- `pnpm-workspace.yaml` 使用 hoisted 布局，以兼容 Electron 打包及 worker 的资源路径；依赖安装脚本只显式允许必要包，不要全局放开。
- 初次安装：`corepack enable`，随后 `pnpm install --frozen-lockfile`。
- 桌面开发：`pnpm dev`；UI 示例：`pnpm preview:ui`（5174 端口，`?lang=en`）。
- 基础检查：`pnpm test`、`pnpm run build`（含 TypeScript 检查）；单独类型检查 `pnpm typecheck`。
- 首次 Python 环境及分析资源准备按 `README.md`，Windows 使用 `.venv/Scripts/python.exe`。
- 准备打包运行时：`pnpm runtime:prepare`；真实分析检查：`pnpm test:integration`。
- `pnpm package` 生成解包应用；`pnpm dist` 生成安装包，两者均 `--publish never`。额外参数直接追加，例如 `pnpm run dist --linux AppImage --x64`。
- 打包使用当前平台/架构的 `.runtime`，不要把某平台 Python/原生二进制复制到另一平台。
- GitHub Actions 和 Linux 容器验证脚本必须与本地 pnpm 命令、冻结锁文件安装保持一致。

## 验证与交付

- 修改领域逻辑或 IPC 后运行相关测试及构建；对低风险样式修改做视觉检查，不写机械重复实现的测试。
- 涉及依赖/打包时检查 Electron、ffmpeg 和 Essentia 资源能被打包和加载，不能只以 renderer 构建成功为依据。
- 真实模型测试需显式提供缓存：`PRINTEMPS_TEST_MODELS=/absolute/path/to/models pnpm exec vitest run tests/progressive-runtime.test.ts`。不得为普通测试擅自下载整个模型集。
- `PRINTEMPS_TEST_RESOURCES` 可指向解包应用的资源目录，以验证实际打包资源。
- 预览使用示例波形、内存数据和静音播放，不能证明原生 IPC、持久化、真实声音、推理和导出正确。
- 合成音频 smoke test 只证明管线，不能声称真实歌曲质量或硬件性能。实测配置资料见 `docs/system-requirements-notes.md`。
- 验收证据与未完成项记录在 `docs/acceptance.md`、`docs/implementation-status.md`；区分当前代码与旧构建，不将历史绿灯当作当前版本通过。
- 安装包构建不等于安装、设备音频、签名/公证、发布或真实增量升级验收；如未验证，明确说明。
- 不改动用户真实音乐项目做测试，不提交运行时、模型权重、缓存、私有音频或生成的安装包。
- 应用更新沿用 Electron updater 的差分下载及全量回退，不额外建设独立分析工具版本管理系统。

## 剪辑来源恢复

- 音轨列表重新显示“所有片段均被分离隐藏”的来源轨时，必须同步恢复保留剪辑，不能只恢复空轨道。部分片段仍可见的音轨，普通隐藏/显示不得重新显示已消费的旧片段，以免重复试听。

## Agent 编排

- 三个角色定义在 `agents/`：[`designer`](agents/designer.md)（画板与交互规则的唯一所有者）、[`engineer`](agents/engineer.md)（只实现）、[`qa`](agents/qa.md)（只验收）。每个文件就是该角色的提示词，内容与具体工具无关。编排者是主会话：拆任务、传变更单、提交代码、向用户汇报；子 agent 的报告用户看不到，结论要由编排者转述。
- **触发规则**：渲染进程可见的任何变化（布局、控件、文案、状态、动效）走完整链路；纯主进程、worker、构建、文档改动跳过 designer，直接 engineer → qa。用户给的视觉反馈（“这个按钮太大了”）也是界面变化，同样先过 designer，只是范围收窄到受影响的画板。
- **链路**：designer 设计 → 编排者提交画板 → engineer 实现 → 编排者提交代码 → designer 复审与 qa 验收（可并行）→ 两边都通过才算完成。
- **变更单**是唯一的跨阶段契约，子 agent 之间看不到彼此的上下文。必含：需求一句话、影响画板与节点 id、导出 PNG 路径、新增或修改的规则条目、验收标准、要检查的尺寸与语言矩阵（中文 1440×900 / 1280×800 / 英文长文案）。
- **打回**：designer 复审与 qa 验收各自给结论，任一不通过就把两边的问题合成一轮返工交给 engineer。最多返工 2 轮；第 3 轮仍不通过就停下来把分歧交给用户，不要自己反复试。
- **复审不扩需求**：designer 复审只判断“是否符合画板与规则”，新想法记为后续建议，不作为打回理由；打回的每一条都要给出画板节点 id 或规则条目作为依据。
- **并发边界**：Pen 是单文档应用，**只有 designer 能写 Pen**；engineer 与 qa 可以只读画板取准确的节点 id、几何与文案（比看 PNG 可靠），但不得写入或触发保存。Pen 只暴露一个可读可写的执行工具，读写分不开白名单，这条靠角色提示约束。engineer 与两个 reviewer 不写对方的文件；只有编排者执行 `git commit` / `git push`，避免并行 agent 抢 git 索引。
- **保存验证**：designer 每次原生保存后用 `Get` 重列顶层节点确认改动在文档里；编排者提交前再核对 `design/exports/` 与 `design/screens.json` 是否同步。
- 例行小改动（改一句文案、调一处 token）编排者可以直接做，门槛不变：画板先改、`pnpm lint` 为 0、实测尺寸。绕过流程的前提是改动小到一眼看得完，不是赶时间。
- **接入方式**：`agents/*.md` 是纯文本角色提示，任何编排工具都能用——把文件内容作为子 agent 的 system prompt，或在单 agent 工具里当作「现在按这个角色工作」的指令贴进去。支持子 agent 定义目录的工具（如把 `agents/` 链接或复制到它约定的位置）可以直接加载，前提是它认得 `name` / `description` 两个字段；新增或改过角色文件后通常要重开会话才生效。
- 角色边界靠提示词约束，不靠工具权限（Pen 的读写用同一个执行工具，分不开）。编排者在合并前自己核一遍：engineer 没碰 `design/`、reviewer 没改实现、没有子 agent 自行提交。

## 合并到 main 的方式

- 不要在 Pen 打开 `design/Printemps.pen` 时 `git checkout main` 再切回：工作树里的 .pen 会被回退再前进，Pen 会从磁盘重载并丢掉未落盘的修改。用 `git push origin <feature>:main` 快进远端 main（工作树不动）；本地 main 可在之后 `git fetch` 后 `git branch -f main origin/main` 更新。
- 每次 Pen 原生保存后，用 Pen 的 `Get` 重新列出顶层节点，确认修改确实在文档里再提交。
