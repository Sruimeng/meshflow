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
  | 'fbx'
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

// ================== AssimpJS 模块类型（用于避免 any/unknown） ==================

// 工厂选项（WASM 定位与二进制注入）
// 用于传递给 assimpjs 工厂函数，控制 wasm 文件查找与预加载的二进制数据
export interface AssimpFactoryOptions {
  locateFile?: (p: string) => string;
  wasmBinary?: Uint8Array;
}

// 单个导出文件（例如 .obj/.mtl/.glb 等）
// 提供文件路径与内容访问接口
export interface AssimpConvertedFile {
  GetPath(): string;
  GetContent(): Uint8Array;
}

// 转换结果集
// 提供是否成功、文件数量、错误码与按索引获取文件的能力
export interface AssimpConversionResult {
  IsSuccess(): boolean;
  FileCount(): number;
  GetErrorCode?(): number;
  GetFile(index: number): AssimpConvertedFile;
}

// 文件列表
// 作为模块输入或中间结果输入（例如 GLB 作为导出器的输入）
export interface AssimpFileList {
  AddFile(name: string, data: Uint8Array): void;
}

// AssimpJS 模块实例
// 注意：导入器与导出器模块接口保持一致（都有 FileList 与 ConvertFileList）
export interface AssimpJSModule {
  ready?: Promise<void>;
  FileList: new () => AssimpFileList;
  ConvertFileList(list: AssimpFileList, format: string): AssimpConversionResult;
}

// 工厂函数类型（从全局 assimpjs 获取）
export type AssimpFactory = (opts?: AssimpFactoryOptions) => Promise<AssimpJSModule>;
