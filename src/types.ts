export type InputSource =
  | string
  | File
  | Blob
  | ArrayBuffer
  | Uint8Array
  | { name: string; data: ArrayBuffer | Uint8Array }
  | { files: Array<{ name: string; data: ArrayBuffer | Uint8Array }> };
export type AssimpJSON = Record<string, unknown>;
export type ExportFormat =
  | 'glb'
  | 'obj'
  | 'stl'
  | 'ply'
  | 'usd';
export type InputFormat =
  | 'glb'
  | 'obj'
  | 'stl'
  | 'ply'
  | 'fbx'
  | '3mf'
  | 'vox'
  | 'gltf' // 不支持分离结构的支持
  | 'usd';
 export interface ConvertOptions {
  embedTextures?: boolean;
  binary?: boolean;
  name?: string;
}
  
 export interface Assimp {
  convert(input: InputSource, target: ExportFormat, options?: ConvertOptions): Promise<Uint8Array>;
  getVersion(): string;
  destroy(): void;
}
