import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import type {AssetImporter,ImportContext,ImportResult} from './types'
import fs from '@/Core/lib/fs';
import {BinarySerializer} from "@/Core/Plugins/Three.patch.plugin";

export class GLTFImporter implements AssetImporter {
  extensions = ['gltf', 'glb'];

  async import(file: File, ctx: ImportContext): Promise<ImportResult> {
    const url = URL.createObjectURL(file);
    const loader = new GLTFLoader();

    const gltf = await loader.loadAsync(url);
    URL.revokeObjectURL(url);
    const root = gltf.scene;
    console.log(gltf)
    gltf.scene.animations = gltf.animations;
    root.name ||= file.name.replace(/\.(gltf|glb)$/, '');
    const name = file.name.replace(/\.(gltf|glb)$/, '');

    const polyObject = root;

    const uuid = polyObject.uuid;
    const assetDir = `${ctx.assetRoot}`;

    const bins = new BinarySerializer();
    await bins.save(polyObject,`${assetDir}/${name}.object.bin`,true)

    return {
      uuid,
      name: root.name,
      type: 'model',
      path: `/Game/files/Assets/${name}.object`
    };
  }
}