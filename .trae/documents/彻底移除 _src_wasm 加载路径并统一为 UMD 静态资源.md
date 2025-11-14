**问题**
- 浏览器仍在请求 `http://localhost:<port>/src/wasm/...`，导致脚本被 Vite/SWC 转换为 ESModule，出现“Cannot use import…”与 WASM `env` 导入错误。

**目标**
- 开发态：仅从 `http://localhost:<port>/wasm/*` 加载 UMD 版本的 `assimpjs-*.js/.wasm`
- 构建态：仅从 `./wasm/*` 加载
- Loader 工厂不注入 `wasmBinary` 或自定义 imports，让加载器按默认相对定位拉 `.wasm`

**改动项**
1) `src/core/wasm.ts`
- 更新 `resolveAsset`：
  - 开发态：返回 `${origin}/wasm/${file}`（不再使用 `../../wasm/` 导致 `/src/wasm`）
  - 构建态：返回 `new URL('./wasm/', import.meta.url)` 拼接
- 更新 `getScriptCandidates/getWasmCandidates`：
  - 开发态：仅 `${origin}/wasm/${name}`
  - 构建态：仅 `new URL('./wasm/${name}', import.meta.url)`
  - 删除所有 `../../wasm`, `./dist`, `${origin}/src/wasm`, `${origin}/dist` 候选
- 更新 `instantiate`：不传 `wasmBinary`；仅传 `locateFile` 或直接不传，让 loader 自行定位 `.wasm`

2) 静态资源
- 将四个 UMD 产物统一放置：`public/wasm/assimpjs-all.js/.wasm`, `assimpjs-exporter.js/.wasm`
- 移除或忽略 `src/wasm`（避免 dev server 转换）

3) `vite.config.js`
- 设置 `publicDir: 'public'`
- 添加 `ensure-wasm-dev` 插件：dev 启动时复制 `src/wasm` 或根 `wasm` 到 `public/wasm`（兜底），确保 `/wasm/*` 存在
- 保留 `copy-wasm-vite`：构建结束复制到 `dist/wasm`

**验证**
- 重启 `pnpm dev` 并强制刷新（禁用缓存）
- Network 仅命中 `/wasm/assimpjs-*.js/.wasm`
- 访问 `/wasm/assimpjs-exporter.js`，第一行应为 `var assimpjs = (()=>{`（无 `import`）
- 上传并转换，无两个错误

**说明**
- 如果未来拿到 ESM 构建的 exporter，则改为 `import('/wasm/assimpjs-exporter.js')` 动态导入；当前 UMD 构建无需此步骤。
