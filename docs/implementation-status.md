# Printemps 验收清单

当前结论：**尚未完成整体验收**。本清单区分实现、局部证据与端到端证据；不能用静态设计、示例波形或单元测试替代真实桌面操作。

| 要求 | 当前证据 | 仍需完成 |
| --- | --- | --- |
| Printemps 品牌、暗色圆润 DAW、中英、1440×900 / 1280×800 | `public/brand`、Pen 导出、真实组件浏览器预览；1280×800 详情栏折叠/展开验证 | Electron 各尺寸与全部状态逐屏检查 |
| 单文件选择/拖入后直接进入工作区 | AudioImporter 的真实 FFmpeg 测试、受限 preload API | 原生选择器及拖放，导入失败/退出全过程 |
| 工作区无导入/历史入口，首页进入全部项目 | 当前 renderer；历史独立页面的浏览器检查 | 重启后历史打开、搜索、删除实测 |
| 项目/音轨 inline 改名 | 字段级保存、磁盘并发写入/重新打开测试；浏览器 Esc、失焦保存与重试恢复 | 原生持久化、IME、长名称、关窗保存 |
| 53 声部搜索/分类/组合、按需缓存模型 | 固定版本清单、校验/取消测试；浏览器隐藏选择保留 | 原生下载中断/离线/不足空间恢复 |
| 04/05 弹窗、工作区任务行、完成后试听 | renderer、服务测试、真实 drums→bass 双模型测试 | 原生实时任务行与音频切换 |
| Other 必须显示；二次分离原子替换 [Other, targets] | domain/service 测试，真实逐步及二次分离重建误差 <1e-5、原位替换及混音设置继承 | 二次分离与取消时的完整桌面行为 |
| 私有结果、WAV/FLAC 独立导出 | 私有路径限制、真实 FFmpeg 格式/重名/部分失败测试；真实模型结果导出后修改副本不改变私有音频；选目录期间的音轨替换不破坏已开始的导出 | 原生选择目录、导出恢复及试听端到端 |
| 同步波形、定位、缩放、循环、S/M/增益/原始对比 | AudioEngine 共同时间源、循环及逐步结果无全局暂停的调度测试；组件键盘推子检查 | 真实可听输出、多轨同步、循环及分离期间试听 |
| BPM/调性/拍号/第一拍手动设置、推荐星标、复位 | 域测试、真实 Beat This + WASM 测试；星标预览 | 手动设置/分析/复位/撤销端到端；真实音乐样本评估 |
| 显式分析，进入不自动分析；节拍器 Switch、音轨网格、时间格式 | 源码及时间数学测试 | 首次进入、开启节拍器、变拍号和时间显示实际操作 |
| 设置设备/语言/缓存与导出目录 | 设置路径/竞争测试；本机 CPU 运行证据 | 各平台目录选择；CUDA 未测试，MPS 未通过本机验证 |
| 分析工具内置、统一应用差分更新 | 包内分析测试；真实 Linux 0.1.0→0.1.1 安装包差分重建与 SHA-512 校验通过 | 原生升级前后缓存保留、真实发布服务与安装重启、签名安装 |
| Windows/macOS/Linux | native build 工作流；macOS arm64 测试包；Linux x64 容器内 AppImage 及包内分析通过 | Windows 实际构建；各平台 GUI、安装/卸载与升级 |
| 退出保存、取消子进程、异常中断保护 | shutdown/store 测试，关闭保存握手代码 | Electron 关窗/退出/更新重启，以及失败重试全过程 |
| 设计交付与说明 | `design/` PNG、HTML、交互说明；原 Pen 文档 | 核对当前 Pen 可编辑内容与最终实现一致性 |

## 已运行检查

- 普通测试当前为 49 项通过，2 项真实运行时测试默认跳过。
- `npm run build`：类型检查与生产构建通过。
- `npm run test:integration`：真实内置分析通过；也曾用打包资源通过。
- `PRINTEMPS_TEST_MODELS=.cache/model-reference/v1 npx vitest run tests/progressive-runtime.test.ts`：真实鼓组→贝斯逐步分离、贝斯→鼓组二次分离及导出副本隔离通过。合成输入仅证明管线，不是歌曲质量或性能基准。
- 当前依赖锁文件、macOS 14.0 最低版本及保存/导出修复已重建至 macOS arm64 ad-hoc 测试包，深度签名完整性通过。锁定运行时的真实分析通过；原生交互及正式签名、公证仍未验收。

