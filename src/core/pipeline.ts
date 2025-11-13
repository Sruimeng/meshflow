import type { InputSource, ExportFormat, ConvertOptions } from '../types';
import { getAssimpImporter, getAssimpExporter } from './wasm';

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

async function collectInputFiles(input: InputSource): Promise<{ name: string; data: Uint8Array }[]> {
  if (typeof input === 'string') {
    const url = input;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch input: ${url}`);
    const ab = await res.arrayBuffer();
    const name = (() => {
      try {
        const u = new URL(url, typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
        const seg = (u.pathname || '').split('/').filter(Boolean).pop();
        return seg || 'input.bin';
      } catch {
        const seg = url.split('/').filter(Boolean).pop();
        return seg || 'input.bin';
      }
    })();
    return [{ name, data: new Uint8Array(ab) }];
  }

  if (typeof File !== 'undefined' && input instanceof File) {
    const ab = await input.arrayBuffer();
    const name = input.name || 'input.bin';
    return [{ name, data: new Uint8Array(ab) }];
  }
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    const ab = await input.arrayBuffer();
    return [{ name: 'input.bin', data: new Uint8Array(ab) }];
  }
  if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
    return [{ name: 'input.bin', data: toUint8Array(input) }];
  }
  if ('name' in (input as any) && (input as any).name && (input as any).data) {
    const i = input as { name: string; data: ArrayBuffer | Uint8Array };
    return [{ name: i.name, data: toUint8Array(i.data) }];
  }
  if ('files' in (input as any)) {
    const i = input as { files: Array<{ name: string; data: ArrayBuffer | Uint8Array }> };
    return i.files.map(f => ({ name: f.name, data: toUint8Array(f.data) }));
  }
  throw new Error('Unsupported input type');
}

function mapFormat(target: ExportFormat, opts?: ConvertOptions): { format: string; outExt: string } {
  switch (target) {
    case 'glb':
      return { format: 'glb2', outExt: 'glb' };
    case 'obj':
      return { format: 'obj', outExt: 'obj' };
    case 'stl':
      return { format: 'stl', outExt: 'stl' };
    case 'ply':
      return { format: 'ply', outExt: 'ply' };
    case 'usd':
      return { format: 'usdz', outExt: 'usdz' };
    default:
      throw new Error('Unsupported export format');
  }
}

async function convertViaModules(files: { name: string; data: Uint8Array }[], target: ExportFormat, options?: ConvertOptions): Promise<Uint8Array> {
  const importer = await getAssimpImporter();
  const exporter = await getAssimpExporter();
  const listIn = new importer.FileList();
  files.forEach(f => listIn.AddFile(f.name, f.data));
  const glbRes = importer.ConvertFileList(listIn, 'glb2');
  if (!glbRes || !glbRes.IsSuccess() || glbRes.FileCount() <= 0) throw new Error('Importer failed to produce glb');
  const glbFile = glbRes.GetFile(0);
  const glbContent: Uint8Array = glbFile.GetContent();
  const { format, outExt } = mapFormat(target, options);
  const listOut = new exporter.FileList();
  listOut.AddFile('input.glb', glbContent);
  const outRes = exporter.ConvertFileList(listOut, format);
  if (!outRes || !outRes.IsSuccess() || outRes.FileCount() <= 0) throw new Error('Exporter failed to produce output');
  let chosen: Uint8Array | null = null;
  for (let i = 0; i < outRes.FileCount(); i++) {
    const f = outRes.GetFile(i);
    const path: string = f.GetPath();
    if (path && path.toLowerCase().endsWith('.' + outExt)) {
      chosen = f.GetContent();
      break;
    }
  }
  if (!chosen) {
    const f0 = outRes.GetFile(0);
    chosen = f0.GetContent();
  }
  return chosen;
}

export async function convertModel(input: InputSource, target: ExportFormat, options?: ConvertOptions): Promise<Uint8Array> {
  const files = await collectInputFiles(input);
  return convertViaModules(files, target, options);
}
