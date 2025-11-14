**问题概述**
- 浏览器仍在请求 `/src/wasm/assimpjs-*.js` 并被 Vite/SWC 转换为 ES 模块，导致 “Cannot use import statement outside a module” 与 WASM `env` 导入错误。
- 需要统一为 UMD 加载路径，确保开发态从 `/wasm/*` 静态目录原样输出，构建态从 `./wasm/*` 输出。

**修改目标**
- 开发态：只从 `/wasm/*` 加载 UMD 构建；不加载 `/src/wasm/*`
- 构建态：将资源复制到 `dist/wasm/*`，从 `./wasm/*` 加载
- Loader 工厂不注入 `wasmBinary` 或自定义 imports，让加载器按默认相对定位拉 `.wasm`

**具体修改项**
1) 目录与静态资源
- 将四个资源放在 `public/wasm/`：`assimpjs-all.js/.wasm`、`assimpjs-exporter.js/.wasm`
- 移除或忽略 `src/wasm/*`，避免 dev server 对其做 ESM 转换

2) `vite.config.js`
- 设置静态复制：保留 `copyWasmVite`（构建后拷贝到 `dist/wasm`）
- 设置开发时保障：`ensure-wasm-dev` 启动时将 `src/wasm/*` 复制到 `public/wasm/*`（或直接声明 `publicDir` 使用 `public` 目录）
- 确认不再有 `/src/wasm/*` 的候选路径

3) `src/core/wasm.ts`
- `resolveAsset`：开发态返回 `/${origin}/wasm/<file>`；构建态返回 `./wasm/<file>`
- `getScriptCandidates/getWasmCandidates`：
  - 开发态仅 `/${origin}/wasm/<name>`
  - 构建态仅 `./wasm/<name>`
- 工厂调用：不传 `wasmBinary`；只调用 `assimpjs()` 并 `await ready`（若存在）

4) 兜底加载（可选）
- 若注入失败（`assimpjs` 不存在），在开发态尝试用 `import('/wasm/assimpjs-exporter.js')` 动态导入 ESM 构建（仅在检测为 ESM 时）
- 通过检测响应首行是否包含 `var assimpjs` 或 `import` 判断构建类型（仅在必要时使用）

**验证步骤**
- 重启 `pnpm dev`，打开 Demo，Network 面板确认仅命中 `/wasm/*`
- 访问 `http://localhost:<port>/wasm/assimpjs-exporter.js`，第一行必须为 `var assimpjs = (()=>{`（无 `import`）
- 上传并转换，观察不再出现两个错误

**不影响部分**
- Demo 下拉与状态提示已完成，无需变动；文件选择已支持 `.usd/.usdz/.usda/.usdc`。

**交付**
- 修改 `vite.config.js`、`src/core/wasm.ts`，并清理/移动资源到 `public/wasm/`
- 提交后本地验证与构建验证（`pnpm dev`、`pnpm build`），确保 `dist/wasm/*` 生成且加载正常