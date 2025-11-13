import { convert, ExportFormat } from '../../src/index';

const container = document.getElementById('J-container') as HTMLDivElement | null;
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
  const fmt = formatSelect.value as ExportFormat;
  outputDiv.textContent = '转换中...';
  try {
    const buf = await readFileAsArrayBuffer(file);
    const data = new Uint8Array(buf);
    console.log('data', data);
    console.log('name', file.name, fmt, file.name.replace(/\.[^.]+$/, ''));
    
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
