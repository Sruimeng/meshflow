type AssimpModule = any;

let modulePromise: Promise<AssimpModule> | null = null;

function resolveAsset(path: string): string {
  const isDev = typeof import.meta.url === 'string' && import.meta.url.includes('/src/');
  if (isDev) {
    // 开发态：源码相对于项目根目录的 wasm 目录
    const base = new URL('../../wasm/', import.meta.url);
    return new URL(path, base).href;
  }
  // 构建后：资产被复制到 dist/wasm 目录，相对于打包入口
  const base = new URL('./wasm/', import.meta.url);
  return new URL(path, base).href;
}

function injectScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Script injection is only supported in browser environment'));
      return;
    }
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(s);
  });
}

function getScriptCandidates(): string[] {
  const urls: string[] = [];
  const names = ['assimpjs-exporter.js', 'assimpjs-all.js'];
  for (const name of names) {
    // Prefer local /wasm directory in dev and build
    try { urls.push(new URL(`../../wasm/${name}`, import.meta.url).href); } catch {}
    try { urls.push(new URL(`./wasm/${name}`, import.meta.url).href); } catch {}
    // Also try /dist directory as referenced by standalone HTML doc
    try { urls.push(new URL(`../../dist/${name}`, import.meta.url).href); } catch {}
    try { urls.push(new URL(`./dist/${name}`, import.meta.url).href); } catch {}
  }
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    for (const name of names) {
      urls.push(`${origin}/wasm/${name}`);
      urls.push(`${origin}/dist/${name}`);
      urls.push(`${origin}/${name}`);
    }
  }
  // 去重保持顺序
  return Array.from(new Set(urls));
}

function getWasmCandidates(): string[] {
  const urls: string[] = [];
  const names = ['assimpjs-exporter.wasm', 'assimpjs-all.wasm'];
  for (const name of names) {
    // Prefer local /wasm directory in dev and build
    try { urls.push(new URL(`../../wasm/${name}`, import.meta.url).href); } catch {}
    try { urls.push(new URL(`./wasm/${name}`, import.meta.url).href); } catch {}
    // Also try /dist directory as referenced by standalone HTML doc
    try { urls.push(new URL(`../../dist/${name}`, import.meta.url).href); } catch {}
    try { urls.push(new URL(`./dist/${name}`, import.meta.url).href); } catch {}
  }
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    for (const name of names) {
      urls.push(`${origin}/wasm/${name}`);
      urls.push(`${origin}/dist/${name}`);
      urls.push(`${origin}/${name}`);
    }
  }
  return Array.from(new Set(urls));
}

async function tryInjectCandidates(urls: string[]): Promise<void> {
  let lastErr: any;
  for (const url of urls) {
    try {
      await injectScript(url);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('Failed to inject assimp script');
}

async function loadAssimpFactory(): Promise<(opts?: any) => Promise<AssimpModule>> {
  const candidates = getScriptCandidates();
  await tryInjectCandidates(candidates);
  const fn = (globalThis as any).assimpjs;
  if (typeof fn !== 'function') {
    throw new Error('assimpjs factory not available after script injection');
  }
  return fn;
}

async function fetchFirstAvailable(urls: string[]): Promise<Uint8Array | undefined> {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const ab = await res.arrayBuffer();
      return new Uint8Array(ab);
    } catch {}
  }
  return undefined;
}

export async function getAssimpModule(): Promise<AssimpModule> {
  if (modulePromise) return modulePromise;
  const factory = await loadAssimpFactory();
  const wasmBinary = await fetchFirstAvailable(getWasmCandidates());
  modulePromise = factory({
    locateFile: (p: string) => resolveAsset(p),
    wasmBinary,
  });
  return modulePromise;
}

export function resetAssimpModule() {
  modulePromise = null;
}
