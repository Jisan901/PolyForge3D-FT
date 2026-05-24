import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import type { AssetImporter, ImportContext, ImportResult } from './types';
import fs from '@/Core/lib/fs';
import { Baxporter } from '@/Core/Plugins/Binary/Baxporter';


export class FBXImporter implements AssetImporter {
  extensions = ['fbx'];
  exporter = new Baxporter();
  
  
  async import(file: File, ctx: ImportContext): Promise<ImportResult> {
    const url = URL.createObjectURL(file);
    const loader = new FBXLoader();

    // FBXLoader returns Object3D directly (not gltf wrapper)
    const root = await loader.loadAsync(url);
    URL.revokeObjectURL(url);

    const name = file.name.replace(/\.fbx$/i, '');
    root.name ||= name;

    const polyObject = root;
    const uuid = polyObject.uuid;
    const assetDir = `${ctx.assetRoot}`;
    
    //const bins = new BinarySerializer();
    //await bins.save(polyObject,`${assetDir}/${name}.object.bin`,true);
    await this.exporter.export(polyObject, assetDir, name || polyObject.name||polyObject.uuid );
    return {
      uuid,
      name: root.name,
      type: 'model',
      path: `/Game/files/Assets/${name}.object`
    };
  }
}
