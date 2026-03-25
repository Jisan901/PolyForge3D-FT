export interface AssetImporter {
  extensions: string[];
  import(file: File, ctx: ImportContext): Promise<ImportResult>;
}

export interface ImportContext {
  projectPath: string;
  assetRoot: string;
}

export interface ImportResult {
  uuid: string;
  name: string;
  type: 'model' | 'scene' | 'prefab';
  path: string; // assets/name.object
}