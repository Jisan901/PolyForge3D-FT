import type {AssetImporter,ImportContext,ImportResult} from './types'
import fs from "@/lib/fs";


export class JSONImporter implements AssetImporter {
  extensions = ['json'];

  async import(file: File, ctx: ImportContext): Promise<ImportResult> {
      const text = await file.text();
    

    
    const name = file.name.replace(/\.(json)$/, '');

    
    const assetDir = `${ctx.assetRoot}`;


    await fs.writeFile(
      `${assetDir}/${name}.object`,
        text
    );

    return {
      uuid:null,
      name,
      type: 'model',
      path: `/Game/files/Assets/${name}.object`
    };
  }
}