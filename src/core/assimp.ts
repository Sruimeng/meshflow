import type { Assimp, InputSource, ExportFormat, ConvertOptions } from '../types';
import { getAssimpImporter, getAssimpExporter, resetAssimpModule } from './wasm';
import { convertModel } from './pipeline';

export class AssimpImpl implements Assimp {

  async convert(input: InputSource, target: ExportFormat, options?: ConvertOptions): Promise<Uint8Array> {
    return convertModel(input, target, options);
  }

  getVersion(): string {
    return 'assimpjs-exporter';
  }

  destroy(): void {
    resetAssimpModule();
  }
}

export async function createAssimp(): Promise<Assimp> {
  // Ensure module loads once; convertModel will reuse the same instance
  await Promise.all([getAssimpImporter(), getAssimpExporter()]);
  return new AssimpImpl();
}

