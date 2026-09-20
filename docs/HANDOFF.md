# Printemps 开发交接

更新时间：2026-09-20。用户因用量将尽要求保存交接；本次不启动新的打包、下载或大规模验收。

## 先读与当前目标

- 仓库 `/Users/means88/x/stems`，远端 `git@github.com:Means88/printemps.git`，分支 `codex/clip-workspace-desktop`。
- 先读根目录 `AGENTS.md`，再读本文件、`docs/implementation-status.md`、`docs/acceptance.md`。验收记录按时间追加，较新的证据覆盖旧的待办。
- 总目标仍是忠实还原设计并完成应用，不能宣布全部完成。用户最新确认：没有 Windows/Linux 桌面环境，**先完成 macOS 验收**，另两平台 GUI 验收延期。
- 所有 UI 变更先修改 Pen，再实现；不要重复询问已授权事项，不要用用户真实音频项目测试。

## 当前实现

Electron + React/TypeScript/Radix，pnpm 11.6.0，应用 ID `com.means88.printemps`。每个项目一个导入音频；本地分析、分离、试听、历史记录、导出；模型按需下载。原生菜单、自绘标题栏和系统窗口控件已实现。

支持多剪辑的非破坏式分割、裁剪。`start/end` 是源文件秒数，`offset` 是时间轴起点；右侧展示剪辑详情，分离和导出仅处理所选片段。结果范围从 0 开始，继承原 offset。二次分离隐藏来源剪辑并保留同轨其他剪辑；插入剩余轨与目标轨，剩余轨命名 `{来源剪辑名} - 其它/Other`。私有媒体不得提供直接打开入口，导出创建独立副本。

BPM/调性/拍号/第一拍支持手动修改及主动分析；不自动分析。节拍器独立轨道和音量、轨道排序/隐藏、恢复、原始/分轨互斥试听均已有实现。预览是示例数据，不能证明真实播放和推理正确。

## 源码、构建与远端的区别

- 交接前 HEAD：`ba56fca`。本次交接同时保存下述任务恢复修复；以 `git log -5` 查看最终检查点。
- 最后推送、签名应用和三平台 CI 对应 **`9564b9800a815aa46807678c136a796814cdae6d`**。
- 后续本地提交包括 `14a80a3` 导入错误提示设计与实现、`ba56fca` Python 子进程随应用异常退出，以及本次恢复修复。**这些不在现有安装产物内。**
- 当前 `out/` 已包含恢复修复，生产构建成功。不要把旧包和旧 CI 的成功当成当前源码完整验收。

## 刚完成的真实 macOS 崩溃恢复测试

使用隔离合成项目及缓存 drums 模型，真实运行分离，强制终止所属 Electron 主进程，确认 Python 推理子进程随之退出。重新启动后，磁盘任务由 running 恢复为 interrupted，界面提供重试且来源保留。

发现并修复：首次结果产生前中断时，`recoverSeparationTask` 错误地总填 `retrySourceId`，导致多剪辑项目重试丢失 `clipId`，提示选择可用片段。现改为仅保留记录中真实存在的 `record.retrySourceId`；新增回归测试。涉及：

- `src/shared/task-recovery.ts`
- `tests/progressive-separation.test.ts`

修复后原生界面重试成功，真实 drums 推理完成，磁盘 task 为 complete。输出 Other 和 Drums 均为 0.75 秒，offset 4.25；来源片段隐藏，同轨另一段 2 秒片段仍可见。源名称为 `Localized recovery verified`，剩余名称为 `Localized recovery verified - Other`。最终完成态尚未做新一轮视觉检查。

验证范围：本次聚焦测试 2 项通过、生产构建通过，日志 `/tmp/printemps-retry-clip-build.log`。本次小修后没有重跑全量；此前 `ba56fca` 全量 **91 passed / 3 skipped**，日志 `/tmp/printemps-parent-full-tests.log`。真实 Beat This/Essentia 管线通过，日志 `/tmp/printemps-parent-analysis.log`。合成音频仅证明管线，不能证明歌曲识别质量或设备性能。

`ba56fca` 在 `json-worker.ts` 注入 `PRINTEMPS_PARENT_PID`，`worker/parent_lifetime.py` 在重型导入前启动父进程监视：POSIX 检查父 PID，Windows 等待父进程句柄。独立 CLI 无该环境变量时不变。Windows 分支尚未经过新 CI 验证。

