import type { Assimp, InputSource, ExportFormat, ConvertOptions, AssimpError } from '../types';
import { getAssimpImporter, getAssimpExporter, resetAssimpModule } from './wasm';
import { convertModel } from './pipeline';

export class AssimpImpl implements Assimp {

  async convert(
    input: InputSource,
    target: ExportFormat,
    onError?: () => AssimpError,
    options?: ConvertOptions
  ): Promise<Uint8Array | AssimpError> {
    return convertModel(input, target, onError, options);
  }

  getVersion(): string {
    return 'assimpjs-exporter';
  }

  destroy(): void {
    resetAssimpModule();
  }
}

export async function createAssimp(): Promise<Assimp | AssimpError> {
  try {
    await Promise.all([getAssimpImporter(), getAssimpExporter()]);
    return new AssimpImpl();
  } catch {
    const e = { 1000: 'Import wasm failed' } as AssimpError;
    return e;
  }
}
