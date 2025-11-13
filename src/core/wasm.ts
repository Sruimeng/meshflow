import type { AssimpFactory, AssimpJSModule, AssimpFactoryOptions } from '../types';

let importerPromise: Promise<AssimpJSModule> | null = null;
let exporterPromise: Promise<AssimpJSModule> | null = null;

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
  const names = ['assimpjs-all.js', 'assimpjs-exporter.js'];
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
      urls.push(`${origin}/src/wasm/${name}`);
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
  const names = ['assimpjs-all.wasm', 'assimpjs-exporter.wasm'];
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
      urls.push(`${origin}/src/wasm/${name}`);
      urls.push(`${origin}/wasm/${name}`);
      urls.push(`${origin}/dist/${name}`);
      urls.push(`${origin}/${name}`);
    }
  }
  return Array.from(new Set(urls));
}

async function tryInjectCandidates(urls: string[]): Promise<void> {
  let lastErr: Error | null = null;
  for (const url of urls) {
    try {
      await injectScript(url);
      return;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw (lastErr || new Error('Failed to inject assimp script'));
}

async function loadFactoryFor(name: 'assimpjs-all.js' | 'assimpjs-exporter.js'): Promise<AssimpFactory> {
  const all = getScriptCandidates();
  const candidates = all.filter(u => u.includes(name));
  await tryInjectCandidates(candidates);
  const fn = (globalThis as { assimpjs?: AssimpFactory }).assimpjs;
  if (!fn) throw new Error('assimpjs factory not available');
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

async function instantiate(factory: AssimpFactory, wasmName: string): Promise<AssimpJSModule> {
  const wasmUrls = getWasmCandidates().filter(u => u.includes(wasmName));
  const wasmBinary = await fetchFirstAvailable(wasmUrls);
  const opts: AssimpFactoryOptions = { locateFile: (p: string) => resolveAsset(p), wasmBinary };
  const mod = await factory(opts);
  const ready = mod?.ready;
  if (ready && typeof ready.then === 'function') await ready;
  return mod;
}

export async function getAssimpImporter(): Promise<AssimpJSModule> {
  if (!importerPromise) {
    const factory = await loadFactoryFor('assimpjs-all.js');
    importerPromise = instantiate(factory, 'assimpjs-all.wasm');
  }
  return importerPromise;
}

export async function getAssimpExporter(): Promise<AssimpJSModule> {
  if (!exporterPromise) {
    const factory = await loadFactoryFor('assimpjs-exporter.js');
    exporterPromise = instantiate(factory, 'assimpjs-exporter.wasm');
  }
  return exporterPromise;
}

export function resetAssimpModule() {
  importerPromise = null;
  exporterPromise = null;
}
