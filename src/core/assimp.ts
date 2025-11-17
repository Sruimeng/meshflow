import type { Assimp, InputSource, ExportFormat, ConvertOptions, AssimpError } from '../types';
import { ErrorNumber } from '../types';
import { getAssimpImporter, getAssimpExporter, resetAssimpModule } from './wasm';
import { convertModel } from './pipeline';

export class AssimpImpl implements Assimp {

  async convert(
    input: InputSource,
    target: ExportFormat,
    options?: ConvertOptions,
    onError?: (err: AssimpError) => void
  ): Promise<Uint8Array | AssimpError> {
    return convertModel(input, target, options, onError);
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
    return { code: ErrorNumber.ImportWasmFailed, message: 'Import wasm failed' };
  }
}
