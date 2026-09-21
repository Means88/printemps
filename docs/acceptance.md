# Printemps 验收记录

> 本文保留按时间追加的历史记录，较早状态可能已被后续验证取代。当前结论、版本范围及待办统一见 [implementation-status.md](implementation-status.md)。

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

## 原生 macOS 首轮交互（桌面解锁后）

从真实 0.1.1 macOS 应用的系统文件选择器导入 `.cache/analysis-smoke/input.wav`，直接进入工作区（16 秒合成测试音频）；初始 BPM/调性为空、按钮为“分析”，未自动分析。项目原位改名为“原生验收 · 16 秒合成音频”，音轨改名为“合成原音 · C 大调”。显式分析后通过“复位”应用 120 BPM、C major、4/4。正常退出并重新启动应用，再从最近项目打开，名称与音乐参数保持。此验证覆盖真实 IPC/私有存储及正常退出重开，不证明异常退出或实际可听输出。

用户已明确授权推送并运行 CI。初始提交 `b66b17c0b647ab09756a04c4ba8d70a565c1cc1a` 已推送至私有仓库 main，三平台工作流运行：<https://github.com/Means88/printemps/actions/runs/35479060114>。未创建或发布 Release。运行状态尚未完成，需继续观察同一 run。

原生分离续验：搜索 drums 后仅选择鼓组，显示下载 77.6 MB；观察到下载弹窗 38% 进度，下载后自动返回工作区，在音轨中显示分离 25%/75% 进度；完成后保留原始轨并新增 Other/鼓组，自动切到分轨监听，三轨波形对齐可见。输入仍为 16 秒合成音频，不代表真实歌曲分离质量。

首轮远程 CI：Windows 2025 x64 与 macOS 15 arm64 全部步骤成功（包含原生运行时准备、打包、包内分析）。Ubuntu 打包因 ENOSPC 失败。提交 1547253 在打包前执行 uv cache clean；运行时以 copy 模式安装，不依赖缓存。已重新触发工作流，等待新 run 结果。此 CI 不包含 Windows GUI/声音输出或安装升级验收。

## 原生二次分离与导出（2026-09-20）

从首轮“其它”提取贝斯，完成后工作台顺序为 [合成原音、其它、贝斯、鼓组]，旧“其它”已被原位替换，鼓组仍在后方，游标保持 00:07。通过原生系统目录选择器导出首轮 Other/鼓组 WAV，以及二次分离后的 Other FLAC；soundfile 检查均为 PCM_24、44,100 Hz、双声道、705,600 帧（16 秒）。文件位于 `.cache/native-acceptance/exports/`。播放按钮切换为 Pause，时间从 00:00 推进至 00:09；暂停后显示 Play、00:14。此项证明原生播放控制及时钟推进，不等同于人工听音或多轨同步声学验证。

CI 35479272346 的三个平台均完成构建和包内真实分析；Ubuntu 最终因 uv 缓存已被主动清理、setup-uv 收尾仍试图上传不存在的缓存而失败。3371b17 显式关闭 uv 缓存上传，已启动修正验证：<https://github.com/Means88/printemps/actions/runs/35479607318>。尚未发布 Release。

## 三平台 CI 通过与节奏交互续验

工作流 35479607318（3371b17）最终 success，Ubuntu 24.04 x64、Windows 2025 x64、macOS 15 arm64 全部成功，包含缓存收尾。此结果不包含之后的时间尺修正。

macOS 原生 UI 已通过键盘设置 100 BPM、A 小调、6/8、第一拍 0.5 秒，节拍器 Switch 显示 on；调性与拍号下拉仍在推荐 C 大调和 4/4 上显示星标。切换小节与拍后可见音轨节拍网格。检查发现旧时间尺用等距秒数生成标签，没有对齐小节起点；已新增 rulerTicks，按第一拍偏移及实际小节长度生成标签，长音频稀疏显示、缩放增加标签密度。6/8、偏移、长音频与无 BPM 回退测试通过，生产构建通过；修正后的视觉和原生重打包待验。

## 复位与修正后 macOS 构建

原生工作台点击“复位”后重新打开参数窗口，确认 100 BPM / A 小调 / 6/8 / 0.5 秒同时恢复为推荐的 120 BPM / C 大调 / 4/4 / 0.12 秒；节拍器仍为 on。随后正常退出，并将 684bfc2 时间尺修正重新打入 macOS 应用。打包 exit 0，深度严格签名校验 exit 0，普通测试 50 通过、2 默认跳过，包内真实分析 1 通过。日志 `/tmp/printemps-ruler-package.log`、`/tmp/printemps-ruler-tests.log`、`/tmp/printemps-ruler-analysis.log`。重新打开应用时桌面已锁定，因此修正后的原生时间尺视觉检查仍待完成；本轮不声称该检查通过。

## Pen 恢复画板渲染修复

通过从现有正常节点复制并保留样式，重建 `lcLVd` 的文字和面板，修正标题栏堆叠顺序、按钮水平布局及居中；布局检查无裁切问题。已导出并人工查看 1440×900 的 `design/archive-export/lcLVd.png`，内容完整可读。历史页新增入口同步重建为 `YjITV`，导出的 `b1tMnW.png` 已检查，保留既有内容。HTML 同步重新导出并修复品牌路径。此项解决此前空白 PNG 问题，不能代替实现端与历史设计的完整一致性验收。

## 时间尺原生复核与历史详情

桌面解锁后重开真实测试项目：时间尺显示 1.1 / 3.1 / 5.1 / 7.1，与第一拍偏移后的小节网格对齐，原生视觉复核通过。

历史页补充选中状态、结果详情面板、继续试听和直接导出，以及按最近处理/名称排序。搜索无结果时移除详情，防止对旧选择误操作。macOS 重新打包 exit 0，50 项普通测试通过。原生 UI 已检查选中项目详情显示 Other/贝斯/鼓组、导出弹窗默认勾选这三条结果且不选原始音频；无匹配搜索隐藏详情，按“贝斯”搜索能恢复该项目与详情。本轮未重复执行导出写文件，仍沿用此前真实导出验证；多个项目排序与英文紧凑布局尚待验收。

## 原生保留删除与恢复

在真实 macOS 测试包的历史详情页，对本次创建的“原生验收 · 16 秒合成音频”执行保留删除（“同时清理应用保存的音频”未勾选）。活动列表变为 0 项；进入已删除列表可见同名项目及 4 条音轨。点击恢复后归档列表为空，活动列表重新出现该项目，详情保留 Other/贝斯/鼓组。点击继续试听重新进入工作台，四条音轨及原始轨改名完整，120 BPM / C major / 4/4、小节时间格式和分轨监听保留。未执行永久删除；该证据覆盖恢复后真实 IPC 打开，不声称完成音频输出听音检查。

## 原生二次分离取消

选中测试项目的 Other，使用已缓存鼓组模型开始二次分离，观察到工作区内“正在分离 · 鼓组”任务轨及取消按钮。点击取消后显示“源音轨已保留”，提供重试/关闭；关闭提示后仍为 [合成原音、Other、贝斯、鼓组] 四轨，没有插入替换结果，分离按钮重新可用。此项覆盖推理启动阶段取消，不代表每个推理进度点或模型下载中断均已通过原生验收。

## 原生中英切换与持久化

从设置切换 English，检查实际工作台的 Original/Stems、Bars & beats、Separate/Export track 与底部控制，以及历史详情页的 Recently updated、Open workspace、Export；当前窗口下文字完整且主要操作可见。退出并重开后首页仍为英文，证明语言偏好持久化。项目/音轨显示名保持用户内容原样；检查完成后已切回简体中文。此轮使用当前原生窗口，不替代精确 1440×900 / 1280×800 两尺寸全状态检查。

## 模型管理状态补齐

模型管理增加实际缓存路径、校验本地模型时的加载提示、搜索空状态和列表读取失败后的重新读取按钮。下载进度只接受当前模型 ID 的事件，取消失败显示错误提示；加载时禁用模型操作避免误点。类型检查与模型缓存测试 2 项通过，macOS 重打包 exit 0。原生打开确认目录正确、仅 bass/drums 显示已缓存；搜索 missing-model 显示无结果指导，弹窗布局已检查。未人工制造权限或磁盘错误，此类恢复仍以服务测试与实现为证。

## 试听控件状态与模型管理下载

独奏/静音按钮补充含音轨名称的中英文 aria-label、aria-pressed 与说明；播放/暂停和返回起点补充中文标签。类型检查及 50 项普通测试通过。该改动尚未重打入当前原生包；三平台工作流 35480556644 正在验证 6b453e5，需跟进终态。

模型管理按 accordion 搜索，点击未缓存的 77.6 MB 手风琴模型后出现进度与取消；下一次操作前下载已完成，UI 变为“已缓存/删除”。此项证明模型管理的下载完成状态，取消操作未实际发生，不计为取消验收。

## 历史分页

历史记录与已删除列表新增每页四条分页、范围计数、边界按钮禁用。搜索/排序/切换列表回第一页，删除后页数减少自动回退，详情仅从当前页选取。分页边界测试 2 项通过；类型检查通过。开发专用预览新增最多 40 个合成项目，并修正多项目打开/保存 fixture。17 项英文预览已实际点击从 1–4 到 5–8，右侧详情同步选择 Layout fixture 05，分页与操作区可见。此修改尚未包含在当前 macOS 包及进行中的 6b453e5 CI。

## 首页最近项目范围

首页最近项目按更新时间降序限制为三项；搜索在完整项目集合上执行后显示最近三项，无匹配时给出关键词提示。完整记录通过“查看全部项目”进入分页历史。17 项英文合成预览已检查，仅显示最新三项，导入区及全部项目入口在 1280×720 当前预览中完整可见。该改动属于列表呈现，不新增运行时接口；类型检查通过。

## 最新整合包与循环操作

6b453e5 的远程工作流 35480556644 最终三平台全部 success。本地 f0c86c5（含后续分页、首页三项限制）普通测试 52 通过、2 默认跳过，macOS 打包及深度严格签名检查 exit 0，包内分析测试 1 通过。

最新原生工作台已确认 S/M 呈现带音轨名的切换控件及正确 0/1 状态；分别开启鼓组独奏、贝斯静音后恢复。循环输入越界终点 163 秒被阻止并提示有效范围；改为 1–3 秒可应用，播放经过超过一个循环周期后仍显示区间内位置，暂停后关闭循环成功。该证据覆盖控制与时钟，未进行声学输出采集，不能宣称循环接缝或节拍器声音质量已验证。

## 模型管理下载操作固定显示

修复搜索过滤正在下载的模型时，进度和取消按钮一并消失的问题。当前下载独立显示在列表上方，关闭弹窗后模型管理入口显示百分比；重新打开仍可查看和取消。删除缓存只显示处理中，不再提供无效的下载取消操作。

开发专用 `preview.html?downloadPreview=1&lang=en` 使用 30 秒模拟下载，实际操作验证：下载 Acoustic guitar → 搜索无匹配项 → 进度/取消仍可见 → 关闭弹窗入口显示 17% → 重开显示 33% → 取消后显示取消指导。1280×720 截图检查通过，类型检查通过。模拟接口仅在预览入口启用，不进入生产构建；此项不作为真实网络下载中断的验收证据，也尚未包含在已验证的原生包和三平台 CI 中。

## 精确尺寸与较长英文内容

在 c81c415 的开发预览，使用浏览器 viewport 明确设置 1280×800 和 1440×900，分别检查中英文六轨工作台截图。原始/分轨、时间轴工具、右侧分离/导出和底部播放/总音量均在可见区域；音轨区独立滚动。1440×900 下只读 DOM 确认视口与文档宽高一致，无整页溢出。

在 1280×800 下将项目重命名为 `Midnight Session — extended orchestral arrangement with backing vocals`，确认内联保存成功、工作台名称适当省略，分析/复位/导出区未被挤出。检查英文声部选择、六轨导出、设置弹窗：正文、分类、搜索、底部主操作和关闭操作均可见。切换中文后再次检查两个尺寸，用户自定义名称保持原样。检查后已恢复浏览器默认尺寸。本轮属于布局验证，不替代真实推理、音频输出或全错误状态验收；曾通过测试填充接口绕过 80 字输入限制的超长名称未保存，不计作正常键盘输入测试。

## 下载中断与部分缓存恢复

`tests/models.test.ts` 新增本地 HTTP 服务器集成测试，使用真实 fetch 和文件写入：权重完成后在配置文件传输中途取消，确认只保留完整权重、无 `.part` 文件、模型仍显示未缓存；重试只请求配置文件，校验完成后才可用。另一个测试由服务器发送部分响应后主动断开连接，确认下载失败且缓存目录为空，再恢复服务器并成功重试。模型测试共 4 项通过。本证据覆盖服务层真实流取消/断线与重试，不等同于公网中断或原生错误弹窗人工验收。

## 活跃分离时原生退出

在 f0c86c5 macOS 测试包中选择“其它”，使用已缓存鼓组模型启动二次分离；观察到工作区“正在分离 · 鼓组”0% 任务行后执行 Command-Q。进程检查确认测试包及其分离 worker 均已结束。重新启动应用，最近项目仍显示 4 条音轨；打开后保留原始/其它/贝斯/鼓组顺序、已有名称、120 BPM/C major/4/4、小节时间格式，没有遗留任务行，分离按钮可用。此项验证启动阶段正常退出与任务清理，不代表后期推理、强制杀进程或更新安装退出已验证。

## 历史结果筛选

历史页增加全部/已有分离结果/尚无分离结果筛选，与搜索、排序和分页组合，筛选变化回到第一页。此筛选仅依据实际保留的非原始轨，不宣称任务全部完成；持久化的失败/取消/部分完成任务状态仍需另行实现。17 项英文 fixture 已检查：无结果筛选清空列表与详情、分页显示 0–0/0；切回 Has results 恢复记录。初次检查发现英文选项截断，缩短为 Has results / No results 后截图确认完整显示。类型检查通过。

## 最近分离任务持久化与筛选

项目新增可选 lastSeparation，兼容旧项目；记录任务身份、源轨、目标、开始/结束时间、状态、已提交声部数量及错误。数量与音轨结果在同一次项目写入中提交，终态先持久化再通知界面。启动恢复将遗留 running 标为 interrupted，保留已提交结果。界面显示最近任务及完成数，可筛选运行/完成/失败/取消/中断/无记录；错误细节可展开，结果列表继续显示可试听资产。它只记录最近任务，不把历史旧项目推断为已完成。

服务测试覆盖完整 2/2、第二目标失败保留 1/2、二次分离取消 0/1、异常恢复保留轨道；全量普通测试 54 项通过、2 项真实运行时测试默认跳过，类型检查通过。17 项英文状态 fixture 已操作 Failed 筛选，仅显示 4 条失败记录和 1/2 完成数，详情一致。新持久化字段与历史筛选尚未打入 macOS 测试包或运行远程三平台 CI。

## 任务状态版本生产包

c7d60f0 已完成 macOS arm64 打包、`codesign --verify --deep --strict` 及包内真实分析测试（1 项通过）。因 Mac 当前锁定，使用独立输出 `release-status/mac-arm64/Printemps.app`，未覆盖此前用于原生验收的 `release/` 包；此新包 GUI 尚未验证。打包日志 `/tmp/printemps-status-package.log`。已启动远程三平台工作流 35481782610，目标提交 c7d60f0；需继续跟进终态，不将启动视为成功。

## 重开后的部分任务重试

每次逐步结果提交同时记录最新 Other 的轨道 ID。打开项目且没有该项目的内存任务时，由持久记录恢复失败/取消/中断的重试操作，只选择尚未完成的目标，并从保留的 Other 继续。目标已全部完成、源轨不存在或旧记录缺少部分结果来源时不自动重建重试任务，避免重复处理原始混音。类型检查与两项分离服务测试通过，断言失败及中断的 1/2 任务重试只包含 bass 且源为实际 Other，已完成/丢失源轨不恢复。原生重开重试 UI 尚待验收。

开发预览现已操作打开失败项目及“Retry”，弹窗源轨为 Other，Bass 选中、Drums 未选，显示单个目标及缓存无需下载；这是持久记录恢复的组件验证，不代表生产包原生验收。

工作流 35481782610（c7d60f0）三平台终态全部 success，覆盖任务状态持久化，但不含后续重试恢复。后续工作流将使用 `npm run dist` 生成 NSIS、DMG/ZIP、AppImage，保留包内分析验证；明确 `--publish never`，不上传产物或发布 Release。安装包生成不等于实际安装/升级验收。

