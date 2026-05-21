import type {AssetImporter,ImportContext,ImportResult} from './types'
import fs from '@/Core/lib/fs';
import {THREE} from '@/Core/lib/THREE';

import { Baxporter } from '@/Core/Plugins/Binary/Baxporter';

export class JSONImporter implements AssetImporter {
  extensions = ['json', 'object'];

  async import(file: File, ctx: ImportContext): Promise<ImportResult> {
      console.log(file)
      const text = await file.text();
    

    
    const name = file.name.replace(/\.(json)$/, '');

    
    const assetDir = `${ctx.assetRoot}`;

    const bins = new Baxporter();
    let polyObject = await (new THREE.ObjectLoader()).parseAsync(JSON.parse(text));
    bins.exportObjectv3(polyObject,{path: `${assetDir}/${name}.object.bin`});
    

    return {
      uuid:null,
      name,
      type: 'model',
      path: `/Game/files/Assets/${name}.object`
    };
  }
}