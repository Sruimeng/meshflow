**目标**
- 还原 Figma 页面在各阶段的提示：模块加载、文件就绪、转换中、完成、失败
- 明确状态可视化与交互文案，避免“加载完成状态不对、没有提示”的问题
- 遵循交互元素不可嵌套交互元素规范

**状态与文案**
- Idle：上传卡片展示文案“Drag, Upload or Paste 3D file”，按钮“Cloud Upload”禁用转换按钮
- ModuleLoading：顶部或卡片下方显示“Loading Assimp module…”，微型进度/旋转图标
- FileReady：显示“File ready: <name> (<size>)”，转换按钮可用
- Converting：按钮变为“Converting…”，显示进度提示“Converting to <format>…”，按钮禁用
- Success：内联提示“Converted: <name>.<fmt> (<bytes> bytes)”并显示下载链接，按钮文案恢复“Convert Now”
- Error：红色提示“Failed: <message>”，并给出重试建议

**UI结构改造（demo/html/single.html）**
- 在上传卡片下新增状态行元素：`<div class="status" id="J-status"></div>`
- 增加简单的 spinner 样式与状态样式：`.status--loading`, `.status--success`, `.status--error`
- 保持上传卡片中的唯一交互元素为“选择文件按钮”（加隐藏 input），不嵌套其他交互

**交互逻辑（demo/src/single.ts）**
- 添加状态机：`idle → moduleLoading → fileReady → converting → success|error`
- 方法：`setStatus(type, text)` 更新状态行 class 与文案；`beginConvert()` 改变按钮文案与禁用态
- 模块加载：调用 SDK 前先设置 `moduleLoading`，在 importer/exporter ready 后转 `fileReady`
- 文件选择/拖拽/粘贴：更新状态行为“File ready: …”，启用按钮
- 转换：进入 `converting`，成功后进入 `success` 并生成下载链接，失败进入 `error`
- 边界：>200MB、格式不支持、网络错误、模块注入失败分别给出明确提示

**样式增强（demo/html/single.html 的 style）**
- 状态行配色：
  - loading：淡色文字配旋转动画
  - success：高亮文字（与 Figma风格一致的浅色）
  - error：强调色（如 #ff6b6b）
- 按钮在 `converting` 状态增加加载指示，保持禁用

**可访问性**
- 上传卡片内部唯一交互元素：`button` 与隐藏 `input`，避免交互嵌套
- 给状态行添加 `role="status"` 与 `aria-live="polite"`，便于读屏提示

**落地文件修改**
- `demo/html/single.html`：新增 `#J-status`，完善按钮与样式（spinner，状态样式）
- `demo/src/single.ts`：实现状态机、文案更新、按钮状态切换、错误提示与成功提示

**验证与测试**
- 测试 URL/File/Blob 三类输入路径
- 测试 200MB 限制、模块加载失败、网络异常
- 验证转换后提示与下载链接显示正确

**注意**
- 保持文案与 Figma一致（如“Select Target Format”“Convert Now”）
- 不引入嵌套交互元素，避免 Figma 的调试警告