恢复提示现在区分中断与一般失败，并在有部分结果时明确显示保留的声部数量及从剩余音轨继续的行为。类型检查、错误指导和逐步分离测试通过。安装包工作流 35482009303（bcb5c6b）已确认三平台运行中，仍需跟进终态；原生 Windows/Linux 测试环境已向用户询问，等待环境信息不阻止其它实现工作。

历史搜索补充中英文标准声部名匹配，音轨改名后仍可按“贝斯”/Bass 等检索，同时保留项目名、源文件名、自定义轨名、大小写与首尾空白处理。独立搜索测试及类型检查通过。设计 README 顶部明确后续导航/弹窗/私有结果流程优先于早期记录，避免把旧工作台历史入口误用为实现要求。

后台分离事件由应用根组件订阅，在新任务、完成声部数量变化或终态时重新读取项目列表，避免离开工作台后首页/历史一直显示旧结果；用请求序号忽略过期读取。开发专用 backgroundTaskPreview 在 15 秒后发送完成事件，实际停留历史页观察 Running · 0/1 自动变为 Complete · 1/1，记录和详情一致，未重开页面。类型检查通过；此项为真实组件加模拟事件验证，不代表新增原生推理证据。

## 安装包 CI 的 Linux 空间修复

35482009303 的 macOS 安装包及包内分析 job 已 success；Linux 在 AppImage 临时目录复制 CUDA NCCL 库时 ENOSPC，runner 仅剩 6 MB，日志保存在 `/tmp/printemps-installer-linux-failure.log`。解包目录构建成功不代表 AppImage 所需峰值空间足够。工作流新增仅 Linux hosted runner 的预装 Android/.NET SDK 清理，保留项目和所需 Node/Python 运行时，后续重跑验证。Windows 同轮 job 在检查时仍运行，不因 Linux 失败视作整体终止。

## 导出副本目录入口

导出完整或部分成功且至少写入一条音轨后显示“打开文件夹”。主进程保存本次会话实际输出的规范化目录，只允许打开这些位置；未知目录、相对路径、已删除目录会拒绝，应用私有目录不因 renderer 传参而获得访问入口。已有导出服务禁止向应用私有目录写入。新增目录注册/解析测试与现有导出测试共 3 项通过，类型检查通过；弹窗操作区允许换行以容纳较长英文按钮。原生文件管理器打开操作尚待解锁后验收。


## 2026-09-20 最新 macOS 包与自动化边界

- 4648ce4 已构建到 `release-status/mac-arm64/Printemps.app`，打包 exit 0；深度严格签名校验通过，包内真实分析 1 项通过。日志 `/tmp/printemps-latest-package.log`。
- 正常退出旧包后，通过原生 UI 启动上述新包；AX URL 确认来自 release-status。首页打开保留项目，4 条音轨、120 BPM / C major / 4/4 与小节显示均保留。
- 导出弹窗及系统文件夹选择器可以打开，但本轮自动化 `Return` / `Escape` 将“前往文件夹”输入变成 `/`，未成功确认输出目录。此现象属于输入自动化验证阻碍，不能据此判定应用导出失败，也不能宣称新“打开文件夹”入口通过原生验收。
- 用户手动退出屏保后，重建 CUA 连接可读取界面。此前“锁屏”诊断没有充分证据；未修改任何系统屏保或锁屏设置。


## 2026-09-20 三平台安装包终态与完整结果恢复

- 工作流 35482306981（e29bc55）终态 success，Windows NSIS、macOS DMG/ZIP、Linux AppImage 构建及各自包内分析全部通过。Linux 清理临时 CI runner 的未使用 SDK 后不再触发上一轮 ENOSPC。未上传或发布安装包。
- 修正启动恢复边界：结果及 completed 计数已全部原子提交、但最终状态写入前退出的任务，恢复为 complete；仅部分完成仍为 interrupted。结果音轨、名称和混音设置保持不变。
- `npx vitest run tests/progressive-separation.test.ts tests/store.test.ts` 4 项通过，覆盖完整结果恢复、部分结果恢复与后续重试来源；类型检查通过。此证据是持久化恢复测试，不替代原生强退验收。


## 2026-09-20 Pen 历史页一致性

通过 Pen MCP 更新 b1tMnW：历史列表与详情补上“其它”，详情共 6 条结果音轨；新建入口改为“新建项目”；按钮图层名称同步为继续试听/导出音轨，不再遗留“查看文件位置”名称。保留其它画板。重新导出 design/archive-export/b1tMnW.png 与 index.html，1440×900 PNG 视觉检查无重叠、裁切；画板结构检查无溢出报告。

78f7ea7 的三平台安装包工作流已启动：35482898080。结果尚待终态，不沿用上一提交的通过结论。原生目录选择器重置连接后键盘异常仍复现，已请求手动确认测试目录，尚未完成新导出目录入口验收。


## 2026-09-20 节拍器起点调度

修正 AudioEngine.play 的首次节拍调度：不再等待 25ms 定时回调，立即将首拍排入与音轨相同的未来音频时钟起点，避免首个回调晚到时跳过第一拍。调度测试确认起点重拍、定位到第二拍后的弱拍及后续回调不重复安排已排入的点击。音频引擎/节拍测试 8 项、全套普通测试 57 项通过，2 项真实运行时测试按默认配置跳过；类型检查通过。这证明调度行为，实际扬声器输出仍未验收。


## 2026-09-20 用户确认导出及原生文件夹入口

用户明确反馈“导出没有问题”。随后原生 AX 确认 release-status 包导出成功提示：1 条音轨至 Downloads。点击“打开文件夹”后，Finder 显示下载目录及本次合成原音 WAV 副本（4.2 MB）。因此成功导出后的目录入口已通过原生验收；此前自动化键盘问题不再阻碍这一项。只查看导出副本目录，未提供私有结果目录入口。此验收不覆盖导出失败恢复或实际音频听音。


## 2026-09-20 未提交改名关窗与最新包

在 release-status 原生工作区进入项目名 inline 输入，填入“原生验收 · 退出保存检查”，不按 Enter、不主动失焦，直接点击窗口关闭按钮。重开首页显示新名称及 4 音轨，进入项目后内容保留。随后恢复原名并通过返回首页确认保存。此验证覆盖普通中文输入的关闭保存，不覆盖 IME 正在合成的字符。

2027108 已构建到 release/mac-arm64/Printemps.app，打包 exit 0，包含完整结果恢复及首拍调度修复。退出旧包，通过完整路径启动新包，AX URL 确认来源为 release；项目四音轨及节奏数据保留。严格深度签名校验与包内真实分析 1 项通过。包内分析和调度测试不能代替扬声器听音，已请求用户确认。


## 2026-09-20 最新安装包工作流完成

35482898080（78f7ea7）已完成，三平台所有 job 均 success，`gh run watch --exit-status` 返回 0。这轮包含导出目录入口与完整结果恢复，不含之后的节拍器首拍修复。后者已由本地 57 项测试和 2027108 macOS 包验证，不能借用本轮 CI 结论。implementation-status.md 已合并过时重复说明，保留原验证边界，详细历史仍保存在本文件。


## 2026-09-20 原生后期取消与重开重试

2027108 macOS 包：选择验收项目“其它”→缓存鼓组模型（0 MB 下载）→开始二次分离。运行期间返回首页及历史，显示“处理中 · 0/1”，已有其它/贝斯/鼓组三条结果仍列为可试听。回工作区观察真实进度 75%，点击取消，出现“分离已取消，源音轨已保留”。

退出应用后只读核对 project.json：四条音轨 ID 与任务前完全一致，lastSeparation.state=cancelled、completed=0、targets=[drums]，sourceId 仍为原“其它”。重新启动、打开项目后仍显示取消提示与重试；点击重试，弹窗来源为“其它”、鼓组已选中且缓存可用。本轮只验证恢复配置，没有再次开始计算。取消弹窗并关闭任务提示，恢复试听工作区。


## 2026-09-20 Pen 全文档边界检查

通过 Pen MCP 遍历当前可编辑文档，不读取加密文件。排除 enabled=false 的节点及后代后，可见边界报告共 342 项，全部属于 Time grid、Bar reference 或 unity reference；未发现其它可见文字/操作框越界。抽查 mnZnS：网格线高 98、父波形区域高 84 且 clip=true，视觉受父区域裁切；总音量 0 dB 参考线从 6px 滑轨向上下延伸，父轨未启用 clip，属于预期显示。五个越界时间格式文本均为隐藏旧标签。此为结构检查，不替代全部画板视觉/交互一致性验收；未为清除告警改变已批准设计。

## 2026-09-20 最新隐藏来源与命名真实验证

`PRINTEMPS_TEST_MODELS=.cache/model-reference/v1 npx vitest run tests/progressive-runtime.test.ts` 通过（190.05秒，日志 `/tmp/printemps-named-remainder-runtime.log`）。真实鼓组/贝斯模型验证二次分离后来源保留并隐藏、结果原位插入、继承混音设置、剩余轨名为 `Edited bass - 其它`。重建误差仍低于 1e-5，WAV/FLAC 导出和副本修改不影响私有文件检查通过。输入为1秒合成音频，不是歌曲质量/性能基准。

当前普通测试63项通过；生产构建通过。最新英文1280×800弹窗检查确认分析/完成按钮右对齐、列表操作靠右，常驻就绪与私有结果说明已移除。桌面打包尚需包含最后几轮样式更新后再验收，不能借用先前包的结果。

## 2026-09-20 48e049c 最新桌面包验证

`release-revision/mac-arm64/Printemps.app` 打包 exit 0；打包结束后 `codesign --verify --deep --strict` exit 0。包内主进程、preload、renderer JS/CSS 的 SHA-256 与当前生产构建全部相同。包内真实分析1项通过（5.60秒）。日志 `/tmp/printemps-48e049c-package.log`、`/tmp/printemps-48e049c-analysis.log`。Developer ID 签名，未公证或发布。

通过应用菜单退出旧包，启动新包，原生 AX 确认 URL 来自 release-revision。打开已有16秒合成验收项目，验证新音乐工具栏、顶部帮助/模型/设置/侧栏入口、最上方节拍器音轨及推子、详情真实参数、非监听组禁用、底部无常驻就绪。所有音轨弹窗实屏确认操作右对齐、透明图标按钮与蓝色完成按钮。未改变用户音乐项目。随后修复列表副标题使用原始 stem ID 的本地化遗漏；该文本修复尚未纳入此包。


## pnpm 迁移（2026-09-20）

固定 pnpm 11.6.0，使用 `pnpm-lock.yaml`；保留直接依赖版本，CI 与 Linux 容器使用 `pnpm install --frozen-lockfile`。上文 npm/npx 命令是历史执行记录，当前开发命令以 README 和 AGENTS.md 为准。

macOS arm64 干净依赖目录的冻结安装、66 项常规测试（2 项按条件跳过）、生产构建与真实分析集成测试通过。electron-builder 已识别 pnpm，打包依赖检查通过：主进程、preload、updater、可执行 ffmpeg、Essentia WASM 资源均存在。此检查包省略未改动的多 GB Python 运行时，不作为完整发行包；本次尚未重新进行 Windows/Linux 打包或 GUI 验收。

## 2026-09-20 · 多剪辑更新

- 新增非破坏式分割、首尾裁剪、剪辑名称和详情；试听按源范围与时间轴 offset 渲染，间隙静音。S 在游标处分割，输入框内不触发。
- 分离和 WAV/FLAC 导出只处理选中片段；主进程裁剪源音频，结果继承 offset。二次分离保留同轨其它片段，隐藏本次来源剪辑。旧项目无需迁移即可按单剪辑打开。
- 70 项测试通过，2 项条件运行时测试跳过；生产构建和 TypeScript 通过。新增测试包括源范围/重叠/过期编辑校验、样本级试听映射、真实 FFmpeg 裁剪及 WAV/FLAC 导出、首轮及二次分离 offset。分离测试使用注入式测试 runner，未宣称新剪辑路径经过真实模型推理。
- 浏览器英文 1280×800 验证分割、源入点编辑、键盘裁剪手柄和导出时长：5秒处分割，右片段入点调到5.1秒，offset5.1秒、时长4.9秒；导出对话框同步显示4.9秒，无横向溢出。Pen 画板30已保存并导出PNG。
- 此更新尚未重新构建完整安装包或进行真实设备听音、三平台原生剪辑操作验收；此前安装包证据不覆盖此改动。编辑后的试听缓冲目前按项目时长生成，长音频多轨场景仍需做内存压力验收。

### 剪辑保存与恢复补验

2026-09-20：新增独立 ProjectStore 重开、元数据更新、归档和恢复测试，确认剪辑范围/offset 不被项目改名或增益保存覆盖。归档恢复同样校验范围，损坏记录不能恢复。新增播放中改剪辑名测试，确认不重解码、不停止现有 voice。当前 72 项测试通过、2 项条件测试跳过；生产构建通过。此为存储和引擎调度证据，不替代真实设备听音与三平台桌面验收。

### 2026-09-20 · 真实模型裁剪片段验证

当前工作树执行 `PRINTEMPS_TEST_MODELS=.cache/model-reference/v1 pnpm exec vitest run tests/progressive-runtime.test.ts` 通过，146.12秒，日志 `/tmp/printemps-real-clip-runtime.log`。使用已有固定版本鼓组、贝斯模型和托管 CPU Python 运行时；先分离1秒合成输入，再将贝斯裁剪为源范围0.25–0.75秒后执行二次鼓组分离。断言输出时长0.5秒、剪辑offset0.25秒、来源片段保留隐藏、混音继承、其它/目标顺序及重建误差<1e-5均通过。WAV/FLAC导出与私有文件副本隔离也通过。TypeScript 检查通过。该证据补充此前模拟 runner 测试，仍不代表真实歌曲质量、扬声器听音或三平台 GUI 验收。

### 来源轨恢复显示修复（2026-09-20）

剪辑化后，二次分离会同时隐藏来源剪辑和无可见片段的来源轨。修复音轨列表“显示”开关仅恢复整轨但留下空白/静音的问题：当显示原本隐藏且全部片段隐藏的来源轨时，同时恢复其保留剪辑。部分消耗的轨道普通隐藏/显示仍保留逐剪辑隐藏状态，避免重新叠加已分离片段。新增领域测试验证恢复后的 source range、波形所用 clips、其它结果不变以及部分来源不误恢复。73项测试及生产构建通过；该修复沿用设计稿已有显示开关，无新增界面。

### 当前完整 macOS 包（2026-09-20）

`pnpm run package` 已完成，产物 `release/mac-arm64/Printemps.app`，包含本次剪辑、恢复显示、pnpm迁移和顶栏调整的当前工作树。Bundle ID读取为 `com.means88.printemps`；app.asar 的主进程与 preload/index.cjs 均包含 clips:edit。构建使用本机可用 Developer ID 签名，`codesign --verify --deep --strict`通过。公证因缺少可生成的notarize配置被跳过，尚不是正式分发验收。

包内资源运行 `PRINTEMPS_TEST_RESOURCES=release/mac-arm64/Printemps.app/Contents/Resources pnpm run test:integration` 通过（5.43秒），验证 Beat This / Essentia 的BPM、拍号、调性与首拍输出。日志：`/tmp/printemps-current-package.log`、`/tmp/printemps-current-package-analysis.log`、`/tmp/printemps-current-signature.log`。该包尚需原生剪辑操作和真实听音验证；Windows/Linux新版本未构建验收。

### 原生剪辑操作验收尝试（2026-09-20）

当前签名包使用 `--user-data-dir=/tmp/printemps-clips-native-qa` 启动，独立10秒合成音频项目。进程及子进程确认使用独立目录，启动日志无错误。CUA 对新Bundle ID返回Invalid app；刷新LaunchServices及独立副本路径后，读取窗口连续两次超时。因此此次没有原生点击/裁剪/保存的通过证据，不能把启动成功作为GUI验收。仅关闭了本轮独立测试进程，未操作用户音乐项目或旧版应用实例；保留fixture供工具恢复后继续。

### 剪辑采样边界一致性（2026-09-20）

修复试听按时长取整而FFmpeg按首尾分别取整导致的一采样差异；两者统一使用 `clipSampleRange` 的独立边界取整、exclusive end。整段缓冲复用也改为比较实际末尾采样，避免小于一采样的尾部裁剪被忽略。新增低采样率确定性用例验证源0.14–0.36秒对应采样[1,4)，及0.94秒尾点不误包含第10采样。74项测试与生产构建通过。现有 release/mac-arm64 应用包早于此修复；后续分发前需重新打包。

