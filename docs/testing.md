# 测试与验证

README 只放项目介绍和基本开发流程，深入的验证手段放在这里。

## 基本检查

`pnpm test`（单元/集成）、`pnpm run build`（含 TypeScript 检查）、`pnpm lint`（oxlint + `@shadcn/lint` + `scripts/design-lint.mjs`，必须 0 findings）。

## 真实分析冒烟测试

准备好运行时后跑 `pnpm run test:integration`。夹具是合成音频，验证的是加载与调度，不是音乐准确度。Essentia 调性分析以本地 WASM 在 Node worker 中运行，不需要原生 Essentia Python 轮子。

把 `PRINTEMPS_TEST_RESOURCES` 指向解包应用的 `resources` 目录（macOS 为 `Printemps.app/Contents/Resources`），可用同一条命令验证真实打包资源。

## 默认跳过的重量级测试

真实渐进式分离需要显式提供本地权重目录：

```sh
PRINTEMPS_TEST_MODELS=/absolute/path/to/models pnpm exec vitest run tests/progressive-runtime.test.ts
```

它先校验缓存校验和，用受管 CPU 运行时检查中间可见性、对齐输出与残差重建；随后把 bass 剪辑裁到 0.25–0.75 秒做真实二次分离，验证 0.5 秒结果落在 offset 0.25、来源保留、混音设置继承，导出 WAV/FLAC，并确认修改导出文件不影响私有音频。它不是听感质量基准。`PRINTEMPS_TEST_RESOURCES` 同样可以让它指向打包后的 worker/运行时资源。

剪辑缓冲分配（六条十分钟立体声）：

```sh
PRINTEMPS_TEST_CLIP_MEMORY=1 pnpm exec vitest run tests/clip-memory.test.ts
```

约分配 1.5 GB PCM，默认跳过；它不验证真实音频设备，也不反映 Electron 的整体内存峰值。

## 界面夹具预览

`pnpm run preview:ui` 在 `http://127.0.0.1:5174/preview.html` 用真实渲染组件配隔离的内存示例项目，加 `?lang=en` 切英文。该入口不进生产构建。波形是示意的、播放静音，模型、导出与原生文件夹操作刻意不可用。它只能用于布局与焦点审查，**不能**作为 Electron IPC、持久化、音频输出或推理行为的证据。在 `?lang=en` 后加 `&saveFailure=once` 可模拟一次保存失败，用于检查重试保存流程；该开关只存在于隔离预览里。

## 三平台原生构建检查

`.github/workflows/native-build.yml` 在 Windows、macOS、Linux 上跑测试、准备原生 Python 运行时、构建安装包，并用各自暂存的打包资源执行真实节拍/调性分析。它由 pull request 或手动触发，不发布 Release；macOS 在此检查中使用 ad-hoc 签名。

本机等价流程：`pnpm install --frozen-lockfile`、`pnpm test`、`pnpm run runtime:prepare`、`pnpm run test:integration`、`pnpm run package`。若 uv 不在 `.venv` 里，用 `PRINTEMPS_UV` 指定。签名、公证、GUI/音频设备检查与版本间升级验证是独立的发布关卡，见 `RELEASE.md`。

**过去某次构建通过不代表当前代码通过**，当前状态以 `implementation-status.md` 为准。

## Linux 容器验证

Docker 运行中时，用隔离的 x64 Linux 容器（仓库只读挂载）：

```sh
docker run --name printemps-linux-verify --platform linux/amd64 --mount "type=bind,src=$PWD,dst=/source,readonly" node:24-bookworm bash /source/scripts/verify-linux-container.sh
```

脚本在容器内装依赖、跑测试、准备原生 Python 运行时、构建 AppImage，并用打包资源测试分析。它保留停止后的容器，便于用 `docker cp` 取出 `/work/release` 与日志；新一轮请换一个容器名。这不验证桌面显示、音频设备或 CUDA 硬件。
