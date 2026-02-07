// game/scripts/LOD.ts
import { Behavior } from "@/Core/Behavior";
import { Instance } from "@/Core/PolyForge";
import { getCamera, getRef, getComponent, syncEntityTransform } from "@/Core/Functions";
import { Components } from "@/Core/Types/Components";
import { THREE } from '@/Core/lib/THREE';
import { INumber, IRef } from '@/Editor/ITypes';


import { DLOD } from '@/PolyModule/DLOD.js'; // your class


export default class LOD extends Behavior {

  private dlod: DLOD | null = null;

  onStart() {
    const lodComponent = getComponent(Components.LOD, this.object);
    if (!lodComponent) return;

    const camera = getCamera();
    if (!camera) {
      console.warn('LOD: No active camera');
      return;
    }

    // Build runtime DLOD (NO serialization)
    const dlod = new DLOD(Instance.loaders.objectLoader);
    dlod.autoUpdate = false; // we control updates

    // Use runtime loader
    //dlod.loader = this.ctx.loader;

    // Convert component levels → DLOD levels
    const levels = lodComponent;

    Object.values(levels).forEach((level: any) => {
      if (typeof level==='object' && level!== null){
          if (!level?.file?.value) return;
          dlod.addLevel(level.file.value, level.distance, 0);
      }
    });

    // Attach
    this.object.add(dlod);

    this.dlod = dlod;

    // Initial update
    dlod.update(camera);

    console.log('LOD runtime initialized', dlod);
  }

  onUpdate(dt: number) {
    if (!this.dlod) return;

    const camera = getCamera();
    if (!camera) return;

    this.dlod.update(camera);
  }

  onDestroy() {
    if (!this.dlod) return;

    this.object.remove(this.dlod);
    this.dlod = null;
  }
}