## 当前外部限制

原生桌面工具多次确认 Mac 锁定。浏览器组件预览可以继续，但无法替代 Electron 原生选择器、真实音频输出、窗口生命周期检查。三平台 CI 尚未在远程运行；本机 Docker 已完成包含锁定依赖和桌面关联配置的 Linux x64 0.1.1 构建及包内分析，但未覆盖 Windows 和原生 Linux GUI。已验证两个本地 Linux 安装包的差分传输和重建；尚未发布版本，也未验证安装重启或发布服务器。发布前还需完成依赖许可/声明与签名、公证工作。

## Linux 启动参数复核

发现 electron-builder 26.15.3 的 AppImage 默认桌面入口无条件加入 `--no-sandbox`。已通过 `build.appImage.executableArgs: []` 取消该默认参数，针对最新配置的容器重建正在运行，日志 `/tmp/printemps-linux-sandbox-config.log`；先前 0.1.1 差分报告对应修改前的构建，不能作为此次配置的验证。打包工具生成的 AppRun 仍在 `unshare -Ur true` 失败时主动降级，因此本修复仅移除无条件禁用；实际沙箱和系统兼容性仍须原生 Linux 验收。

## Linux 更新失败恢复验证

`node scripts/verify-linux-update-fallback.mjs` 已在 Linux x64 容器通过。调用已安装的 AppImageUpdater 完成检查和下载，仅将 Electron 网络传输换成 Node HTTP；本地服务拒绝 Range 请求。旧包缺失和旧 blockmap 损坏两种场景均自动回退全量，下载内容校验通过，不触发安装/退出。另验证全量响应被篡改时拒绝 checksum mismatch，且不触发 update-downloaded。使用 64 KiB 合成载荷，不能代替真实安装升级；已纳入 Linux CI 和容器检查脚本。最新生成的 desktop 文件已确认 `Exec=AppRun %U`；完整打包进程仍需等待终态。

## 保留项目恢复

历史页新增“已删除”入口，可搜索、恢复、确认永久清理保留项目。原始输入文件与导出副本不受影响。主进程按项目 ID 串行恢复/清理，禁止覆盖现有项目，并验证归档 ID 和项目身份。`tests/store.test.ts` 三项通过，覆盖保留删除→恢复、音频内容不变、重复恢复拒绝、归档永久清理不影响活动项目。中文 1280×720 浏览器 fixture 已验证删除说明、已删除列表及恢复回全部项目；原生持久化 UI 仍待验收。类型检查通过。

此前 sandbox 配置构建的打包步骤结束后，验证脚本因运行期间文件被修改而以 127 退出，未完成最后包内分析。已确认终态后重新运行完整流程，日志 `/tmp/printemps-linux-history-recovery.log`，包含本轮恢复功能；不把上一轮视为完整通过。

## 最新 Linux 构建终态

包含历史恢复与 AppImage 启动参数修复的容器验证已 exit 0：49 项普通测试通过、2 项按需运行时测试默认跳过；更新器三种失败/损坏场景检查通过；真实内置分析及打包后分析均通过。证据位于 `.cache/linux-verification/history-recovery/`。相对 0.1.0，新包 3,045,393,708 字节，本地 Range 传输 10,940,143 字节（含元数据），节省 99.641%，16 次请求，重建 SHA-512 通过。此结果取代此前构建的差分比例作为最新本地证据，不代表安装流程完成。英文 1280×720 fixture 的已删除搜索空状态、永久删除文案与 Esc 取消、恢复回活动列表已检查通过。

## macOS 最新测试包

含项目恢复的 macOS arm64 0.1.1 测试包已重新生成：`release/mac-arm64/Printemps.app`。`codesign --verify --deep --strict` exit 0；读取 CFBundleShortVersionString 为 0.1.1；使用包内 Resources 的真实分析测试 1 项通过。日志 `/tmp/printemps-macos-history-package.log` 与 `/tmp/printemps-macos-history-analysis.log`。仅为 ad-hoc 本地测试包，未发布或公证，GUI/声音输出未验证。

Pen 22 号画板正式 PNG 导出同样仅见背景和品牌，已移除该不合格导出文件；可编辑画板和 HTML 保留，PNG 仍待修复。