## 留下的 QA 环境

交接时 **隔离 QA 应用仍打开，推理已经完成**，主 PID `59783`，工具会话 `45733`（后续会话可能不可复用）。没有待完成的 CI 或打包任务。

- 应用 `/private/tmp/Printemps-Close-QA.app`，运行仓库当前 `out/`，不是签名发行包。
- profile `/var/folders/hh/0nr41s6j25d6xp6g97dq9m0w0000gn/T/printemps-close-native-xa56q9gc`
- profile 路径亦记录在 `/tmp/printemps-close-native-path.txt`。
- 项目 `projects/e0691b7b-56a9-4337-bb6f-7dc6f516dea5`，任务 `0fe5f901-fcfe-404b-8ae5-539b6f09d3bf`。
- 模型缓存 `/Users/means88/x/stems/.cache/model-reference/v1`，已有 drums/bass；不要重复下载。
- 需要重开时显式传仓库路径和上述 `--user-data-dir`。通过 CUA 正常退出自己的 QA 窗口即可；不要关闭用户其他窗口。
- CUA `getApp` 曾额外拉起默认 profile 窗口，务必核实当前项目再操作。测试均应使用隔离 profile。
- 临时路径未来可能被系统清理；不要提交缓存、私有音频、运行时或安装包。

## 已有签名包与 CI 证据

本地 `/Users/means88/x/stems/release/mac-arm64/Printemps.app`，源码 9564b98。Developer ID 签名通过 deep/strict 校验；已验证包内真实分析。未公证、未发布，不宣称生成了最新 DMG。

`app.asar` SHA256：`d35fa658dc7bf095491d9f691a4cf4e715fab80db07eabf096e5c555b2a20a49`。
日志：`/tmp/printemps-current-package.log`、`/tmp/printemps-current-signature.log`、`/tmp/printemps-current-analysis.log`。

签名包隔离验收已通过：真实 EACCES 保存失败后恢复权限并重试、退出重开保留排序；原生文件选择器导入损坏 WAV 后完整回滚，无遗留项目目录，可继续打开已有项目。新的精简导入错误文案仅在浏览器验证，尚未进入签名包。

CI：https://github.com/Means88/printemps/actions/runs/35496338370 ，三平台均成功，包含测试、安装包构建、包内真实分析与上传。macOS CI 为 ad-hoc 签名。产物保留 7 天，可能过期；详细 ID/哈希见 acceptance.md。Windows/Linux 构建成功不等于桌面验收。

## 设计文件

`design/Printemps.pen` 已在仓库，**加密文件禁止用文件系统读取、解析或改写**；只用 Pen MCP 编辑、原生 File → Save 保存。保留现有画板，更新对应 PNG 和索引。

- 最新 31：`OspP2`，保存/导入失败中英紧凑提示，1440×328，x4800/y11324。
- PNG：`design/save-recovery/OspP2.png`，入口 `design/index.html`。
- 30 多剪辑工作台 `ymoeh`；29 原生窗口 `x0yR1`。
- 03 首页 `u1mPk`；04 声部选择 `rAm7a`；05 下载 `RJx43`；08 导出 `S5oPw`；13 历史 `b1tMnW`。
- 修改先读取当前节点；复制节点会产生新 ID。显式定位曾比 fill_container 更稳定。保存后核实文件实际变化。

## 下一步（按优先级）

1. 读取本次检查点与工作区状态，检查隔离 QA 的完成画面、结果 offset，正常关闭 QA。不要重复跑已完成的崩溃推理。
2. 完成 macOS 尚缺的实际中文输入法组合输入、真实输出设备播放/节拍器听感及剩余界面对照。已有代码级 IME 防护不代表实际输入法已验收。
3. 对本次恢复修复做必要的整体回归，然后将后续修正合并为一次新包/CI 验证，避免每个小改动重打大型包。新包需要覆盖导入提示、父进程退出、恢复重试。
4. 持续在 acceptance.md 和 implementation-status.md 区分已测/未测。Windows/Linux 桌面、真实差分升级、公证/公开发布不能冒充完成；后续按环境与授权处理。

本次仅做交接，不新增功能范围，不宣布项目最终交付。
