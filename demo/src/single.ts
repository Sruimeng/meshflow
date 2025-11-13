import { convert, ExportFormat, createAssimp } from '@sruimeng/mesh-flow';

const dropzone = document.getElementById('J-dropzone') as HTMLDivElement | null;
const browseBtn = document.getElementById('J-browse') as HTMLButtonElement | null;
const fileInput = document.getElementById('J-file') as HTMLInputElement | null;
const nativeSelect = document.getElementById('J-format-native') as HTMLSelectElement | null;
const combo = document.getElementById('J-format-combobox') as HTMLDivElement | null;
const comboBtn = document.getElementById('J-format-button') as HTMLButtonElement | null;
const comboList = document.getElementById('J-format-list') as HTMLDivElement | null;
const comboValue = document.getElementById('J-format-value') as HTMLSpanElement | null;
const convertBtn = document.getElementById('J-convert') as HTMLButtonElement | null;
const outputDiv = document.getElementById('J-output') as HTMLDivElement | null;
const statusDiv = document.getElementById('J-status') as HTMLDivElement | null;

type StatusKind = 'idle' | 'loading' | 'file' | 'converting' | 'success' | 'error';

function setStatus(kind: StatusKind, text: string) {
  if (!statusDiv) return;
  statusDiv.classList.remove('status--loading', 'status--success', 'status--error');
  if (kind === 'loading') {
    statusDiv.classList.add('status--loading');
    statusDiv.innerHTML = `<span class="spinner"></span><span>${text}</span>`;
  } else if (kind === 'success') {
    statusDiv.classList.add('status--success');
    statusDiv.textContent = text;
  } else if (kind === 'error') {
    statusDiv.classList.add('status--error');
    statusDiv.textContent = text;
  } else {
    statusDiv.textContent = text;
  }
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function handleConvert() {
  if (!fileInput || !nativeSelect || !outputDiv) return;
  const file = fileInput.files?.[0];
  if (!file) { setStatus('error', '请选择一个模型文件'); return; }
  if (file.size > 200 * 1024 * 1024) { setStatus('error', '文件超过 200MB 限制'); return; }
  const fmt = (nativeSelect.value as ExportFormat);
  setStatus('converting', `Converting to ${fmt}…`);
  if (convertBtn) { convertBtn.disabled = true; convertBtn.textContent = 'Converting…'; }
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
    setStatus('success', `Converted: ${a.download} (${res.byteLength} bytes)`);
  } catch (e: any) {
    setStatus('error', `Failed: ${e?.message || e}`);
    console.error(e);
  } finally { if (convertBtn) { convertBtn.disabled = !(fileInput.files && fileInput.files.length > 0); convertBtn.textContent = 'Convert Now'; } }
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
    setStatus('file', `File ready: ${f.name} (${(f.size/1024/1024).toFixed(2)} MB)`);
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
        setStatus('file', `File ready: ${f.name} (${(f.size/1024/1024).toFixed(2)} MB)`);
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
  const f = fileInput.files?.[0]; if (f) setStatus('file', `File ready: ${f.name} (${(f.size/1024/1024).toFixed(2)} MB)`);
});

(async () => {
  try { setStatus('loading', 'Loading Assimp module…'); await createAssimp(); setStatus('idle', 'Ready'); }
  catch (e: any) { setStatus('error', `Assimp module init failed: ${e?.message || e}`); }
})();
function openCombo() {
  if (!combo) return;
  combo.classList.add('is-open');
  combo.setAttribute('aria-expanded', 'true');
}

function closeCombo() {
  if (!combo) return;
  combo.classList.remove('is-open');
  combo.setAttribute('aria-expanded', 'false');
}

comboBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (combo?.classList.contains('is-open')) closeCombo(); else openCombo();
});

comboList?.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const opt = target.closest('.format-option') as HTMLElement | null;
  if (!opt || !nativeSelect || !comboValue) return;
  const val = opt.getAttribute('data-value') || 'glb';
  nativeSelect.value = val;
  comboValue.textContent = val.toUpperCase() === 'USD' ? 'USDZ' : val.toUpperCase();
  const options = comboList.querySelectorAll('.format-option');
  options.forEach(el => el.setAttribute('aria-selected', el === opt ? 'true' : 'false'));
  closeCombo();
});

document.addEventListener('click', (e) => {
  if (!combo) return;
  if (!combo.contains(e.target as Node)) closeCombo();
});

comboBtn?.addEventListener('keydown', (e) => {
  if (!comboList || !nativeSelect || !comboValue) return;
  const options = Array.from(comboList.querySelectorAll('.format-option')) as HTMLElement[];
  const currentIndex = options.findIndex(el => el.getAttribute('aria-selected') === 'true');
  if (e.key === 'Enter' || e.key === ' ') {
    if (combo?.classList.contains('is-open')) closeCombo(); else openCombo();
    e.preventDefault();
  } else if (e.key === 'Escape') {
    closeCombo();
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    let next = currentIndex;
    if (e.key === 'ArrowDown') next = Math.min(options.length - 1, currentIndex + 1);
    else next = Math.max(0, currentIndex - 1);
    const opt = options[next];
    const val = opt.getAttribute('data-value') || 'glb';
    nativeSelect.value = val;
    comboValue.textContent = val.toUpperCase() === 'USD' ? 'USDZ' : val.toUpperCase();
    options.forEach(el => el.setAttribute('aria-selected', el === opt ? 'true' : 'false'));
    e.preventDefault();
  }
});
