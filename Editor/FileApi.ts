import fs from '@/Core/lib/fs';

export interface DirInfo {
  name: string;        // "index.js"
  id: string;
  fullPath: string;    // "./index.js"
  type: string;
  size: string;        // "1.42" (MB)
}



export type FileType =
  | 'image'
  | 'model'
  | 'script'
  | 'material'
  | 'geometry'
  | 'shader'
  | 'unknown';

export function getFileType(ext: string): FileType {
  if (!ext) return 'unknown';

  const e = ext.replace('.', '').toLowerCase();

  const registry: Record<FileType, string[]> = {
    image:    ['png', 'jpg', 'jpeg', 'webp', 'hdr', 'exr'],
    model:    ['object'],
    script:   ['js', 'ts', 'lua', 'py'],
    material: ['mat', 'material'],
    geometry: ['geo'],
    shader:   ['glsl', 'vert', 'frag', 'wgsl'],
    unknown:  [], // fallback
  };

  for (const [type, exts] of Object.entries(registry) as [FileType, string[]][]) {
    if (exts.includes(e)) return type;
  }

  return 'unknown';
}

export function getExt(filename: string): string {
  if (!filename) return '';

  const last = filename.lastIndexOf('.');
  if (last === -1) return '';

  return filename.slice(last + 1).toLowerCase();
}

/* ---------------------------
   File API - responsible for FS ops
   --------------------------- */
export class FileAPI {
  constructor() {
      
  }
    
  // Read directory and convert to DirInfo[]
  async readDir(dir: string): Promise<DirInfo[]> {
    const result: DirInfo[] = [];
    const files = await fs.readdir(dir);

    for (const file of files) {
      const full = dir + "/" + file;
      const stats = await fs.stat(full);
      result.push({
        name: file,
        fullPath: full,
        id: full,
        type: stats.isDirectory ? "folder" : getFileType(getExt(file)),
        size: (stats.size / (1024 * 1024)).toFixed(1) // bytes -> MB
      });
    }

    return result;
  }

  async readFile(path: string): Promise<string> {
    const content = await fs.readFile(path, { encoding: "utf-8" });
    return content;
  }

  async writeFile(path: string, data: string): Promise<void> { 
    await fs.writeFile(path, data, { encoding: "utf-8" });
  }

  async rm(path: string): Promise<void> {
    // simple wrapper — adapt for file vs folder if needed
    await fs.rm(path);
  }

  async mkdir(path: string): Promise<void> {
    await fs.mkdir(path);
  }
}
