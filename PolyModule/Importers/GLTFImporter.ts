import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import type {AssetImporter,ImportContext,ImportResult} from './types'
import fs from "vite-plugin-fs/browser";


export class GLTFImporter implements AssetImporter {
  extensions = ['gltf', 'glb'];

  async import(file: File, ctx: ImportContext): Promise<ImportResult> {
    const url = URL.createObjectURL(file);
    const loader = new GLTFLoader();

    const gltf = await loader.loadAsync(url);
    URL.revokeObjectURL(url);

    const root = gltf.scene;
    root.name ||= file.name.replace(/\.(gltf|glb)$/, '');
    const name = file.name.replace(/\.(gltf|glb)$/, '');

    const polyObject = root;

    const uuid = polyObject.uuid;
    const assetDir = `${ctx.assetRoot}`;


    await fs.writeFile(
      `${assetDir}/${name}.object`,
      JSON.stringify(polyObject.toJSON(), null, 2)
    );

    return {
      uuid,
      name: root.name,
      type: 'model',
      path: `/Game/files/Assets/${name}.object`
    };
  }
}