### 删除音轨的解码缓存释放（2026-09-20）

修复项目内删除音轨后原始解码缓冲仍保留到关闭项目的问题。成功载入新音轨集合后，仅保留仍被项目引用的asset缓存；隐藏的来源轨仍保留缓存以便恢复。新增播放中删除/重新加入测试，验证被删音轨停止、重新加入重新解码、未删除音轨持续播放。75项测试与生产构建通过。此为引用释放和调度验证，不声称已完成长音频内存压力实测；现有桌面包需随最终改动重新构建。

### macOS 原生剪辑流程通过（2026-09-20）

解决窗口连接阻碍：从独立副本 `/tmp/Printemps-Clips-QA.app` 启动并按同一路径绑定CUA，可正确读取/操作新Bundle ID窗口。该副本与12:31完成的签名包一致，早于后续采样边界与缓存释放修复。

独立数据 `/tmp/printemps-clips-native-qa` 的10秒合成项目：原生UI点击波形定位5秒→分割→选择右片段→源入点改6秒，详情显示offset6秒、时长4秒。原生目录选择器导出到 `/tmp/printemps-clips-native-export`，UI显示完成，读取实际WAV为4.0秒/24-bit。Cmd+Q正常退出、重启打开项目后，AX及磁盘均确认两片段[0,5)、[6,10)，offset0/6。原生鼠标拖动尾部显示预览约9.505208秒，但磁盘未保存，判定未通过；正在修复释放事件提交。截图检查剪辑间隙、选中边框和右侧详情一致。测试实例已正常退出；未改用户音乐数据。此证据解除此前原生分割/精确裁剪/导出/重开未验限制，仍未进行设备听音或Windows/Linux GUI验收。

### 拖动裁剪释放提交修复通过（2026-09-20）

原生验收发现真实缺陷：React手柄自身pointerup处理在该拖动场景没有提交，只有预览变化。改为拖动期间注册窗口级pointermove/pointerup/pointercancel，结束或组件卸载时清理监听。使用最新 `.cache/pnpm-package-check/mac-arm64/Printemps.app`（不含Python的UI验证包）重复同一原生拖动，详情同步3.245秒，磁盘源出点为9.244791666666666秒、offset6秒，明确验证已提交。测试应用正常退出。75项测试、构建通过；完整release包早于本修复，仍需重建。

### 当前 Linux x64 构建通过（2026-09-20）

复用一次性 `printemps-linux-amd64-verify` 容器，源码只读挂载。首次失败于旧npm依赖残留的electron-vite入口权限；修复验证脚本，在pnpm冻结安装前仅清理容器 `/work/node_modules`。第二次完整脚本exit0：75项测试、更新器回退、真实分析、AppImage构建、包内分析全部通过。包含当前剪辑拖动、采样边界与缓存释放修复。AppImage保存在容器 `/work/release/Printemps-0.1.1.AppImage`，3,045,434,915字节，blockMap3,143,223字节。构建日志和更新元数据已保存到 `.cache/linux-verification/current-clips/`。

此为Linux x64容器运行及打包证据，非Linux桌面安装/GUI/设备声音验收，也不是当前构建对的真实差分升级证据；Windows当前版本仍待构建，macOS完整release包仍早于最新修复。

### 当前提交三平台 CI 通过（2026-09-20）

