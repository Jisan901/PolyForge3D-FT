import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import type { AssetImporter, ImportContext, ImportResult } from './types';
import fs from '@/Core/lib/fs';
import {BinarySerializer} from "@/Core/Plugins/Three.patch.plugin";


export class FBXImporter implements AssetImporter {
  extensions = ['fbx'];

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
    
    const bins = new BinarySerializer();
    await bins.save(polyObject,`${assetDir}/${name}.object.bin`,true);

    return {
      uuid,
      name: root.name,
      type: 'model',
      path: `/Game/files/Assets/${name}.object`
    };
  }
}
