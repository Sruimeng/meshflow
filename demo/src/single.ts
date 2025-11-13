import { convert, ExportFormat } from '@sruimeng/mesh-flow';

const dropzone = document.getElementById('J-dropzone') as HTMLDivElement | null;
const browseBtn = document.getElementById('J-browse') as HTMLButtonElement | null;
const fileInput = document.getElementById('J-file') as HTMLInputElement | null;
const formatSelect = document.getElementById('J-format') as HTMLSelectElement | null;
const convertBtn = document.getElementById('J-convert') as HTMLButtonElement | null;
const outputDiv = document.getElementById('J-output') as HTMLDivElement | null;

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function handleConvert() {
  if (!fileInput || !formatSelect || !outputDiv) return;
  const file = fileInput.files?.[0];
  if (!file) {
    outputDiv.textContent = '请选择一个模型文件';
    return;
  }
  if (file.size > 200 * 1024 * 1024) {
    outputDiv.textContent = '文件超过 200MB 限制';
    return;
  }
  const fmt = formatSelect.value as ExportFormat;
  outputDiv.textContent = '转换中...';
  try {
    const buf = await readFileAsArrayBuffer(file);
    const data = new Uint8Array(buf);
    const res = await convert({ name: file.name, data }, fmt, { name: file.name.replace(/\.[^.]+$/, '') });
    // 使用显式的 ArrayBuffer 作为 BlobPart，避免 TS 对 ArrayBufferLike 的严格检查
    const ab = new ArrayBuffer(res.byteLength);
    new Uint8Array(ab).set(res);
    const blob = new Blob([ab]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace(/\.[^.]+$/, '')}.${fmt}`;
    a.textContent = `下载 ${a.download} (${res.byteLength} 字节)`;
    outputDiv.innerHTML = '';
    outputDiv.appendChild(a);
  } catch (e: any) {
    outputDiv.textContent = `转换失败: ${e?.message || e}`;
    console.error(e);
  }
}

convertBtn?.addEventListener('click', handleConvert);

// 浏览按钮触发文件选择
browseBtn?.addEventListener('click', () => fileInput?.click());

// 拖拽支持
function preventDefaults(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
  dropzone?.addEventListener(evt, preventDefaults, false);
});

dropzone?.addEventListener('dragover', () => {
  dropzone.style.borderColor = 'rgba(255,255,255,0.35)';
});
dropzone?.addEventListener('dragleave', () => {
  dropzone.style.borderColor = 'rgba(255,255,255,0.15)';
});
dropzone?.addEventListener('drop', (e: DragEvent) => {
  const dt = e.dataTransfer;
  const f = dt?.files?.[0];
  if (f && fileInput) {
    // 将拖入文件放入 input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(f);
    fileInput.files = dataTransfer.files;
    outputDiv && (outputDiv.textContent = `已选择文件：${f.name}`);
    if (convertBtn) convertBtn.disabled = false;
  }
});

// 粘贴支持
document.addEventListener('paste', async (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items || !fileInput) return;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const f = item.getAsFile();
      if (f) {
        const dt = new DataTransfer();
        dt.items.add(f);
        fileInput.files = dt.files;
        outputDiv && (outputDiv.textContent = `已粘贴文件：${f.name}`);
        if (convertBtn) convertBtn.disabled = false;
        break;
      }
    }
  }
});

// 初始禁用转换按钮，选择文件后启用
if (convertBtn) convertBtn.disabled = !fileInput || !(fileInput.files && fileInput.files.length > 0);
fileInput?.addEventListener('change', () => {
  if (convertBtn) convertBtn.disabled = !(fileInput.files && fileInput.files.length > 0);
});
