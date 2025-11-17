import type { AssimpFactory, AssimpJSModule, AssimpFactoryOptions } from '../types';

let importerPromise: Promise<AssimpJSModule> | null = null;
let exporterPromise: Promise<AssimpJSModule> | null = null;

function resolveAsset(path: string): string {
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/wasm/${path}`;
  }
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
  const names = ['assimpjs-all.js', 'assimpjs-exporter.js'];
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    return names.map(n => `${origin}/wasm/${n}`);
  }
  return names.map(n => {
    try { return new URL(`./wasm/${n}`, import.meta.url).href; } catch { return `./wasm/${n}`; }
  });
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

async function instantiate(factory: AssimpFactory, _wasmName: string): Promise<AssimpJSModule> {
  const opts: AssimpFactoryOptions = { locateFile: (p: string) => resolveAsset(p) };
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
