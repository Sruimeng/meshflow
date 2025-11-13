**目标**

* 提供清晰、简洁的 SDK 接口，外部完全不感知 WASM

* 统一封装导入/导出流程，支持多输入类型与多格式转换

* 浏览器与打包环境下稳定加载 `/wasm/assimpjs-exporter.js`、`.wasm`

**现状概览**

* 入口已导出 `convert` 的方法 `src/index.ts:1-2`

* WASM 加载封装已具备候选注入与资产定位 `src/core/wasm.ts:5-15,32-75,112-121`

* 转换管线已实现基础导出（通过 `callMain` CLI）`src/core/pipeline.ts:66-95`

* 类型定义与目标接口已就绪 `src/types.ts:1-36`

**API 设计**

* 顶层函数：`convert(input, target, options?) => Promise<Uint8Array>`（保持简单）

* 面向对象：`createAssimp() => Promise<Assimp>` 返回实现以下接口的实例：

  * `convert(input, target, options?)`

  * `getVersion()`

  * `destroy()`

* 类型遵循现有定义：`InputSource | ExportFormat | ConvertOptions`（无 WASM 暴露）

**输入支持与规范化**

* 现有 `normalizeInput` 仅接受 `ArrayBuffer/Uint8Array/{name,data}/files[]` 并拒绝 `string/File/Blob` `src/core/pipeline.ts:16-34`

* 修改为：

  * `string`：当作 URL，fetch 后推断文件名与扩展名（保留大小）

  * `File/Blob`：读取为 `ArrayBuffer`，文件名取 `File.name` 或提供的 `options.name`

  * 仍支持 `{name,data}` 与 `{files:[...]}`

* 文件名与扩展用于格式推断与默认输出名

**格式映射与选项**

* 现有导出映射：`glb→gltf2,obj→obj,stl→stl,ply→ply,usd→usd` `src/core/pipeline.ts:36-51`

* 扩展 `ConvertOptions`：

  * `binary`：影响 `ply/stl/glb` 等输出方式（优先保持与 CLI 一致）

  * `embedTextures`：写入 CLI 选项（例如 `--embed-textures`），若模块不支持则忽略

  * `name`：输出基名

**转换流程**

* 首选直接模块 API：若存在 `(module).convert(files, target, options)` 则使用 `src/core/pipeline.ts:53-64`

* 回退到 CLI：`callMain(['export', inputPath, outputPath, '-f', format, ...flags])` `src/core/pipeline.ts:86-90`

* 读出 `outputPath` 并清理 `FS` 临时文件 `src/core/pipeline.ts:91-94`

**WASM 加载策略**

* 优先注入 `assimpjs-exporter.js` 与二进制 `assimpjs-exporter.wasm` `src/core/wasm.ts:33-75,112-121`

* `locateFile` 指向打包后 `./wasm/`，开发态指向源码 `../../wasm/` `src/core/wasm.ts:5-15,116-119`

* 若 exporter 不可用，回退 `assimpjs-all.js/.wasm`

**版本与销毁**

* `getVersion()`：

  * 若模块暴露版本 API（如 `module.ASSIMP_VERSION/module.version`），直接返回

  * 回退策略：尝试 `callMain(['--version'])` 或返回固定标识（例如构建版本字符串）

* `destroy()`：释放实例引用并调用 `resetAssimpModule()` 以便后续重新初始化 `src/core/wasm.ts:123-125`

**打包与资产**

* 要求打包器将 `/wasm/*.js/.wasm` 原样复制到 `dist/wasm/`

* 保留 `types/assimpjs-exporter.d.ts` 声明以适配类型系统 `src/types/assimpjs-exporter.d.ts:1-4`

* 提供文档片段：如何在 Vite/Webpack/Rspack 中配置静态拷贝

**对外使用示例**

* `import { convert, createAssimp, ExportFormat } from 'meshflow'`

* 直接函数：`const out = await convert(file, 'glb', { binary: true, name: 'model' })`

* 面向对象：`const sdk = await createAssimp(); const out = await sdk.convert(url, 'obj'); sdk.destroy()`

**兼容与错误处理**

* 浏览器专注：若在非浏览器（无 `document`）环境注入脚本失败，给出明确错误

* 对 `string` URL 的网络错误返回一致异常；对不支持格式返回 `Unsupported export format`

**验证**

* 在示例页面或脚本中验证 `glb/obj/stl/ply/usd` 的转换

* 使用多输入类型（URL/File/Blob/ArrayBuffer）的转换路径

**UI 集成（后续）**

* 按 Figma 稿构建简洁上传转换组件（避免交互元素嵌套的警告），SDK 仅作调用层

**计划改动文件**

* `src/core/pipeline.ts`：

  * 支持 `string/File/Blob` 读取与命名

  * 将 `ConvertOptions` 映射为 CLI 参数（若可用）

* `src/core/assimp.ts`

