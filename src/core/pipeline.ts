import type { InputSource, ExportFormat, ConvertOptions } from '../types';
import { getAssimpModule } from './wasm';

type ModuleFS = {
  writeFile: (path: string, data: Uint8Array) => void;
  readFile: (path: string) => Uint8Array;
  unlink: (path: string) => void;
  mkdir?: (path: string) => void;
  readdir?: (path: string) => string[];
};

function toUint8Array(data: ArrayBuffer | Uint8Array): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

function normalizeInput(input: InputSource): { name: string; data: Uint8Array }[] {
  if (typeof input === 'string') throw new Error('String path is not supported in browser environment');
  if (input instanceof File) {
    throw new Error('File object not supported directly; read as ArrayBuffer and provide name');
  }
  if (input instanceof Blob) {
    throw new Error('Blob not supported directly; read as ArrayBuffer and provide name');
  }
  if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
    return [{ name: 'input.bin', data: toUint8Array(input) }];
  }
  if ('name' in input && input.name && input.data) {
    return [{ name: input.name, data: toUint8Array(input.data) }];
  }
  if ('files' in input) {
    return input.files.map(f => ({ name: f.name, data: toUint8Array(f.data) }));
  }
  throw new Error('Unsupported input type');
}

function mapFormat(target: ExportFormat, opts?: ConvertOptions): { format: string; outExt: string } {
  switch (target) {
    case 'glb':
      return { format: 'gltf2', outExt: 'glb' };
    case 'obj':
      return { format: 'obj', outExt: 'obj' };
    case 'stl':
      return { format: 'stl', outExt: 'stl' };
    case 'ply':
      return { format: 'ply', outExt: 'ply' };
    case 'usd':
      return { format: 'usd', outExt: 'usd' };
    default:
      throw new Error('Unsupported export format');
  }
}

async function tryConvertAPI(module: any, files: { name: string; data: Uint8Array }[], target: ExportFormat, options?: ConvertOptions): Promise<Uint8Array | null> {
  const fn = (module as any).convert;
  if (typeof fn !== 'function') return null;
  const res = await fn(files, target, options || {});
  if (!res) return null;
  if (res instanceof Uint8Array) return res;
  if (Array.isArray(res)) {
    const first = res.find((f: any) => f && f.data instanceof Uint8Array);
    return first ? first.data : null;
  }
  return null;
}

export async function convertModel(input: InputSource, target: ExportFormat, options?: ConvertOptions): Promise<Uint8Array> {
  const module = await getAssimpModule();
  const fs: ModuleFS = module.FS || (module as any).FS;
  if (!fs || typeof fs.writeFile !== 'function' || typeof fs.readFile !== 'function') {
    throw new Error('WASM FS is not available');
  }
  const files = normalizeInput(input);
  const apiResult = await tryConvertAPI(module, files, target, options);
  if (apiResult) return apiResult;

  const { format, outExt } = mapFormat(target, options);
  const workDir = '/work';
  try { fs.mkdir?.(workDir); } catch {}

  files.forEach(f => fs.writeFile(`${workDir}/${f.name}`, f.data));
  const mainName = files[0]?.name || 'input.bin';
  const baseOut = (options?.name || mainName.replace(/\.[^.]+$/, '')) + '.' + outExt;
  const inputPath = `${workDir}/${mainName}`;
  const outputPath = `${workDir}/${baseOut}`;

  const callMain = (module as any).callMain;
  if (typeof callMain !== 'function') throw new Error('WASM module does not expose callMain; cannot perform CLI export');
  const args = ['export', inputPath, outputPath, '-f', format];
  callMain(args);

  const out = fs.readFile(outputPath);
  try { fs.unlink(outputPath); } catch {}
  try { fs.unlink(inputPath); } catch {}
  return out;
}