提交 `98ab5ab7617e631ab269159a64ad7ca0ed3b9b14` 的 [Native build verification #35490330246](https://github.com/Means88/printemps/actions/runs/35490330246) 已完成，Windows 2025、macOS 15、Ubuntu 24.04 三个作业均为 success。工作流覆盖冻结 pnpm 安装、普通测试、运行时准备、真实分析、平台安装包构建及包内分析；Linux 另验证更新器全量回退。Windows 日志确认 75 项测试通过、2 项条件测试跳过，生成 `Printemps Setup 0.1.1.exe`，包内分析测试通过（8.65秒）。

本次覆盖最新剪辑拖动提交、采样边界和解码缓存释放修复，解除此前“当前 Windows 未构建”的限制。CI macOS 使用 ad-hoc 签名，不是 Developer ID 公证验证；工作流没有上传安装包产物，不能据此声称已交付可下载安装包。三平台实际安装、Windows/Linux GUI、设备听音及当前版本真实差分升级仍未验收。仓库本地 `release/mac-arm64` 仍是较早构建，不因远端 CI 成功而变为最新。

### 仅分割时复用解码缓冲（2026-09-20）

多剪辑若按采样位置完整、连续覆盖源音频，且时间轴位置未改变，现在直接复用解码缓冲，不再为纯分割额外分配整曲 PCM。按 offset 排序检查，不依赖数组顺序；隐藏、间隙或位移仍生成正确的试听缓冲。新增测试验证复用对象、零额外分配，以及隐藏/位移后的实际采样与静音间隙。76 项测试通过、2 项条件跳过，生产构建通过。此为分配路径和采样一致性证据，不是长音频进程内存压力实测；该改动晚于上述三平台 CI。

### 长音频 PCM 缓冲压力验证（2026-09-20）

执行 `PRINTEMPS_TEST_CLIP_MEMORY=1 PRINTEMPS_MEMORY_REPORT=/tmp/printemps-clip-memory.json pnpm exec vitest run tests/clip-memory.test.ts`，通过。实际分配6轨×10分钟×44.1kHz×立体声 Float32Array（1,270,080,000字节），每轨60片段；20次重建均复用源缓冲，零新增PCM分配。裁剪一轨新增211,680,000字节，校验300–305秒静音、前后采样和源数据不变。报告 ArrayBuffer 总量1,481,783,332字节，末次RSS779,419,648字节，缓冲场景耗时261ms；RSS不是峰值，也不能与逻辑分配量等同。

此测试默认跳过，避免普通测试自动占用约1.5GB内存。它使用Node真实数组与AudioBuffer结构适配，不包含Electron解码、音频设备调度、系统回收或真实歌曲；以上尚待完整桌面压力验证。多轨均发生裁剪时仍可能保留源与时间轴缓冲两份PCM，此测试不证明任意时长/轨数都能稳定播放。

### 剪辑详情还原画板30（2026-09-20）

对比 `design/workspace-revision/ymoeh.png`，修正详情曾使用小数秒、名称下显示轨名、末行显示采样率的偏差：现在位置/时长/源入出点使用毫秒时间码，名称下显示项目时间范围，末行显示源音轨。编辑支持秒数或 mm:ss.mmm / hh:mm:ss.mmm，拒绝非法时间分量，保留主进程范围校验。

英文1280×800预览输入00:02.125后，波形入点、offset00:02.125、时长00:07.875同步正确；中文1440×900重新打开验证默认入出点时间码及源音轨显示。输入与分离/导出、播放区均可见。77项普通测试通过、3项条件跳过，生产构建通过。沿用已有Pen设计，无设计意图变更；预览证据不代替原生IPC或真实音频验证。

### 最新完整 macOS 包重建完成（2026-09-20）

`pnpm run package` exit0，`release/mac-arm64/Printemps.app` 已更新，包含截至 ad90484 的功能代码（后续95f8b05仅README）。包标识为 `com.means88.printemps`；app.asar SHA256为 `f447748c6cb2d4d8538a7cf95af51a4dff0552703776ca8964e34f48b0a77eb4`。Developer ID签名完成，`codesign --verify --deep --strict --verbose=2` exit0，结果valid on disk / satisfies its Designated Requirement。

使用包内资源运行真实分析测试通过，总耗时5.75秒，覆盖Beat This与Essentia推荐结果。日志 `/tmp/printemps-latest-package.log`、`/tmp/printemps-latest-package-analysis.log`、`/tmp/printemps-latest-signature.log`。这解除此前本地完整release包陈旧的限制；当前公证仍因配置不可生成而跳过，尚未生成本次DMG或证明外部机器安装。当前Windows/Linux CI证据仍对应98ab5ab，未覆盖其后的缓冲复用和时间码显示改动。

### 工作台工具栏还原（2026-09-20）

继续对比画板30：顶栏导出恢复secondary，分割移至节拍器右侧；补回可见音轨数量，将列表按钮组与244px轨道头对应，试听模式控件从x255开始。底部时间模式读数和总时长恢复毫秒时间码，拍子模式保留小节拍数格式。英文1280×800实屏检查控件无重叠，播放、循环、出入点、总音量均可见，生产构建通过。此为已有设计还原，未修改Pen；本次样式与展示改动晚于上述完整macOS包。

### 音轨密度还原（2026-09-20）

画板30为84px音轨；实现此前受108px最小高度、90px波形最小高度以及音量读数占行影响而过高。现在恢复84px轨道、压缩轨头间距，将读数定位于推子上方，并给剪辑名称保留独立波形上沿空间。英文1280×800实屏检查各控件不重叠；1440×900开启节拍器后显示节拍器及六条音轨。主唱增益数值从-3编辑到-6后推子与读数同步，普通音轨DOM实测84px。生产构建通过；仅调整既有设计尺寸，无音频逻辑变更。

### 首页导入与最近项目还原（2026-09-20）

对照最新03画板补回蓝色“选择音频文件”视觉入口、项目行波形图标及进入箭头，并恢复导入区与项目栏约2.5:1比例。整个拖放区仍是一个可键盘操作的导入按钮，避免嵌套按钮；保留简短文案和现有搜索。中文1440×900、英文1280×800实屏检查通过，按钮文字白色可读，长项目名按行内宽度省略。预览点击导入入口进入示例工作区，生产构建通过；此操作不替代原生文件选择器验证。

### 声部选择弹窗三栏还原（2026-09-20）

对比画板04发现旧实现660px纵向堆叠，与分类/卡片/摘要三栏不符。现按已有设计恢复宽弹窗、来源条、搜索与预设行、左侧分类、中间三列卡片和右侧下载摘要；选择卡片有蓝色描边，缓存文字用绿色，底部取消/开始分离靠右。必要信息与现有搜索、选择逻辑保留，未恢复教学段落。

英文1280×800验证Band预设选中4项，搜索无结果时4项仍保留，摘要显示2已缓存/2待下载及155.2MB（预览示例数据）；清空搜索恢复完整卡片列表及已选状态。卡片区域独立滚动，底部操作可见，取消返回原工作区。生产构建通过；本次未执行真实模型下载或推理。

### 下载失败阶段与重试修复（2026-09-20）

修复下载异常后错误返回声部选择的流程：服务记录failurePhase，模型准备失败保留下载弹窗，使用下载类错误提示并提供直接重试；推理失败仍使用工作区任务恢复。测试注入ensure失败与runner失败，确认分别标记downloading/separating且源轨保留。77项测试通过、3项条件跳过，构建通过。

新增开发专用 `?separationDownloadPreview=1`：首轮模拟下载失败，第二轮持续进度，可取消，不访问网络或模型。浏览器验证失败保持Downloading models、重试进度归零；返回工作区后经过后续进度事件仍无弹窗，Show download可重开。检查中另修正取消事件关闭弹窗回工作区，最后类型检查通过；最后这项关闭修正尚待下一轮交互复验。完整05画板的模型队列与来源波形布局尚未还原，不能因恢复流程修复而视为05全部完成。

### 下载队列与来源波形还原（2026-09-20）

05弹窗恢复宽布局：左侧当前模型、真实文件名、百分比、字节进度与模型队列，右侧来源剪辑名称/时长/采样率/声道及范围波形。服务为每个模型发送received/total/ready，ensure完成校验后才ready；逐次更新创建新记录，历史事件不被后续修改。未知字节显示破折号，不制造速度值。测试验证配置/权重中间进度未标ready，完成后字节和ready正确；普通套件77项通过、3项条件跳过，构建和类型检查通过。

英文1280×800模拟下载视觉检查通过，四模型队列与底部操作均可见；失败显示Interrupted和已接收字节，重试恢复下载。取消后dialog计数为0，补齐上一条取消关闭复验。浏览器数据为明确标注的fixture；真实服务字节事件由模型缓存回调及服务测试验证，未在本轮重新下载真实模型。

### Cached separation preparation — 2026-09-20

- Model cache progress now distinguishes verified cached files from real downloads. A fully cached separation remains in preparation until inference, without opening the model download dialog. Missing/corrupt files emit download state before requesting network data; byte counts and per-model readiness remain available.
- Validation: `pnpm exec vitest run tests/models.test.ts tests/separation.test.ts` passed 5 tests, covering cached-only task phases, corruption repair, interrupted transfers, retry, and source preservation. `pnpm run build` passed. This is code-level coverage; no new packaged desktop build or device-audio verification was performed for this change.

### Separation dialog source identity — 2026-09-20

- Setup and interrupted-download dialog descriptions now resolve the configured/task clip, rather than always displaying the parent track name. Legacy single-clip tasks retain their fallback; selection elsewhere cannot change the configured source label.
- `pnpm typecheck` passed. Browser fixture check: renamed the Lead vocal clip to Verse vocal (parent track remained Lead vocal), opened Choose stems, and confirmed its source description was Verse vocal. Temporary fixture tab closed; no user audio modified.

### Export failure recovery — 2026-09-20

- Export now uses the shared compact error notice with export-specific guidance for full/read-only/private destination folders. Failed exports no longer expose Open folder when zero files succeeded; a new attempt clears stale success/destination state, including cancelled folder selection.
- Existing independent-copy and captured-clip behavior is retained. Targeted error/export/clip suite passed 12 tests (including real FFmpeg crop/export checks), and `pnpm run build` passed (`/tmp/printemps-export-recovery-build.log`). Native folder-dialog cancellation and rendered failure layout still need current-build manual verification; these tests do not prove either.

### Export recovery rendered verification — 2026-09-20

- Added development-only `?exportRecoveryPreview=1`: successive exports simulate disk-full failure, success, then folder-picker cancellation. No files or system dialogs are created.
- At 1280×800 in English, verified the disk-full notice fits without clipping; Close/Export remain right-aligned and there is no Open folder button. Retry clears the alert and displays Export complete/Open folder. A subsequent cancelled attempt clears both stale success and folder access. Temporary browser tab closed and viewport reset.
- `pnpm typecheck` passed. This verifies renderer behavior; native folder-picker cancellation remains a separate desktop acceptance item.

### Model library fidelity — 2026-09-20

- Restored Pen 07's full-page library surface below the native titlebar: cache count/bytes/path summary, search, animated All/Cached/Not downloaded filters, aligned filename/size/status/action table, and five-row pagination. Existing download, delete, cancellation, hash verification and error handling remain connected. Model filenames come from the pinned manifest.
- Browser preview at 1280×800 English verified 14/53 cached, cached-only pagination from 1–5 to 6–10, empty search 0–0 with disabled pagination, and combined search/filter resetting to page one. Fixed an observed overlay stacking issue and compact filter wrapping. Build passed (`/tmp/printemps-library-layout-build.log`). Cache path changes remain available in Settings; the board's inline change-location action and final titlebar integration still need completion.
- CI 35492712177 is live at commit 9e21ead; all three jobs reached installer build. It does not include this model-library change. No installer upload result yet.

### Model library header and cache location — 2026-09-20

- Added Pen 07's Change location action using the existing native directory-selection API. A successful selection refreshes model verification and propagates returned Settings into the app; controls disable during the operation. Existing backend task/path checks remain authoritative.
- Opening the library updates titlebar title and gutter; returning restores the underlying page title. At 1440×900 English, brand and content left edges both measured 48px. Table bottom 792.89px fits inside its 812px viewport after adjusting row padding. Back restored New project. Browser fixture did not invoke a real native folder picker.
- Production build passed (`/tmp/printemps-model-library-integration-build.log`). CI 35492712177 still covers the prior 9e21ead commit, not these library revisions.

### Library download presentation and CI artifact — 2026-09-20

- Library download progress now reuses the animated rounded task-progress component. Header progress text stays inline with its icon instead of wrapping beneath the titlebar.
- English 1280×800 simulated download observed at 87%, then completion updated cached count 14→15 and restored actions. A second simulated download was cancelled and restored Change location / row actions with cancellation guidance. The list scrolls independently while the progress strip and cancel control stay visible. Preview did not download model weights.
- Production build passed (`/tmp/printemps-library-progress-build.log`). CI run 35492712177 macOS job succeeded and artifact 10600205263 was verified present/unexpired, 765,586,979 bytes, for commit 9e21ead. Windows/Linux were still running; this does not cover subsequent library changes.

### Preferences page fidelity — 2026-09-20

- Restored Pen 09's full-page settings layout below the native titlebar with aligned language/device/directory rows and right-aligned Done. Kept directory reset and existing updater controls; omitted the old board's instructional paragraphs in accordance with the user's reduced-copy requirement.
- Extracted Preferences from the main workspace. Language/device changes now send only the changed field, disable while saving and apply returned settings after success; rejected saves retain the prior value and show an in-page error. Directory controls invoke the existing native chooser.
- English 1280×800 rendered verification showed all main controls and Done. Changed CPU→Automatic and English→Chinese in the fixture, then checked 1440×900 DOM bounds (page 0..1440, Done right 1384/bottom 868, body width 1440) and Done returned to the Chinese home. Temporary tab closed and viewport reset. Production build passed (`/tmp/printemps-preferences-build.log`). No new native directory-picker test was performed.
- CI 35492712177 Windows and macOS succeeded; Linux installer step remains live. That run covers 9e21ead, before library/preferences revisions.

### Three-platform artifacts and history audit — 2026-09-20

- Run https://github.com/Means88/printemps/actions/runs/35492712177 completed successfully for all three platforms at 9e21ead. GitHub artifact API confirms all three artifacts present and unexpired:
  - Windows X64: 10600230393, 344,758,985 bytes, SHA256 539dd91313a0f37b6eeade5c25e92644d6bb2dd6ae5002a514557dda294e2f12.
  - macOS ARM64: 10600205263, 765,586,979 bytes, SHA256 3dd8f90d12420897ad9c39135939e41f2ae6295c9a99f823888288307bd54ae4.
  - Linux X64: 10600190699, 3,045,443,686 bytes, SHA256 4a1e00be0b2c910ee6b1d801d0045cc73ddbe2dfa5596bff6ba91b44526fbffe.
- Digests describe GitHub's artifact archives, not individual installer hashes. Installer execution/install/upgrade still requires desktop acceptance. Later model-library/preferences changes are not included.
- History audit against board13 found the inspector still renders ExportDialog without trackId/clipId, leaving it permanently disabled after clip-scoped export was introduced. Next work must design and implement explicit clip selection there, preserving the user's selected-clip-only export requirement. Do not mark history export complete based on the separate workspace export tests.

### History clip selection and export — 2026-09-20

- Updated Pen board13 first: selected clip row, clip duration, Export clip label and interaction context. Exported `design/history-clips/b1tMnW.png`, refreshed `design/exports/13-history.png`, and saved `design/Printemps.pen` through Pen (Edited indicator cleared). No encrypted file parsing used.
- History inspector now lists visible result clips individually, excludes hidden tracks/source clips, and supplies explicit track/clip IDs to ExportDialog. Initial export is disabled until a clip is selected; changing project resets the selection. This repairs the previously permanently-disabled history export action.
- English 1280×800 fixture: selected Drums 00:10.000, Export clip became enabled, modal identified Drums · 10.000 s, simulated failure recovered to Export complete on retry. Production build passed (`/tmp/printemps-history-clips-build.log`). This UI check does not replace real native export verification.

### Current signed native build and real history export — 2026-09-20

- `pnpm package` session77958 completed exit0 at source82518c3; notarization skipped due missing configuration. `codesign --verify --deep --strict` passed; app.asar SHA256 9126757bf41311163f83c4ce128cf2b078195bfb720461cfa9335547aad608b1. Current full tests78 passed/3 conditional skipped; packaged analysis passed in5.98s.
- Logs: `/tmp/printemps-current-native-package.log`, `/tmp/printemps-current-native-signature.log`, `/tmp/printemps-current-native-analysis.log`, `/tmp/printemps-current-native-tests.log`.
- CUA resolved the original release path to stale bundle metadata. A cloned independent `/tmp/Printemps-Current-Native-QA.app` connected successfully. Only the launched QA PID29427 was terminated before switching; the user's older release-revision app was untouched.
- Isolated userdata `/var/folders/hh/0nr41s6j25d6xp6g97dq9m0w0000gn/T/printemps-current-native-qa-6y4poizs`: known synthetic220Hz source with a synthetic result track containing two visible clips and one hidden source clip. History displayed exactly two choices. Exported source1–2 seconds at timelineoffset4 through the real native folder picker to `/tmp/printemps-native-export-qa/Synthetic history export QA_One second excerpt.wav`: soundfile confirmed44,100frames at44.1kHz, stereoPCM_24, exactly1second, no offset padding. A subsequent native picker cancellation cleared stale success/Open folder state and left the export dialog usable.
- Independent QA app remains open on history for continued directory-settings checks, execsession90737; CUA handle standaloneNativeQA. This synthetic result is not evidence of model separation quality.

### Native cache directory lifecycle — 2026-09-20

- In isolated native QA82518c3, Change location rejected a custom folder under private app storage and retained the original setting. Choosing `/tmp/printemps-native-model-cache` succeeded, the library refreshed to `/private/tmp/printemps-native-model-cache`, and Settings displayed the same path.
- Quit via native Cmd+Q and relaunched with the same isolated userdata. Settings still showed the custom cache path. Use default restored the private default models folder and disabled the reset button. QA app then quit, session42838 exited0; the user's other app was untouched.
- Observed the private-folder rejection previously produced generic network/cache guidance. Source now gives a specific choose-another-folder/reset-default instruction (export version only suggests another destination). Four error-guidance/settings tests and TypeScript passed. This text-only fix postdates the signed QA82518c3 build.

## 2026-09-20 — Project history layout restored against Pen 13

- Restored the full-width 48px-gutter history layout, 362px inspector, aligned audio/update/status/action columns, 90px rounded record rows, selected-row treatment and icon delete action from `design/exports/13-history.png`. Compact 1280 layout uses 32px gutters and a 300px inspector. Existing result/task filters and recoverable deletion remain available. The titlebar uses the same page gutter.
- Browser fixture verification: English 1440×900 and 1280×800, Chinese 1440×900. Four rows, pagination and inspector actions fit. Chinese measured pagination bottom 839px and inspector bottom 808.69px in a 900px viewport, without horizontal overflow.
- Clip selection enabled Export clip; moving to the next project page cleared selection and disabled export. Search found fixture 12; no-match search removed the inspector. Delete confirmation identified the selected project and cancellation returned without mutation.
- `tests/project-search.test.ts` and `tests/pagination.test.ts`: 3 passed. `pnpm run build` passed. This restores an existing Pen layout, without changing the editable design. Native package remains at `82518c3`; these renderer changes are not yet included in it.

## 2026-09-20 — Selected-clip export design and implementation

- Pen 08 now represents the current single-clip export flow, retaining the previous whole-track page in an independent archive board. Saved editable Pen and refreshed `design/exports/08-export.png`; design/interaction notes in `design/clip-export/README.md`.
- Renderer matches the 520px rounded dialog, colored clip identity, timecode duration, WAV/FLAC moving selection and actual sample rate/channel metadata. Native radio inputs retain keyboard arrow navigation. Action buttons remain right-aligned with one primary.
- English 1280×800 preview verified keyboard WAV→FLAC switching, corresponding output specification, ENOSPC guidance, retry success with Open folder, and subsequent cancellation clearing old success/shortcut state. No horizontal or vertical clipping in the dialog's failure state. Fixture exports do not write actual files; prior native clip-range evidence remains separate.
- Seven tests passed across export, export-folders, error-guidance and timecode; production build passed (`/tmp/printemps-clip-export-build.log`). Native package and remote CI predate these renderer/design updates.

## 2026-09-20 — IME-safe editing and dialog shortcuts

- Found clip-name/source-range key handlers committed or cancelled edits without checking composition, unlike the project-name editor. Added a shared composition-key guard, including legacy keyCode 229 candidate confirmation, across names, trims, faders, music parameter inputs, clip keyboard actions and workspace shortcuts.
- Installed Radix dismissable-layer handles Escape at document capture without a composition check. All application dialogs now prevent dismissal when that Escape belongs to an IME candidate; ordinary Escape remains unchanged.
- Regression tests invoke real ClipDetails field handlers: composing Enter/Escape preserves all three fields and focus, ordinary Enter dispatches the finished name, and ordinary Escape restores the prior value without saving. Dialog dismissal and global shortcut guards also covered. These tests simulate DOM event properties; real OS candidate-window behavior remains to be verified natively.
- Browser Chinese fixture: Enter saved 主唱副歌, Escape restored it after an unsaved edit; normal Escape from BPM input closed the music dialog. No real music or user project altered.
- Full suite: 84 passed, 3 conditional skipped (`/tmp/printemps-keyboard-full-tests.log`). Production build passed (`/tmp/printemps-keyboard-build.log`). No visual design changes in this correction.

## 2026-09-20 — Current signed package, native trim/export/restart

- Source `9995a92` pushed to `codex/clip-workspace-desktop`; workflow [35494871692](https://github.com/Means88/printemps/actions/runs/35494871692) dispatched. Windows and macOS completed successfully; Linux was still building installers at this checkpoint. No release published.
- Local `pnpm package` completed with Developer ID signing, strict deep signature verification passed. `release/mac-arm64/Printemps.app/Contents/Resources/app.asar` SHA-256: `cde4fb66e8866a5d82092603f0a3b8134cc73ddc9a311c96bb729427e8951a1a`. Packaged real analysis passed in 7.60s (synthetic pipeline test, not a performance claim). Logs: `/tmp/printemps-final-ui-package.log`, `/tmp/printemps-final-ui-signature.log`, `/tmp/printemps-final-ui-analysis.log`.
- Native QA used `/private/tmp/Printemps-Final-UI-QA.app`, isolated profile `/var/folders/hh/0nr41s6j25d6xp6g97dq9m0w0000gn/T/printemps-final-ui-native-6h1celhr`, copied only from earlier synthetic QA assets; user music untouched.
- Selected source range 1–2s at offset4s, renamed via native text field to 主唱剪辑验收, then entered source-in `00:01.250`. Renderer and persisted JSON agreed on start1.25/end2/offset4.25/duration0.75.
- New native export dialog showed that duration and format selector. Real FLAC export through macOS folder picker produced `/tmp/printemps-native-export-qa/Synthetic history export QA_主唱剪辑验收.flac`: 33,075 frames / 44,100Hz, stereo, PCM_24, exactly0.75s without timeline padding.
- CmdQ exited cleanly; relaunch same profile and All projects showed the updated Chinese name and 00:00.750, the other two-second clip, and no hidden source clip. Export remained disabled until a result was selected. Native history layout and selected-clip export were visually checked. Final QA process quit with exit0.
- This verifies native text entry and persistence, not an actual OS IME candidate window or audible device playback. Those boundaries remain open.

## 2026-09-20 — Find projects by clip names

- Closed a clip-workflow gap: the shared search indexed track names/stem labels but omitted renamed clips. It now includes clip names, including retained hidden source clips; deleting a clip removes that name from matching. Home's Recent projects now uses the same matcher as All projects.
- Regression tests cover Chinese/English clip names, whitespace/case, retained hidden sources and deletion. Two project-search tests and typecheck passed.
- Browser flow renamed a result clip to 独特副歌片段, returned Home and found its project via 独特副歌; All projects found the same result and exposed the renamed clip. Unmatched query removed the inspector. This is behavior-only; existing layout/design unchanged.
- Current CI remains pinned to `9995a92`, before this search fix. Windows/macOS artifacts are present and unexpired: Windows archive10600073720 (344743774 bytes, sha256449ea39de5716d05495e19066ad7d38f3aeb5fab415dcec6aa292140294a3afc), macOS archive10600462942 (765598321 bytes, sha2563041eeb818b57a1c0b2ee5f7ab2165a0a4fcc269a743721e8b51e39841a538ad). These are artifact archive digests, not individual installer checksums. Linux build still live at this checkpoint; not restarted.

## 2026-09-20 — Clip edits join the save/close queue

- Found clip IPC edits bypassed ProjectSession while the close handshake only awaited that session. Inline blur could therefore begin an asynchronous clip write without making renderer close/navigation await its completion or surface its failure.
- ProjectSession now queues authoritative clip mutations alongside metadata writes. It publishes the returned project, retains failed operations for Retry save, and blocks flush/navigation/close while a write is unresolved or failed. Clip editing is disabled during an active edit or unresolved save error to avoid submitting stale expected-clip snapshots.
- Regression tests verify a gated clip mutation keeps close pending after metadata edits, publishes its final state, and retains/retries a failing mutation. Browser `clipSaveFailure=once` flow preserved the proposed name, showed Retry save, disabled further clip edits, blocked Home, then saved on retry and allowed Home. No visual style changes.
- Full suite: 87 passed, 3 conditional skipped (`/tmp/printemps-clip-save-tests.log`); production build passed (`/tmp/printemps-clip-save-build.log`). A native close-on-active-clip-edit regression is still needed after rebuilding this source.
- CI [35494871692](https://github.com/Means88/printemps/actions/runs/35494871692) completed successfully on all three platforms at `9995a92`. All three retained installer archives are present and unexpired. Linux artifact10599999104: 3045452034 bytes, SHA-256 `291e57c134ec575b886681a2814b97cda2e50d06c5f341f0ccc292e0bb172551`. Windows/macOS artifact metadata recorded above. Build and packaged-analysis success do not imply GUI/install/upgrade validation on those platforms.

## 2026-09-20 — Native close handshake and real write-failure recovery

- Executed the production `out/` build at `b95038c` with the installed Electron runtime copied to `/private/tmp/Printemps-Close-QA.app`. Renderer URL confirmed `file:///Users/means88/x/stems/out/renderer/index.html`; this is a real native IPC/window run, not a signed packaged-app validation.
- Isolated synthetic-only profile: `/var/folders/hh/0nr41s6j25d6xp6g97dq9m0w0000gn/T/printemps-close-native-xa56q9gc`. Set clip name to `Saved by quit handshake` while focused, without Enter/blur, then CmdQ. App exited0 and on-disk clip name matched, with source range/offset unchanged.
- Relaunched, temporarily made only the synthetic project directory read-only, entered `Recovered after disk failure` and CmdQ. Native EACCES dialog appeared; window stayed open. Disk retained previous name and UI retained unsaved draft. Restored original directory permissions, acknowledged error, used Retry save; UI returned to editable state and disk contained new name. Subsequent CmdQ exited0. Original QA directory permissions verified restored; user app/project untouched.
- Native failure dialog currently exposes the underlying technical error; the retry path is functional. This does not verify OS IME candidate composition or physical audio output.

### 2026-09-20 · Native close-save recovery wording

- Replaced raw native close-error text with localized concise recovery guidance. Disk-full, write-permission, and renderer-save timeout have separate next actions; the alert does not display private project paths or suggest changing the model cache for a project-save failure.
- Concurrent close/quit error handlers share one visible alert guard. Existing flush failure semantics still prevent close and retain pending changes.
- Focused validation: `pnpm exec vitest run tests/save-failure.test.ts tests/project-session.test.ts tests/shutdown.test.ts` — 10 passed; `pnpm typecheck` passed.
- This is source-level validation of the copy and existing save queue. The new wording has not yet been included in a signed package or rechecked in a native error dialog; earlier real EACCES recovery evidence remains separate.

### 2026-09-20 · Native recovery wording verified (37869cc)

- Production build completed (`/tmp/printemps-close-copy-build.log`). Launched the installed Electron runtime clone `/private/tmp/Printemps-Close-QA.app` against the current production `out/`, using only the existing isolated synthetic QA profile.
- Made that QA project directory temporarily read-only, edited the focused clip name to `Localized recovery verified`, and invoked Cmd+Q without committing the field first.
- Native accessibility output confirmed “Changes have not been saved”, the window-retention message, and the write-access / Retry save instruction. No private path was present in this native alert. The process stayed alive; the old saved project was unchanged.
- Restored the exact original directory mode, dismissed the alert, and clicked Retry save. The editable name and waveform label updated; Cmd+Q then exited with code 0. Disk assertions confirmed the new name and unchanged source range 1.25–2.0s / timeline offset 4.25s, plus restored directory permissions.
- This validates the current unpackaged production Electron window. It does not update the signed artifact or prove Windows/Linux native rendering. The workspace error banner still exposes the raw diagnostic; a future design-aligned recovery banner should keep details collapsed.

### 2026-09-20 · Compact workspace save recovery

- Added and saved Pen board `OspP2` (31), preserving existing boards. Chinese/English compact banner designs and PNG are in `design/save-recovery/`; final Pen layout reported no clipping.
- Implemented `SaveRecovery` with concise reason, collapsed diagnostics and right-aligned secondary retry. Removed duplicate footer retry action; pending edits and existing retry queue behavior remain unchanged.
- English 1280×800 fixture: induced one clip-save failure, confirmed 52px collapsed banner, no horizontal overflow, retained draft, disabled clip editing. Expanded diagnostic measured 72.5px total banner height. Retry committed the name and removed the banner; clip controls re-enabled.
- `pnpm typecheck` passed. Preview uses synthetic in-memory state; native persistence recovery is covered by the separate preceding production-window record, not by this UI fixture.

### 2026-09-20 · Track mutations join close/save recovery

- Routed track move/place/delete through `ProjectSession.mutate` instead of direct renderer IPC plus an unawaited refresh. Close/export/separation flushes now include outstanding track mutations, and failed mutations remain retryable.
- Track-manager mutation controls disable on save failure; Done remains available so the workspace retry action is reachable. The dialog explains that recovery step without showing a long raw path.
- Added regression coverage for failed deletion → close blocked → retry followed by metadata edits, proving deleted tracks are not resurrected. Related session/track suites: 11 passed; typecheck passed.
- Browser fixture `trackSaveFailure=once`: Lead vocal Move down fails once, controls disable and Done remains enabled. Closing and Retry save succeeds; reopening shows Original, Drums, Lead vocal, Bass, Electric guitar, Other in order with controls restored. This is UI fixture evidence, not native persistence validation.

### 2026-09-20 · Reordering preserves project time bounds

- Removed the assumption that `tracks[0]` is the original audio from recent-project duration and first-beat validation/input bounds. Both now use the same `timelineDuration` as playback; setting first beat to the playhead also clamps to that range.
- Regression covers a 0.5-second separated excerpt placed before the 4-second original, both orderings, and a result offset extending the project to 5.5 seconds. This is a behavior correction with no design/layout changes.
- Full current source validation: 90 tests passed, 3 conditional integration tests skipped (`/tmp/printemps-save-track-full-tests.log`); production build passed (`/tmp/printemps-save-track-build.log`). These checks cover the accumulated save-recovery/track-queue changes; they do not establish physical audio or other-platform GUI acceptance.

### 2026-09-20 · Current-source packaging dispatched

- Pushed `9564b9800a815aa46807678c136a796814cdae6d` to `codex/clip-workspace-desktop`.
- Started three-platform workflow https://github.com/Means88/printemps/actions/runs/35496338370 on that exact SHA. Initial API snapshot confirmed all three jobs in progress; success is not yet claimed.
- Local `pnpm package` is running against the same source; `/tmp/printemps-current-package.log` reached Developer ID signing. The existing `release/mac-arm64/Printemps.app` is being replaced and must not be treated as a verified artifact until this run completes and signature / bundled-analysis checks pass.

### 2026-09-20 · 9564b98 local signed package verified

- `pnpm package` completed successfully; `/tmp/printemps-current-package.log`. Output: `release/mac-arm64/Printemps.app`, Developer ID XINGYU XU. Notarization skipped; no public release or new DMG claimed.
- `codesign --verify --deep --strict --verbose=2` passed; `/tmp/printemps-current-signature.log`.
- `PRINTEMPS_TEST_RESOURCES=.../Printemps.app/Contents/Resources pnpm test:integration` passed with the package's Python, Beat This checkpoint and Essentia WASM; `/tmp/printemps-current-analysis.log` (6.91s test-run duration, synthetic pipeline check rather than hardware/music-quality benchmark).
- app.asar SHA256: `d35fa658dc7bf095491d9f691a4cf4e715fab80db07eabf096e5c555b2a20a49`.
- Recent original/clip native checks predate this signed package and remain distinct; this turn proves package signing and bundled analysis, not all native UI or physical audio behaviors.

### 2026-09-20 · 9564b98 signed native track retry / restart

- Launched an APFS clone of the verified signed package (`/private/tmp/Printemps-9564-QA.app`) with the isolated synthetic close-test profile. CUA initially opened an additional idle default-profile window; it was closed without opening or editing a project, then the synthetic-profile window was explicitly verified before testing.
- Made only the QA project directory temporarily read-only. Moving Synthetic result above Original failed with real EACCES; the saved order stayed unchanged. Done remained available, and the workspace displayed the compact localized permission message, collapsed Technical details, and Retry save.
- Restored original directory permissions, retried, and quit normally (exit 0). Disk data showed Synthetic result before Original. Relaunched the signed package with the same QA profile: recent-project duration remained 00:10 and workspace order remained Synthetic result, Original. Normal exit again returned 0.
- This fixture's tracks both have 10-second source duration; it proves order persistence and native recovery, not the separate short-first-track edge case covered by the domain regression test.

### 2026-09-20 · Acceptance scope and design index

- User confirmed no Windows/Linux desktop environment is available and asked to complete macOS acceptance first. Their CI builds remain useful packaging evidence; GUI/device acceptance is explicitly deferred, not claimed complete.
- Added Pen 31 save-recovery design to `design/index.html`. Browser navigation verified its title, original-PNG link, and successfully decoded 1440×176 PNG.

### 2026-09-20 · Signed macOS corrupt-import recovery

- In signed 9564b98 isolated synthetic QA, selected `/tmp/printemps-invalid-audio-qa.wav` (40-byte intentionally invalid fixture) with the native macOS open panel.
- FFmpeg rejected the file. Choose audio remained enabled; dismissing the error and opening the existing synthetic project succeeded, retaining its reordered tracks. The app then quit with exit 0.
- Filesystem assertion confirmed the QA projects directory contained exactly the original project and no partial import directory.
- Remaining UI issue observed: import failures still use the generic raw diagnostic banner. They need concise localized recovery copy with optional technical details; this acceptance only proves import rollback and continued navigation.

### 2026-09-20 · Designed import recovery copy

- Extended Pen31 (`OspP2`) with Chinese/English import failure rows, exported updated PNG, and saved the Pen source using its native File → Save command. Existing save-recovery rows were preserved.
- Replaced import's raw global error with a dedicated compact banner, optional technical details and Choose another file. Known disk, permission, missing-file, and decoding errors have separate recovery copy; unknown errors do not assert that the audio is damaged. A failed pending save continues to use the save banner rather than being mislabeled as import failure.
- English1280×800 browser fixture: failed first import produced a52px collapsed banner with no horizontal overflow; choosing another file opened the workspace and removed the banner. Typecheck passed. Native invalid-file rollback was verified in the preceding signed9564b98 run; this new copy is not yet included in that package.

### 2026-09-20 · Three-platform 9564b98 CI complete

Workflow https://github.com/Means88/printemps/actions/runs/35496338370 completed successfully on exact SHA `9564b9800a815aa46807678c136a796814cdae6d`. All three jobs passed tests, installer build, packaged real analysis and artifact upload. Artifact API confirmed non-expired archives (7-day retention):

| Platform | Artifact ID | Archive bytes | Archive SHA256 |
| --- | --- | --- | --- |
| macOS ARM64 | 10601595254 | 765599903 | 027976dd74f6eae57f0cd71a85857d8360313659d4ac9bd1db8f71479051fdfb |
| Linux X64 | 10601135792 | 3045452019 | 27e9dfe5441ef1273f563cf6de1900a0dad679b89e79a370b60a9dc7d5ebcd00 |
| Windows X64 | 10601086130 | 344763284 | 56f05080eddffcbf8dd2c7da5e879537485db7962f1b761689a982b5ec411dd3 |

Hashes identify uploaded artifact archives, not individual installers. macOS CI uses ad-hoc signing. No public release was created. Subsequent 14a80a3 import-recovery copy/design is not in these archives. Per user direction, prioritize macOS acceptance while Windows/Linux GUI acceptance is deferred for lack of an available environment.

### 2026-09-20 · Forced-owner-exit worker protection

- Audit found JSON Python workers only handled graceful AbortSignal cancellation; a forcibly killed main process could leave analysis/separation running. Added a daemon parent-lifetime guard before heavy imports to both Python entry points. The main runner passes its PID explicitly. POSIX detects parent reassignment; Windows waits on a SYNCHRONIZE-only parent process handle. Standalone CLI use without the environment variable remains unchanged.
- Real subprocess regression force-kills a Node owner after Python reports ready, then requires the inherited output pipe to close within5seconds, proving the Python task also exited. Passed on this macOS host, alongside normal worker completion/error/cancellation coverage. Windows implementation has not yet run in CI.
- Real Beat This/Essentia source integration passed (`/tmp/printemps-parent-analysis.log`). Full tests:91 passed,3 conditional skipped (`/tmp/printemps-parent-full-tests.log`); production build passed (`/tmp/printemps-parent-build.log`).
- This verifies worker lifetime, not a complete native UI crash/restart of a live separation task. New guard and import recovery are later than signed/CI9564b98 and require a future packaged build.

### 2026-09-20 · Native separation crash recovery and clip retry

- In the isolated synthetic macOS QA profile, force-killed the owning Electron process during real cached drums inference. The Python worker exited; restarting recovered the task as interrupted and retained its source clip.
- Found and fixed recovery incorrectly inventing `retrySourceId` before the first result, which discarded the selected clip when retrying a multi-clip source. The recovered initial task now preserves its `clipId`; a regression covers this case.
- Native retry completed real inference. Persisted Other and Drums outputs each have a 0.75-second source range and offset 4.25. The selected source clip is hidden, while another visible two-second clip on the same source track remains. Final completion visuals still need inspection.
- Current production build passed. Full regression on `9a23dd8`: 92 passed, 3 conditional skipped, 34 test files passed (`/tmp/printemps-handoff-tests.log`). This used current unpackaged production output; the signed package and CI artifacts remain at 9564b98.
- Continuation details and exact isolated paths are in `docs/HANDOFF.md`.

### 2026-09-20 · Native IME composition, real playback bus and metronome timing (18799ce)

- Closed the previous idle QA instance (its window had already been closed; process exited on SIGTERM). Relaunched `/private/tmp/Printemps-Close-QA.app` against the current production `out/` with the same isolated synthetic profile plus `--remote-debugging-port`, so the native window was driven through Chrome DevTools Protocol instead of synthesized DOM events. Full suite on this checkpoint: 92 passed, 3 conditional skipped.
- Completion screen after the earlier recovered separation: `… - Other` and `Drums` result tracks each show a 0.75-second clip at offset 00:04.250; the consumed source clip is hidden while the two-second sibling clip remains; clip details show Offset 00:04.250 / Duration 00:00.750 / Source track name. Screenshot reviewed at 1440×900 English.
- IME: used `Input.imeSetComposition` (Chromium's real InputMethodController) on the clip name field. `compositionstart/update` fired for `n → ni → nihao`; Enter and Escape during the composition reported `isComposing=true`, did not blur, commit or reset the field. `Input.insertText` committed `你好世界`; a plain Enter then blurred and saved. Disk clip name is `你好世界` with source range 0–0.75 and offset 4.25 unchanged. Same flow on the inline project name: Escape while composing kept the editor, commit + Enter saved `测试项目`, title bar and header updated, disk name persisted. This exercises Chromium's composition pipeline, not a physical macOS Pinyin candidate window.
- Playback: `AudioContext` state `running`, sample rate 44100, `outputLatency` 0.026 s on the default sink (system default output is the built-in MacBook Air speaker). With Original monitoring, analysers attached to the live graph read RMS ≈0.056 / peak 0.08 on the original track gain and RMS ≈0.0018 / peak 0.0025 on the master gain (0.0316 = −30 dB), i.e. real signal reaching the destination. This proves the Web Audio bus feeds the OS default device, not what a listener hears.
- Metronome: set BPM 120 through the Rhythm & key dialog, enabled the switch, Done; header showed `120 BPM`, disk `metronome: true`. Metronome track appeared at the top with beat markers. During real playback in Stems mode from 00:00 (no stem audio before 4.25 s), master-bus onsets were detected at 0.499 s intervals (one 0.488 s reading from rAF sampling granularity), peak 0.0052 ≈ −12 dB click × 0.7 × master gain. Six consecutive clicks observed.
- Quit: Cmd+W closed the window (CDP page target disappeared, process alive as expected on macOS). Cmd+Q sent to that process exited it within 1 s. An earlier AppleScript `tell application "Electron" to quit` did not quit because a second unrelated dev Electron instance with the same process name is running on this machine; that is a targeting ambiguity, not an app defect.

### 2026-09-20 · 18799ce signed package, three-platform CI and native signed QA

- Pushed `18799ce20b584cd4c5959dea86df2a2fd95b799d` (source identical to `9a23dd8` plus docs) and dispatched https://github.com/Means88/printemps/actions/runs/35498158919 . All three jobs succeeded: tests, installer build, packaged real analysis, artifact upload. Artifacts (7-day retention, archive digests not installer checksums):

| Platform | Artifact ID | Archive bytes | Archive SHA256 |
| --- | --- | --- | --- |
| macOS ARM64 | 10601353244 | 765601942 | a0994096805ba1028d00061a50597e7b04463c0139c5571f681ce8703bd142f8 |
| Windows X64 | 10601153790 | 344751171 | c0fad63ec14fb3c6b77bd86b302fe7aa8ee38673e8a3668c20d4e321fe7e14d7 |
| Linux X64 | 10600748209 | 3045452074 | fccb715a64cfa1885e538c95f346c55f03c7f2fd839b683b3b352dfe90ac4f7d |

- Local `pnpm package` on the same source replaced `release/mac-arm64/Printemps.app` (Developer ID Application: XINGYU XU, notarization skipped; `/tmp/printemps-18799-package.log`). `codesign --verify --deep --strict` passed (`/tmp/printemps-18799-signature.log`). Packaged Beat This/Essentia integration passed with `PRINTEMPS_TEST_RESOURCES` pointing at the new bundle (`/tmp/printemps-18799-packaged-analysis.log`, 5.14 s). `app.asar` SHA256 `55ae0a0ea511058c8fd59294cdd3e455a5e6df54916e590fe3a07b6eaf62a151`. This package now contains the import recovery banner, the Python parent-lifetime guard and the recovery `clipId` fix that were missing from 9564b98.
- Launched an APFS clone `/private/tmp/Printemps-18799-QA.app` (signature re-verified) from `app.asar` with the isolated synthetic profile and a DevTools port; the native open panel was driven with System Events keystrokes.
- Import failure in the signed package: chose the 40-byte invalid `/tmp/printemps-invalid-audio-qa.wav` in the real macOS open panel. Home showed the compact banner “Cannot import · The audio is damaged or unsupported. Choose another file.” with collapsed Technical details and Choose another file: 52 px collapsed, 72.5 px expanded, 1400 px wide, no horizontal overflow at 1440. Expanded details show the user's own chosen path and the FFmpeg message; no private project path. Projects directory still contained only the original project (rollback intact).
- Forced-exit recovery in the signed package: started a real cached-drums separation of the two-second clip; the bundled `Resources/python/bin/python3 … worker/separate.py` worker was running at 33 % when the main process was killed with SIGKILL. The worker exited within 1 s (packaged parent-lifetime guard). On relaunch the persisted task moved from `running` to `interrupted` with its `clipId` retained; the lane notice and stem chooser both showed “The previous separation was interrupted…”. Retry reopened Choose stems pre-filled with the source clip and Drums (cached, 0 MB download); Start separation ran real inference and completed in ~48 s.
- Results: `Two second excerpt - Other` and `Drums`, both source range 0–2 s at offset 8; all three clips of the source track are now consumed/hidden, so the source track is hidden and the header shows Tracks / 05 (Metronome, two earlier results, two new results, Original). Screenshot reviewed. Cmd+Q exited within 1 s and left no singleton lock or worker processes.
- Minor polish noted, not fixed: the import banner's technical details include the IPC wrapper prefix `Error invoking remote method 'projects:import': Error:` before the FFmpeg message. Recovery retry intentionally reopens the stem chooser instead of starting immediately.

### 2026-09-20 · 18799ce signed package: trim, export, EACCES restart and cancel regressions

- Same signed clone `/private/tmp/Printemps-18799-QA.app`, isolated synthetic profile, CDP-driven window, native panels via System Events.
- Trim: typed `00:00.500` into Source out for the 0.75-second result clip and pressed Enter. Clip details showed 00:04.250 — 00:04.750 / Duration 00:00.500; disk range became 0–0.5 with offset 4.25 unchanged. Restored to 0.75 through the same field; disk followed.
- Export: Export clip → FLAC → Export → real macOS folder panel → `/tmp/printemps-native-export-qa`. Dialog showed “Export complete” with Open folder; file `测试项目_你好世界.flac` (the clip's name at export time) is 24-bit FLAC, 44.1 kHz stereo, 0.750 s by `afinfo`. Second export cancelled in the folder panel with Escape: dialog returned to idle, Export re-enabled, folder unchanged (3 files before and after). Close removed the dialog.
- EACCES: made only the QA project directory read-only (755 → 555), renamed the clip to `权限恢复验证` and pressed Enter. Compact banner “Save failed · Cannot write to the project folder. Check write access.” (52 px, no horizontal overflow) with collapsed Technical details and Retry save; clip editing disabled; draft retained; disk still had the old name. Restored 755, Retry save cleared the banner, re-enabled editing and wrote the new name (0–0.75, offset 4.25). Cmd+Q exited in 1 s; relaunch and reopen showed the renamed clip and the same five visible tracks.
- Cancel: started a cached Bass separation on the two-second `… - Other` result clip; the bundled worker reached 33 % before Cancel in the lane. The Python worker exited within 3 s, the task persisted as `cancelled` with error `Task cancelled`, its task directory was removed, the source clip stayed visible, no tracks were added, and the lane showed “Separation cancelled · Source track retained” with Retry/Dismiss. Dismiss removed the notice; Cmd+Q exited cleanly.
- Observation: Home lists the project as “6 tracks” while the workspace header shows “Tracks / 05” because the fully consumed hidden source track is counted on Home only. Not changed in this round.
- Source fix after these runs (not in the 18799ce package): new `src/shared/diagnostic.ts` strips Electron's `Error invoking remote method '…':` and repeated `Error:` prefixes before rendering Technical details in the import, save and task notices; `tests/diagnostic-detail.test.ts` added. Full suite 93 passed / 3 conditional skipped (35 files); production build passed.

### 2026-09-20 · Chinese workspace comparison against board 30 and cancelled-notice fix

- Ran the current production `out/` (with the diagnostic-prefix fix) through `/private/tmp/Printemps-Close-QA.app` in Chinese (`language: zh` temporarily written to the isolated profile, restored to `en` afterwards). Captured the workspace with a result clip selected at 1440×900 and, after resizing the window with System Events, at 1280×800 (`scrollWidth` 1280, no horizontal overflow; lane list scrolls vertically).
- Matches board 30 (`ymoeh`): header layout (back, inline name, BPM/key/meter, 分析, 导出, icons), 音轨列表 / 原始·分轨 segmented control / 时分秒 / 节拍器 switch / 分割 S, metronome lane on top with beat markers, Original dimmed in 分轨 mode, colored clip title and 起始位置/片段时长/源入点/源出点/源音轨 fields, right-aligned 分离 primary above 导出剪辑, transport with 入点/出点 and master fader on the right.
- Deviations logged for the design pass, not changed: (1) the board's right-side toolbar hint “滚轮 / 捏合缩放” is a − 1× + zoom group in the app; (2) the board's footer hint row (点击片段选中 · 拖动首尾裁剪 · S 在游标处分割 · 分离结果保持片段 offset) is absent in the app; (3) board header button reads 导出音轨, app reads 导出; (4) board shows a speaker icon before the master fader and its 起始位置 value in the track colour, the app uses a 总音量 label and white value; (5) the board shows the loop range under the timecode when a loop is set, not verified here because no loop was active.
- Found while reopening: a separation the user had cancelled (no partial results) resurfaced its “分离已取消 · 源音轨已保留” lane notice on every reopen because `recoverSeparationTask` rebuilt it from `lastSeparation`. Changed the shared mapper to skip cancelled records with `completed === 0`; failed tasks and partial cancels still resurface with their remainder. Regression added in `tests/progressive-separation.test.ts`. Rebuilt and confirmed natively: after quit/relaunch the project opens with no cancel notice while the source clip and 音轨 / 05 remain; the on-disk record stays `cancelled`. Full suite 94 passed / 3 conditional skipped.
- Both source fixes from this round (IPC prefix stripping, cancelled-notice suppression) are later than the 18799ce signed package and CI.

### 2026-09-20 · Board 30 deviation decisions implemented

Decisions (Pen first, then code), all on board 30 `ymoeh`; the Pen file was saved with the app's native Save and `design/workspace-revision/ymoeh.png` re-exported:

| Deviation | Decision | Pen change | App change |
| --- | --- | --- | --- |
| Toolbar zoom: text hint vs − 1× ＋ buttons | Keep the button group: it is an operable, keyboard-discoverable control; hint text is tutorial copy the project keeps off the resident UI | Replaced “滚轮 / 捏合缩放” with a − / 1× / ＋ button group at the toolbar's right end | none |
| Footer hint row and “示例波形” annotation | Drop from the screen mock; the README already carries the interaction notes | Deleted both text nodes | none |
| Header export label 导出音轨 vs 导出 | Keep 导出 (the dialog names the target) | Label → 导出, button width 82 | none |
| Master volume: label vs speaker icon + inline level | Follow the board | none (board already had it) | Speaker icon replaces the 总音量 text; value sits inline right of a 100 px rail; aria label unchanged |
| 起始位置 value colour | Use the selected clip's track colour (board's fixed teal was arbitrary; the clip title already uses the track colour) | Value recoloured to the selected clip's purple | `dd` styled with `track.color` |
| Loop range under the timecode | Follow the board | none | `循环 hh:mm — hh:mm` small line under the clock while a loop is set |
| Home “6 tracks” vs workspace “Tracks / 05” | Count only tracks the workspace lists | — | `visibleTrackCount` in shared timeline used by Home and All projects |

- Fresh `Insert` of text nodes into board 30 reported a +50 px y offset and rendered off-position; copying the existing Split label with new content positioned correctly, so labels were created by `Copy`. Recorded here so the next Pen session does not re-debug it.
- Verification on the rebuilt `out/` in Chinese with the isolated profile: 1440×900 and 1280×800 screenshots show the speaker icon + inline `-30.0 dB`, 起始位置 in the clip colour, the loop line `循环 00:00.000 — 00:10.000` with the loop region shaded, and Home listing `5 音轨`. No horizontal overflow at either size (footer 1264 px wide at 1280; transport right edge 810 px, master starts at 1062 px). Tests 95 passed / 3 conditional skipped (36 files); production build passed. Not yet in a signed package or CI.

### 2026-09-20 · Boards 03 / 04 / 08 / 13 / 02 compared and aligned

Method as before: Chinese isolated-profile window driven through CDP, screenshots against the board PNGs; Pen edited first, then code. Pen saved natively; PNGs re-exported to `design/exports/03-import.png`, `04-separation-setup.png`, `02-workbench-en-compact.png`, `design/workspace-revision/u1mPk.png`, `design/history-clips/b1tMnW.png`, `design/clip-export/S5oPw.png`.

| Board | Deviation | Decision | Where |
| --- | --- | --- | --- |
| 03 Home | Intro copy under the headline missing | Follow board | App: two-line intro |
| 03 | Three-step footer (01 导入音频 · 02 选择声部 · 03 试听并导出 · 支持格式) missing | Follow board (empty-state orientation, not a tutorial) | App: `home-steps` row; vertical spacing tightened so it fits at 1440×900 without inner scroll |
| 03 | “查看全部项目” lacked the arrow | Follow board | App: arrow icon |
| 03 | Header icon order ? / models / settings vs models / settings / ? | Follow boards 03 and 30 | App: reordered |
| 03 | Board said “5 个声部”, had no search field, boxed header icons | App is right (count is tracks; search exists; plain icons) | Pen: “音轨”, search field added, icons plain, rows shifted |
| 04 Stems | Title/subtitle “你想听见哪些声部？ / 选择目标声部；开始后在工作区查看进度。” | Follow board | App |
| 04 | Source row: icon + “分离来源：…” + duration · 44.1 kHz · Stereo | Follow board | App |
| 04 | Search placeholder and icon | Follow board | App |
| 04 | Selected category style: filled primary vs tinted | Follow board (tinted #253954 / #8FC0FF) | App CSS |
| 04 | Summary lacked 处理设备 line and download note | Follow board; device read from settings when the dialog opens | App |
| 04 | Board had “更换文件”, “清空选择”, footer hint, “选择声部 · 弹窗” eyebrow, old preset/category names | App is right | Pen: removed / renamed to 乐队 · 主唱与和声 · 鼓组细分 and the seven catalog categories |
| 08 Export | Dialog matches; background used stale board-30 texts | — | Pen: 导出 label, stale hints removed |
| 13 History | Title “历史工作记录” vs “全部项目”; app lacked subtitle and 新建项目 primary; back arrow instead | Keep 全部项目 (matches entry link), add subtitle, replace arrow with 新建项目 primary at the right | App + Pen title |
| 13 | “共 N 条记录”, “分离结果 · N 个剪辑” wording | Follow board | App |
| 13 | Board lacked 全部结果 filter and used a different search placeholder | App is right | Pen |
| 02 English compact | Board predates clip details / split / metronome lane; app follows board 30 at 1280×800 with no overflow | Board 02 kept only as a size reference; not restructured | Pen: stale caption removed |

- Pen note: siblings on boards 04/13 are direct children of the board frame, not of the dialog panel frame; copies must be placed in the same parent or they render offset. Recorded so the “+50 px” confusion from board 30 is understood as parent mismatch, not a renderer bug.
- Native checks after rebuild (Chinese, isolated profile): Home 1440×900 shows intro, steps row, arrow link, `5 音轨`; stem chooser shows the new title, source row `分离来源：权限恢复验证 / 00:00.750 · 44.1 kHz · Stereo`, tinted 全部 category, `处理设备 CPU`; All projects shows subtitle, 已删除 + 新建项目, `共 1 条记录`, `分离结果 · 4 个剪辑`; export dialog unchanged. English 1280×800 workspace has no horizontal overflow. Tests 95 passed / 3 conditional skipped; typecheck clean. Not yet in a signed package or CI.

### 2026-09-20 · Boards 05 / 07 / 09 / 10 / 14 / 15 / 16 compared and aligned

Same method (Chinese isolated-profile window over CDP; the model-download and download-failure states through the `preview.html?separationDownloadPreview=1` fixture in the built-in browser at 1440×900). Pen edited first where the board was stale, saved natively, PNGs re-exported to `design/exports/07-model-library.png`, `09-preferences.png`, `14-history-states.png`.

| Board | Deviation | Decision | Where |
| --- | --- | --- | --- |
| 07 Model library | Alphabetical list vs cached first; 下载 secondary vs primary; “大小” vs “权重大小”; footer note missing | Follow board | App: cached models sort first, primary 下载, 权重大小 header, footer note “每个模型附带约 1.6 kB 配置文件…” |
| 07 | Board said 返回工作台 and carried a stale “BPM / 调性分析工具” pill | App is right (entry may be Home) | Pen: 返回, pill removed |
| 09 Settings | Subtitle hidden; rows lacked descriptions; device option “自动（CUDA / CPU）” | Follow board | App: visible subtitle, per-row descriptions, “自动选择” |
| 09 | Board footnote listing option values | Annotation | Pen: removed |
| 15 / 16 Stem search | No results heading, no clear button, no retained-selection note, generic empty copy | Follow board | App: “‘…’ 的搜索结果 · N 个声部”, × clear button, “已选 N 个声部，其中 M 个不在当前搜索结果中。” / “已选的 N 个声部仍保留，可以继续分离。”, tip line, “没有找到‘…’相关声部” |
| 14 History states | Delete dialog wording and neutral button; plain empty texts | Follow board with project wording | App: icon + “删除这个项目？”, name, two-line body, checkbox with sub-note, red 删除项目; empty search card with 清空搜索; first-run empty state with icon and 新建项目 |
| 14 | Board used 记录 / 新建分离 wording | App wording | Pen: 项目 / 新建项目, “共 1 条记录” |
| 05 Model download | Title “下载模型”, no model count line, heading was the stem name only, cached targets not listed | Follow board | App: “只下载这次需要的模型”, “N 个模型 · 共 X MB”, “下载{声部}模型”, cached-targets row “已缓存 · 无需重复下载” |
| 10 Recovery cards | Notices had guidance text only; download failure actions were 返回工作区 / 重试 | Follow board anatomy | App: every `ErrorNotice` now shows an icon + state title (下载中断 / 磁盘空间不足 / 无法写入文件夹 / 模型校验失败 / 内存不足 / 处理设备不可用 / 分离被中断 / 已取消 / 导出失败…) above the guidance; download failure offers 取消任务 + 重试下载; “download interrupted” now maps to the network guidance |

- Verified: Model library shows 贝斯/鼓组 first with 删除缓存, primary 下载 elsewhere, footer note and pagination on one row. Settings shows subtitle and four descriptions without inner scroll (834 px). Stem chooser: “‘吉他’ 的搜索结果 · 4 个声部”, note “已选 2 个声部，其中 1 个不在当前搜索结果中。”, chips retained; “theremin” shows the empty copy and “已选的 2 个声部仍保留…”. History: empty-search card and delete dialog as designed. Preview fixture: download dialog shows “2 个模型 · 共 155.2 MB”, “下载电吉他模型 10 %”, queue statuses, source aside; after the fixture failure the notice reads “下载中断 / 模型下载中断或网络不可用…” with 取消任务 / 重试下载.
- Tests 96 passed / 3 conditional skipped (36 files); typecheck clean; production build passed. Boards 02 (size reference) and 11 (interaction spec sheet) were not restructured. All of this is later than the 18799ce signed package and CI.

### 2026-09-20 · 049a3d8 signed package, three-platform CI and signed spot checks

- Pushed `049a3d8876a57a7fd42fac5ea4c1224d48299fa4` (all board-alignment work, IPC-prefix stripping and cancelled-notice fix) and dispatched https://github.com/Means88/printemps/actions/runs/35501611789 . All three jobs succeeded (tests, installer build, packaged real analysis, upload). Artifacts, 7-day retention, archive digests:

| Platform | Artifact ID | Archive bytes | Archive SHA256 |
| --- | --- | --- | --- |
| macOS ARM64 | 10602083580 | 765619167 | a2e8e9466eb1cbcf8acb4adc759a376e6d49c6e9c4aafb34f425a6e743f7b30f |
| Windows X64 | 10602801440 | 344748462 | 6ebbea8a80a23e19f37ad0279357172c5e2adffaba146de04511eba1bad25450 |
| Linux X64 | 10602403635 | 3045459894 | 2e2a501bbb887d7eae53e488fbce0e9b0dbf9fc33109f3f52a94bce18599d8fa |

- Local `pnpm package` on the same SHA replaced `release/mac-arm64/Printemps.app` (Developer ID, notarization skipped; `/tmp/printemps-049a3d8-package.log`). `codesign --verify --deep --strict` passed (`/tmp/printemps-049a3d8-signature.log`); packaged Beat This/Essentia integration passed (`/tmp/printemps-049a3d8-packaged-analysis.log`). `app.asar` SHA256 `2004d3f922567161422afd9b181a6ea7f8ae7c16c107dc6a2e785c7aa57d5cf6`.
- Signed clone `/private/tmp/Printemps-049a3d8-QA.app` with the isolated synthetic profile in Chinese: Home renders the intro and steps row with header order ? / 模型管理 / 设置; All projects shows the subtitle, 已删除 + 新建项目 and “共 1 条记录”; the stem chooser shows the new title, source row and presets; the workspace master reads `-30.0 dB` next to the speaker icon and 起始位置 uses the clip colour. Cmd+Q exited cleanly; profile language restored to English.
- Native regressions that passed on 18799ce (import rollback, forced-exit recovery, trim, export, EACCES restart, cancel) were not rerun on this package; only the changed screens were spot-checked.

### 2026-09-20 · Workspace feedback fixes: hover inset, timecode jitter, drag scrubbing, seek while separating, sidebar animation, progress lane

User feedback on the 049a3d8 build, fixed in source (later than that package/CI) and verified on the rebuilt `out/` with the isolated Chinese profile:

- **Recent-project hover** had no horizontal inset (generic `button:hover` on a `padding: 22px 0` row). Rows now have 14 px horizontal padding, a 12 px radius, a softer hover colour and a divider drawn inside the padding; the row's left/right edges (1006–1340 px) coincide with the search field's. A first attempt that bled the highlight 16 px beyond the search field was rejected by the user for misalignment and reverted.
- **Transport width jitter during playback**: Inter's proportional digits changed the timecode width every frame and shifted the centred transport. Timecodes, durations, the loop line, dB values, ruler labels and clip-detail timecodes now use `tabular-nums`; the clock has a 9.5ch minimum width. Probe widths for four different timecodes are identical (74.66 px) and the transport's left edge stayed at 416.02 px across eight samples while playing.
- **Playhead follows press-and-drag**: new `scrubTimeline` helper (`src/renderer/scrub.ts`) seeks on pointer down and keeps seeking on pointer move with pointer capture, coalesced to one seek per frame; used by the clip lanes (pressing a clip also selects it) and by the ruler. CDP mouse drag across a lane moved the clock 2.000 → 3.000 → 4.000 → 5.000 → 6.000 and released at 6.000; a ruler drag from 90 % to 10 % landed at 1.000.
- **Seeking while a separation runs** was blocked because the lane's edit-disabled flag also gated seeking. Seeking/scrubbing now always works; only clip selection and edits stay disabled. Verified with a running cached bass separation: press → 3.000, drag → 8.000; the task was then cancelled and the worker exited.
- **Separation progress lane** is more compact: 60 px tall (was 108 px), 12–13 px type, 4 px progress bar, 16 px spinner, compact Cancel.
- **Clip-details sidebar** collapse/expand now animates: `grid-template-columns` transitions over 240 ms and the panel content fades. Sampled column widths 280 → 236 → 149 → 59 → 28 → 5 → 0 px on collapse and 0 → 91 → 169 → 239 → 263 → 279 → 280 px on expand.
- Tests 96 passed / 3 conditional skipped; typecheck clean; production build passed.

### 2026-09-20 · Progress lane pinned, Space over the metronome switch, handle stacking

- **Separation progress lane** lived inside the zoomed/scrolling timeline content, so it stretched with zoom and slid with horizontal scroll. The track area is now an inline-size container and the lane is `position: sticky; left: 8px; width: calc(100cqw - 16px)`. During a real cached-bass separation the lane stayed at left 8 px / width 1144 px while the content grew from 1160 to 2610 px and the area scrolled 400 px.
- **Space with the metronome switch focused** toggled nothing useful: the shortcut guard excluded `[role="switch"]`, and the switch kept focus after a click. The guard no longer excludes switches (inputs, sliders and menus still are), and the toolbar switch blurs itself after a click. With the switch focused, Space started playback without changing the switch, a second Space paused, and a click left the switch unfocused.
- **Clip trim handles** (z-index 2) painted above the sticky track headers (z-index 2) when lanes scrolled under them. Track heads are now z-index 3 and the sticky ruler 4; handles stay at 2.
- 96 tests passed / 3 conditional skipped; typecheck clean; production build passed. A local `pnpm package` follows; the CI run for 95c1934 was cancelled at the user's request.

### 2026-09-20 · Second feedback round: exports, header, settings device, history, typography

Implemented from user feedback on the local 9da5785 build and verified on the rebuilt `out/` with the isolated Chinese profile (Pen edited alongside; PNGs re-exported):

- **Header tools are stable across pages**: 模型管理 / 设置 sit at a fixed right offset in the title bar on every page (measured left 1314 / 1352 px on Home, Settings, Model library and the workspace); the workspace adds ? before them and the sidebar toggle after them, other pages reserve the toggle slot. The logo is a Home button. Board 03 dropped ?, board 30 moved its four icons into the title bar left of the window controls.
- **Model library** back is a top-left arrow sized like the workspace one (41×30) and no longer auto-focuses (the focus ring the user saw). All projects / Deleted projects regained a top-left Home arrow (board 13 updated).
- **Processing device**: a new `worker/device_probe.py` + `device:probe` IPC report CUDA/MPS availability and what 自动选择 resolves to; Settings shows “自动选择（当前将使用 CPU）” and “本机可用：CPU · Apple MPS（实验性，需手动选择）”; the stem chooser summary shows “处理设备 自动选择 · CPU”. The idle “检查新版本” caption under 应用更新 was removed.
- **macOS traffic lights**: `setWindowButtonVisibility(true)` is re-asserted on window blur/focus as a workaround for them disappearing while the window is inactive. Not verifiable through the page capture; needs a visual check on the next package.
- **Export**: every export offers 对齐 = 剪辑范围 or 项目时间轴; timeline alignment prepends `adelay` silence equal to the clip offset (`exportFilter`, real-ffmpeg test: 0.5 s clip at offset 0.5 → 1.0 s file starting with silence). The header 导出 now opens 导出音轨 (new board 32): a checklist of visible result tracks (original excluded), format, alignment, “导出 N 条音轨”. Board 08 gained the alignment row.
- **Buttons rule** recorded in `design/README.md`: actions right-aligned, one primary at the far right. Board 10's six cards were re-laid-out accordingly; the lane notice is now 关闭 / 重试(primary) and the download failure dialog 取消任务 / 重试下载.
- **Typography** scaled to DAW proportions: home headline 30 px, page titles 22 px, dialog titles 20 px, clip title 18 px, summary count 22 px, transport clock 20 px.
- **Search fields** match their neighbours: history search 34 px like the selects (icon vertically centred), model library search 38 px like the filter group.
- Tests 97 passed / 3 conditional skipped (including the new alignment test); typecheck clean; production build passed.

### 2026-09-20 · Design system enforced: tokens, docs/DESIGN.md, design lint, Tailwind + @shadcn/lint

- Adopted the user's reference specs (ryougi `AGENTS.md` / `DESIGN.md`) for this plain-CSS Electron renderer. New `docs/DESIGN.md` (containers/edges, two depth levels, one accent, three type steps, spacing scale, colour meaning, radii table, motion, reuse, do/don't, review method) and a “设计系统与规范” section in `AGENTS.md`.
- New `src/renderer/tokens.css` is the only place literals live: 34 colour tokens (ground/surfaces, edges, text, accent, status, solo/mute, `--stem-other`), type steps 11–30 px, radii 3/8/10/12/16/pill, spacing 4–40, motion `--dur-fast/base/slow` + `--ease-settle` (zeroed under reduced motion).
- `style.css` was rewritten mechanically against the tokens: 289 hex uses (121 distinct) → `var(--token)` or `color-mix(in srgb, var(--token) N%, transparent)` by nearest OKLab match (22 mappings moved more than 0.06, notably the music-controls purple → `--accent-text`, secondary text `#cbd5e3` → `--text`, task-lane border → `--accent`); 69 off-scale font-size/radius/spacing values snapped to the scales; 15 motion literals → duration tokens / `--ease-settle`; two TSX inline `#4dd6ba` → `var(--stem-other)`; the SVG stroke in the download source aside → `currentColor`.
- `scripts/design-lint.mjs` (`pnpm lint:design`) reports no-raw-colors, no-arbitrary-values, no-raw-motion, no-inline-styles for `style.css` and TSX; baseline went 375 → 0 and the script exits non-zero on any finding.
- Tailwind v4 (`@tailwindcss/vite`, theme + utilities only, no preflight) is wired to the tokens through `src/renderer/tailwind.css` `@theme inline`; `@shadcn/lint` runs via oxlint (`.oxlintrc.json`: no-raw-colors, no-arbitrary-values, no-restyle allow layout, require-static-classes; no-unknown-classes is off because semantic class names live in `style.css`; default correctness categories off so `pnpm lint` stays a design gate). `pnpm lint` = `oxlint && node scripts/design-lint.mjs`, currently clean.
- Verified: tests 97 passed / 3 conditional skipped; typecheck clean; production build passes with Tailwind; Home and workspace screenshots on the rebuilt `out/` show no visual regression apart from the intended accent recolouring of the music parameter text. `pnpm install` re-linking dropped the executable bit on `node_modules/.bin` targets once; restored with `chmod +x`.

### 2026-09-20 · Type steps, one back control, board 10 buttons, icon template

- Body/label text is now one step (13 px; 23 rules moved from 14) and captions one step (12 px; 6 rules moved from 11). Rendered audit per page: Home 12/13/18/30, All projects 12/13/18/22, Model library 12/13/18/22, workspace 12/13/16/20, Settings 12/13/16/22 — no page has more than the documented steps. `docs/DESIGN.md` §3 now states the actual scheme.
- One `.back-button` (41×30, raised, md radius, 15 px arrow) is used by the workspace project bar, All projects / Deleted projects and the Model library; measured 41×30 on all three. Boards 07 and 13 show the same control; board 07's 返回 text button is gone.
- Board 10's action buttons hug their labels (secondary + primary, right-aligned) instead of 180/192 px slabs; all 49 off-scale text sizes across boards 03–16, 29–32 were snapped to the type scale (34→30, 27/28→22, 24→20, 25→18, 23→22, 21→20, 19→18, 17→16, 15→14). PNGs re-exported for every touched board.
- App icon rebuilt on Apple's 1024 template: the artwork is an 824 px squircle with transparent margins. On macOS 26 the light rim the user saw is the system's Liquid Glass treatment of legacy icons; with the inset shape the mask now matches the artwork. The definitive fix is an Icon Composer `.icon` bundle, which needs Xcode and is recorded as follow-up.
- Tests 97 passed / 3 conditional skipped; `pnpm lint` clean; production build passed.

### 2026-09-20 · Inactive traffic lights legibility

- On macOS 26 the inactive window buttons render as dark glass dots and disappeared against the `--bg-titlebar` ground. `setWindowButtonVisibility(true)` on blur/focus makes them appear; a soft radial glow (`--raised-hover` → `--panel` → transparent, 160×66 px behind the buttons, drag region preserved) now gives them contrast without a hard-edged patch. Native button rendering is not visible in CDP page captures and `screencapture` is not permitted for this session, so the final check is the user's.

### 2026-09-20 · MPS separation stall: root cause and fix

- Reproduced with the drums model on the 10 s synthetic asset, `device: mps`: zero chunks finished in 240 s while periodic `faulthandler` dumps sat inside the BS-Roformer transformer forward. Micro-benchmark of one forward pass (torch 2.11.0, M-series, 12.7 GB recommended MPS budget): 882 000-sample chunk (the config's 20 s inference chunk) did not finish within 150 s; 441 000 → 6.9 s using 5.76 GB; 220 500 → 2.6 s / 2.1 GB; CPU 882 000 → 17.5 s. The 20 s chunk's attention activations exceed unified memory on MPS and the process thrashes rather than failing.
- Fix in `worker/separate.py`: `select_chunk` caps MPS at the 10 s training chunk (`audio.chunk_size`, 441 000) and at 5 s when `torch.mps.recommended_max_memory()` is below 12 GB; `torch.mps.empty_cache()` after each stem. CUDA/CPU keep the 20 s inference chunk.
- Progress: forward hooks on the 24 transformer stages emit sub-progress inside each chunk (75 events for three chunks instead of 3), so a 17 s CPU chunk no longer looks frozen. Protocol events now write to `sys.__stdout__`, because the model's chatter redirect to stderr had swallowed hook output.
- Results: the standalone worker on MPS finishes the file in 19.7 s versus 45.3 s on CPU with matching output (corr 0.99, max abs diff 1e-5 on this near-silent drums residual). In the app with `device: mps`, a real cached-bass separation completed in 25 s with progress 24 → 31 → 33 → 58 → 67 → 88 → 97 → 100 %, the task persisted as complete and the worker exited. Real-model integration test (CPU) still passes; 97 unit tests pass.
- Reference: the user pointed at pymss-studio, whose `pymss` core runs RoFormer models through an MLX backend (`mlx>=0.31.0`) and falls back to Torch MPS. An MLX backend remains an option if MPS speed is insufficient; not started.

### 2026-09-20 · Release page (printemps.dev), Pages and Release workflows

- Designed board 33 (`f2cQi`, 1440×1720) first: nav, hero with detected-OS primary download, features, three download cards, privacy, footer. Built as a dependency-free static site in `site/` reusing the token palette; `site/app.js` reads `releases/latest` from the GitHub API, maps `.dmg/.exe/.AppImage` assets to the cards, shows sizes and the tag/date, detects the visitor's OS for the primary button, and switches 中文/EN (persisted). When the API is unreachable or the repo is private it degrades to “前往 GitHub Releases” links.
- Local check in the built-in browser: 1440 and 390 px widths without horizontal overflow; nav collapses to 下载 + language toggle on phones; the 404 from the private repo shows the localized fallback; the EN toggle re-renders every string.
- Hero image: at the user’s request the hero now shows a capture of the running packaged app window (`screencapture -l <windowId>` after listing windows with a small Swift `CGWindowListCopyWindowInfo` helper; screen-recording permission is granted now). `site/assets/workspace.png` is 2940×1846 (1470×923 @2x) and the `img` carries matching width/height with `.shot img{width:100%;height:auto}`; the previous fixed `height` attribute had squashed it. Board 33 `BGiu9` now uses the same capture as an image fill (`design/brand/workspace-live.png`), the placeholder note is disabled. Cloudflare caches CSS/JS/images for 4 h, so `styles.css`, `app.js` and the hero image are referenced with `?v=__BUILD__`, replaced by the commit short SHA in `pages.yml`. Live checks after DNS moved to Cloudflare: `https://printemps.dev/` and `/privacy` return 200 through Cloudflare (`x-github-request-id` present), extensionless `/privacy` resolves, GitHub origin also answers directly on 185.199.108.153.
- English hero: a second capture of the same window after the user switched the app to English is `site/assets/workspace-en.png` (2940×1846). The `img` carries `data-zh`/`data-en` sources (both `?v=__BUILD__`-stamped) and `render()` swaps `src` and `alt` with the language toggle; verified locally in both directions at 1440 px.
- Guide copy rule (user feedback): do not state things the user need not do or internal implementation facts (bundled Python runtime, focus handling, update source). Removed those three sentences in zh and en; board 35 section 7 text updated.
- Site copy after notarization (user approved): three places claimed the build was not notarized and told users to allow it under Privacy & Security. Updated in zh and en — the macOS download-card note now just says to drag the app into Applications, the guide's install step states the build is signed and notarized so it opens on a double-click, and the obsolete troubleshooting entry was deleted rather than reworded (the failure it described no longer occurs). Boards 33 (`r7sOzh`) and 35 (`lunfr`, `L2herE`) updated first, board 35 re-laid out and both re-exported; Pen saved natively. Verified in the browser: card notes correct for all three platforms, install bullet updated, troubleshooting list down to five entries, and no remaining mention of “未公证” / “not notarized” / Privacy & Security anywhere in `site/`.
- Windows separation crash `Invalid \escape: line 1 column 24 (char 23)` (user report from a Chinese Windows machine, 2026-09-21): reproduced exactly, character for character. Node writes the worker request as UTF-8 with raw non-ASCII characters, but Python 3.14 still decodes stdio with the locale code page on Windows (PEP 686 only makes UTF-8 mode the default in 3.15). Under GBK, an odd run of non-ASCII bytes consumes the following `0x5C` as a DBCS trail byte, so an escaped path separator loses one backslash and the JSON becomes invalid — one CJK character anywhere in the project path is enough. Verified locally: a path containing 张 encoded as UTF-8 and decoded as GBK raises exactly that message, while 用户 (an even byte run) parses fine, which is why it looks intermittent. Fix: `runJsonWorker` now sets `PYTHONIOENCODING=utf-8`, extracted into an exported `workerEnvironment()`. Proved end to end with the bundled runtime under a forced GBK locale — stdin encoding goes from `gbk` to `utf-8` and a Chinese path round-trips intact. `tests/worker-environment.test.ts` asserts the variable is set, that PYTHONHOME/PYTHONPATH stay stripped, and pins the exact failing request shape. This affected every Python worker (separation, analysis, device probe), not just separation.
- Resetting the custom interpreter (user question, 2026-09-21): the reset already existed — `settings:reset-python` clears the stored path, points the interpreter back at the bundled runtime and drops the cached device probe, refusing while a separation runs. Two inconsistencies were fixed while confirming it. The row hid its 恢复默认 button unless a custom path was set, while the sibling directory rows always render it disabled; it now matches them. The preview fixture returned `null` from `choosePythonInterpreter`, so the custom state was unreachable for layout review; it now returns a plausible path and the reset clears it. Verified the full round trip in the preview: default shows 内置运行时 with the reset disabled, choosing shows the path plus `torch 2.11.0 · 未检测到 CUDA` with reset enabled, and reset returns to the default state. Board 09 gained the 恢复默认 control (height 1334 → 1376) and both it and 检查更新 were corrected from primary to secondary styling, leaving 完成 as the single primary on the screen. **Known board/code gap left in place**: the two directory rows have had a 恢复默认 button in code for a long time that the board still does not depict.
- Model download source setting (user request, 2026-09-21): Settings gained a 模型下载源 row between 推理环境 and 网络代理 (board 09 `HZgto`, height 1187 → 1334) offering huggingface.co, hf-mirror.com or a custom host. `normalizeEndpoint` in `src/main/models.ts` accepts a bare host and normalises to `scheme://host[:port]`, rejecting paths, query strings and embedded credentials; `modelBaseUrl` keeps the repository and revision from `model-manifest.json`, so switching hosts cannot switch models and the existing checksum verification still applies. The main process rebuilds `ModelCache` when either the directory or the base URL changes, and refuses while a download or separation is running. UI note: the stored value cannot express “custom but not yet filled in”, so the row keeps the mode in local state — verified in the preview that picking 自定义 reveals the address field and picking hf-mirror.com saves and hides it again. New `tests/endpoint.test.ts` plus a settings round-trip; full suite 104 passed / 3 skipped, tsc, lint 0 and the production build all pass. Guide §12 and §14, the privacy policy’s network section, AGENTS.md and the board table were updated to match.
- CI release green end to end (run 35548906860 on `352342b`, 2026-09-21): all three platforms succeeded and the draft `v0.1.1` carries every artifact — DMG 359 MB, mac zip 369 MB, **AppImage 495 MB**, Windows exe 328 MB, plus blockmaps and the three `latest*.yml`. The Linux upload that previously died on `size must be less than 2147483648` now goes through. The macOS job logged `notarization successful` and Apple's submission history shows the matching Accepted entry at 00:53:18Z, so notarization works from CI on the CPU-only runtime. Windows passed on the direct-URL `+cpu` wheel, which was its first verification from that source. The release is still a draft and has not been published.
- CPU-only pinning, second attempt (2026-09-21): the first attempt (`--extra-index-url` + `--index-strategy unsafe-best-match`) fixed Linux but broke macOS — the PyTorch CPU index and PyPI ship *different* macOS arm64 wheels for the same `torch==2.11.0` (verified: the index wheel hashes `072a0d6e…` and that hash is absent from the lock), so the lock recorded PyPI hashes while the install resolved the PyTorch one and `--require-hashes` failed. Replaced with direct wheel URLs for Linux x86_64/aarch64 and Windows x64; macOS keeps resolving from PyPI unchanged, and `scripts/prepare-runtime.mjs` went back to its original install command. Residual CUDA entries in the lock are gated to Linux on architectures that are neither aarch64 nor x86_64, so none of the three build targets can install them. CI run 35548334596 had also failed Windows at `pnpm test`: the new interpreter test asserted a non-executable file is rejected, but Windows grants X_OK to every readable file — both `SettingsService.setPythonPath` and the test now skip that check on win32. Verified: macOS runtime rebuilt 538 MB with torch 2.11.0 and MPS; Linux container run (node:24-bookworm, the repo's own verify script) passed tests, packaged analysis twice, and produced a **495 MB AppImage** (519,543,112 bytes, down from 3,045,394,056) with no nvidia/triton packages installed; 102 unit tests, tsc and lint clean. The superseded CI run was cancelled rather than left to burn macOS minutes.
- CPU-only runtime + user-supplied interpreter (2026-09-21, user decision after the CI release failed): the Linux AppImage was 3.05 GB because the default PyPI `torch` for Linux pulls the whole NVIDIA CUDA stack, which exceeds GitHub's 2 GiB release-asset limit. `worker/requirements.txt` now pins `torch==2.11.0+cpu` / `torchaudio==2.11.0+cpu` off the PyTorch CPU index for non-macOS platforms; the regenerated hash-pinned lock drops 19 packages (cuda-bindings, cuda-pathfinder, cuda-toolkit, 15 nvidia-*, triton) and goes from 41 to 24. Verified on macOS: runtime rebuilt to 538 MB, torch 2.11.0 with MPS available, 102 unit tests and the real packaged-analysis integration test pass. uv normalised the markers to `sys_platform != 'darwin'`, so Windows now takes the explicit `+cpu` wheel from the PyTorch index rather than PyPI's default — functionally the same CPU build, but a different source, so Windows needs its own CI verification. The Linux AppImage size drop is expected but not yet measured.
- Inference environment setting: Settings gained a 推理环境 row (board 09 `i8Gk0`, board height 1040 → 1187) that points separation at a user-supplied Python interpreter for CUDA. Analysis deliberately stays on the bundled runtime because it carries the pinned beat model. `worker/device_probe.py` now also reports the torch version and any missing modules among numpy, soundfile, yaml, torch, einops, rotary_embedding_torch and beartype; `settings:choose-python` refuses an environment that is missing any of them and names them. `SeparationService` takes an interpreter getter so a change applies to the next run; the stored path is restored at startup and silently falls back to the bundled runtime if it no longer exists. `tests/settings.test.ts` covers absolute-path, not-a-folder, non-executable and reset cases. Full suite 102 passed / 3 skipped, `tsc`, `pnpm lint` 0, production build all pass; the row was checked in the preview fixture between 处理设备 and 网络代理, matching the board. Not verified on real NVIDIA hardware — no such machine here.
- macOS notarization, first successful run (2026-09-21): credentials are an App Store Connect API key (key id `8FPLV43Y3V`), validated first with `xcrun notarytool history` before any build. `mac.notarize` needs no config — electron-builder 26 treats it as a *disable* switch and activates from the env vars, confirmed by reading `MacTargetHelper.notarizeIfProvided`. Local build `pnpm run dist --mac -c.directories.output=release-notarized` logged `notarization successful` on the first submission, so the bundled Python runtime never was the obstacle the old note predicted. Evidence on the produced artifacts: `spctl -a -vv -t install` on the app gives `accepted / source=Notarized Developer ID`, `xcrun stapler validate` passes. The DMG is deliberately neither signed nor stapled (`dmg.sign` defaults false and electron-builder warns that signing it conflicts with notarization), so `stapler validate` and `spctl -t install` on the DMG fail by design; the end-user path was verified instead by writing a browser-style `com.apple.quarantine` attribute onto the DMG, mounting it, and checking the app inside — still `accepted / source=Notarized Developer ID` with a valid ticket. CI: `release.yml` stages `APPLE_API_KEY_P8` into `RUNNER_TEMP`, passes the path, and deletes it unconditionally; a key written with `printf '%s'` (no trailing newline, matching this `.p8`) was confirmed to authenticate against Apple. All five secrets (`CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_API_KEY_P8`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`) are set on the repository; a CI notarization run has not been exercised yet.
- Download-card copy (user feedback): the Linux note said the Python runtime is bundled, which is an implementation detail the reader cannot act on — the same rule already recorded in `docs/DESIGN.md` after the guide cleanup. Trimmed to “chmod +x 后直接运行。” / “chmod +x and run.” in both languages and on board 33 (`WelCa`). The macOS and Windows notes stay: both tell the user something they must do on first launch. No other mention of Python remains anywhere in `site/`.
- Supported-stem list on the guide (user request): §4 gained an `<h3>` subsection listing all 53 target stems grouped by the app's six families (人声 / 吉他与拨弦 / 键盘与合成器 / 鼓与打击乐 / 弦乐 / 管乐), zh and en. The tables are generated from the real catalog — `src/shared/stems.ts` evaluated through esbuild plus `src/shared/model-manifest.json` — and the generator asserts the id set per family matches the catalog exactly and totals 53, so a catalog change breaks the build script rather than silently drifting. Framed as “当前模型支持” rather than a product promise, per the earlier decision not to hard-bind the site copy to one model. A new subsection avoids renumbering §5–§14 and their anchors. `.legal td:first-child` keeps the family column on one line. Verified in the browser: 3 tables per language (stems 6 rows, shortcuts 11, menu 5), no parser errors, no horizontal overflow at 1440, 1280 or 375 px. Board 35 `VeLMf` mirrors the list in its §4 paragraph, height 2069 → 2269, saved natively and read back to confirm.
- Whole-page control scale (user feedback: 检查更新/完成 buttons and the metronome row still large): root font is the browser’s 16px, so every button without an explicit size inherited 16px/42px. Global `button` now sets 13px, `padding:6px 14px`, `min-height:34px` (matching the 34px transport/dialog buttons); `.switch` is exempted (`min-height:0`); rhythm dialog metronome row label 14px with the 36×20 switch used on the timeline. Preview measurements: settings 完成 120×34, 检查更新 82×34, 恢复默认 80×34; dialog switch 36×20; home unchanged. Board 09 gained the 应用更新 row with a 34px 检查更新 button (height 1040); board 25 switch 36×20.
- Pen tidy-up had to be redone: the first pass was lost when `git checkout main` rewrote the .pen in the working tree and Pen reloaded from disk (file size proves it: 2,225,884 → 2,225,890 for the board-12-only save vs 1,951,974 after the redo). New ids pV6c6/HjUpo/PB14C/Y5roB/UJXIc; verified after saving by re-listing top-level nodes (34 boards + 5 section labels = 39). Merge rule changed to `git push origin <feature>:main` (AGENTS.md).
- Board 12 (English recovery cards) now mirrors board 10’s button rule — right-aligned, primary on the right (primary 160 px, secondary 150 px, 10 px gap) — after the user noticed it had not followed the Chinese board. The app already renders both languages with the shared right-aligned `.dialog-actions` rule, so no code change. Design index: stale 01/19/23 buttons removed and the default artboard now opens board 30.
- Pen tidy-up (user request): inventory of 43 top-level nodes vs 27 registered; deleted the empty frame, 08 archive, 01 (old workbench chrome), 19 (early analysis-page concept) and 23 (intermediate revision); rebuilt 06/20/21/24/25 as copies of board 30 with their distinguishing content re-added (progress lane, bar ruler, single track, track-manager dialog, rhythm dialog with 36px fields) so every workspace board shares the current header/toolbar/inspector/transport; 22B header aligned to board 13. New ids pV6c6/HjUpo/PB14C/Y5roB/UJXIc; 22B and 24–31 registered; stale exports, static screen HTML and duplicate PNG folders removed; index.html buttons repointed and verified to resolve. Pen saved natively (mtime advanced). Layout check reports only the pre-existing clipped time-grid lines inside lanes.
- Package 05ea070 in `release-05ea070/`: signed and verified; `out/main/index.js` inside app.asar is byte-identical to the local build of this commit.
- Analysis result handling (user feedback on 05. Prism Light): the worker had succeeded (466 beats, 125 BPM, G major) but the header still showed “—” because analysis only stored a recommendation. Now `AnalysisService.execute` writes the recommendation into `project.music` immediately, replacing manual values; fields whose analysis failed keep their current value; Reset still restores the recommendation. `tests/analysis-service.test.ts` covers apply, partial failure (bpm 99 kept while key updates) and override of manual values. Pen: board 19 note on the README; design README 246 updated.
- Control sizes (user feedback): board 09 fields 44→36 with a 14px chevron inset, board 19 editor fields 38→36; CSS: `select` gets a custom 12px chevron at `right 14px` (`appearance:none`, `padding-right:32px`), settings fields and the rhythm dialog fields 36px / 13px, dialog padding and gaps tightened, compact selects keep the chevron with smaller insets. design-lint now also flags `%23` colours in data URIs unless the preceding line is marked `design-lint: icon-artwork`.
- Package b17e7bb: `pnpm run dist --mac -c.directories.output=release-b17e7bb` → signed .app, DMG, zip, blockmaps, latest-mac.yml; `codesign --verify --deep --strict` valid, `spctl` “Unnotarized Developer ID”; `app.asar` `8ec1ff2a9c2a5f3c5f86f642de7f6bf8de978ca22a4914eab6f355aae7383693` contains the download session, fixed_servers mapping and the 407 message. Booted the packaged app with `--user-data-dir` (fresh) and `--remote-debugging-port=9336`: Settings shows 网络代理, switching to 自定义 reveals the address field, entering `socks5://127.0.0.1:1080` persisted `proxyMode:"manual"` in the profile’s settings.json through the real IPC; QA instance quit and profile removed. First attempt with the default output dir failed (ENOTEMPTY while electron-builder emptied `release/mac-arm64`) and removed the previous bundle.
- Network proxy for model downloads (user request): Pen first — board 09 `WbwXU` gained a 网络代理 row (select 自定义 + address field, board height 1000) between 处理设备 and 模型缓存目录, subtitle updated. Code: `settingsSchema` `proxyMode`/`proxyUrl`; `src/main/proxy.ts` (`normalizeProxyUrl`, `proxyConfig`, `proxyCredentials`); `src/main/download-fetch.ts` wraps Electron `net.request` on a dedicated `printemps-downloads` session so `session.setProxy` applies only to model downloads and proxy `login` challenges are answered from the address; `ModelCache` receives that fetcher; `settings:save` re-applies the proxy. Renderer `ProxyRow` in `preferences.tsx` (跟随系统 / 不使用代理 / 自定义 + address input saved on blur/Enter, Esc reverts). Tests: 3 new files/cases — normalisation and config mapping, fetcher login/407/abort behaviour (abort during a stalled body rejects with AbortError and aborts the request), settings normalisation round-trip; full suite 102 passed / 3 conditional skips; `tsc`, `pnpm lint` (0), `pnpm run build` pass. Preview fixture at 5174 shows the row in zh/en with the custom state. End-to-end in the real Electron runtime (esbuild-bundled scratch entry run with `node_modules/.bin/electron`, local HTTP proxy + local origin): manual → proxy saw `GET http://…/manual`; direct → proxy untouched; address with `user:p%40ss` → first request 407, `login` answered, retry carried `Proxy-Authorization: Basic dXNlcjpwQHNz`, 200; no credentials → status 407 surfaced (ModelCache now reports “Proxy authentication failed (407)”). Chromium bypasses loopback by default, so the test session set `proxyBypassRules:'<-loopback>'`; real downloads target huggingface.co. Not run against third-party proxy software.
- User guide: `site/guide.html` (board 35 `VeLMf`, 1440×2069, copied from board 34 and re-laid out) — 14 numbered sections in zh and en (install incl. the un-notarized macOS first launch, home/import, workspace tour, stems & separation incl. secondary separation and interrupted tasks, audition, clip editing, rhythm & key, track list, export incl. alignment, project management, model library, settings incl. device options, keyboard shortcuts as two tables built from `shortcutRows` and the native-menu accelerators, troubleshooting) with an in-page table of contents. Facts were taken from `src/renderer/shortcuts.tsx`, `src/main/native-menu.ts`, `src/main/import.ts`, `src/main/export.ts`, `src/main/settings.ts` and the renderer strings. Nav on index/privacy/guide gained 使用说明/Guide, the hero gained a 使用说明 button, footers link it; boards 33/34/35 nav updated (功能 · 下载 · 使用说明 · 隐私). Verified locally: 14 `h2` per language, both shortcut tables render, language toggle works, no horizontal overflow at 1440 and 375 px (tables and code block fit 343 px).
- Privacy page: `site/privacy.html` (board 34 `VE9BB`, 1440×2295) rewritten to Apple’s App Privacy structure — 13 numbered sections (overview with the “Data Not Collected” classification, data types by Apple category, on-device data, purposes, network access and third parties Hugging Face/GitHub, retention and deletion, system permissions, tracking, children, user rights, website, changes, contact with effective date 2026-09-20), zh + en articles toggled by the shared `printemps-lang` preference. Verified at http://127.0.0.1:8087/privacy.html: 13 `h2` per language, toggle switches to EN, no horizontal overflow at 1024 px, three `code` path spans render per language. Home page: nav GitHub text → icon link, privacy summary links to `privacy.html`, footer 隐私政策 → `privacy.html`. Board 34 sections were built by updating the existing 6 heading/paragraph pairs and `Copy`-ing them for sections 7–13 (fresh `Insert` renders off-position), then re-laid out from measured bounds; Pen saved natively (mtime advanced).
- `.github/workflows/pages.yml` deploys `site/` through GitHub Actions on pushes to `main` that touch `site/**`; `site/CNAME` = `printemps.dev`. `.github/workflows/release.yml` builds the three installers on `v*` tags (or dispatch with a tag), verifies the packaged analysis runtime, creates a draft release and attaches dmg/zip/exe/AppImage/blockmap/latest*.yml; macOS is ad-hoc signed on CI unless `CSC_LINK`/`CSC_KEY_PASSWORD` secrets exist, and notarization secrets are wired but unset.
- Documented in `docs/RELEASE.md`: version bump → tag → draft → replace the macOS asset with the locally signed DMG → publish; Pages source = GitHub Actions; DNS records for `printemps.dev` (A/AAAA to GitHub Pages, `www` CNAME to `means88.github.io`); the repository must be public (or on a paid plan) for Pages and anonymous downloads. Board 33 PNG at `design/exports/33-website.png`.
