# mesh flow

浏览器端 3D 模型格式转换 SDK，基于 AssimpJS 的 WASM 封装。提供统一的 API 与资源路径约定，在前端即可完成常见 3D 格式的互转。

## 功能特性
- 支持在浏览器中进行模型格式转换，无需后端服务
- 统一的 `/wasm/*` 资源路径，简化部署与预览
- 提供轻量 API：`createAssimp()`、`convert(input, target, options?)`
- 类型完备的 `TypeScript` 支持

## 支持格式
- 输入：`OBJ`、`FBX`、`USDZ`、`STL`、`GLB`、`3MF`、`PLY`、`VOX`、`GLTF`
- 输出：`GLB`、`OBJ`、`STL`、`PLY`、`USDZ`、`FBX`
- 规则：当目标为 `usd` 时，实际导出为 `usdz`

## 安装
```bash
pnpm add @sruim/mesh-flow
# 或者
npm i @sruim/mesh-flow
```

## 快速开始
```ts
import { createAssimp, convert } from '@sruim/mesh-flow';

await createAssimp();

const file = new File([], 'model.obj');
const res = await convert(file, 'glb', { name: 'model' });

const blob = new Blob([res]);
const url = URL.createObjectURL(blob);
```

## API
- `createAssimp(): Promise<Assimp>`
  - 预加载导入器与导出器模块，保证后续转换快速稳定
- `convert(input, target, options?): Promise<Uint8Array>`
  - `input` 支持：`string URL`、`File`、`Blob`、`ArrayBuffer`、`Uint8Array`、`{ name, data }`、`{ files: { name, data }[] }`
  - `target`：`glb | obj | stl | ply | usd | fbx`（其中 `usd` 会映射为 `usdz`）
  - `options`：`{ embedTextures?: boolean; binary?: boolean; name?: string }`

## WASM 资源部署
- 运行时会从站点根路径请求 `/wasm/*` 资源：
  - `assimpjs-all.js`
  - `assimpjs-all.wasm`
  - `assimpjs-exporter.js`
  - `assimpjs-exporter.wasm`
- 开发环境：将上述文件放入 `public/wasm/`（Vite 会以 `/wasm/*` 提供）
- 生产部署：确保最终站点根目录存在 `wasm/` 目录并包含以上文件

## 开发与脚本
- `pnpm dev` 启动示例与开发环境（默认端口 `8080`）
- `pnpm preview` 构建并预览产物
- `pnpm build` 使用 Rollup 构建库输出到 `dist`
- `pnpm lint` 代码检查
- `pnpm check:ts` TypeScript 类型检查

## 示例页面
- 访问 `http://localhost:8080/html/single.html`，拖拽或选择模型文件并选择导出格式

## 许可证
- MIT
