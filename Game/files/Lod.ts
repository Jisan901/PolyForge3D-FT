// game/scripts/LOD.ts
import { Behavior } from '@/PolyModule/Runtime/Behavior';
import { getComponent, Components, syncEntityTransform } from '@/PolyModule/Runtime/Utility';
import { DLOD } from '@/PolyModule/DLOD.js'; // your class
import * as THREE from 'three';

export default class LOD extends Behavior {

  private dlod: DLOD | null = null;

  onStart() {
    const lodComponent = getComponent(Components.LOD, this.object);
    if (!lodComponent) return;

    const camera = this.ctx.getActiveCamera();
    if (!camera) {
      console.warn('LOD: No active camera');
      return;
    }

    // Build runtime DLOD (NO serialization)
    const dlod = new DLOD();
    dlod.autoUpdate = false; // we control updates

    // Use runtime loader
    dlod.loader = this.ctx.loader;

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

    const camera = this.ctx.getActiveCamera();
    if (!camera) return;

    this.dlod.update(camera);
  }

  onDestroy() {
    if (!this.dlod) return;

    this.object.remove(this.dlod);
    this.dlod = null;
  }
}
