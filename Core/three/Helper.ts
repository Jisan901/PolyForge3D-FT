import { THREE } from '@/Core/lib/THREE'


class DisposeQueue {
  queue = [];
  budget = Infinity; // objects per frame

  add(resource: any) {
    this.queue.push(resource);
  }

  update() {
    for (let i = 0; i < this.budget; i++) {
      const r = this.queue.shift();
      //console.log(r,'disposal ')
      //console.trace('disposal')
      if (!r) break;
      r.dispose();
    }
  }
}



export class ThreeHelpers {
    /**
     * Recursively frees GPU memory for any Three.js object
     * @param asset Any Three.js Object3D (Mesh, Line, Points, etc.)
     * Supports:
     * - Object3D
     * - Geometry
     * - Material
     * - Texture
     */
    
    /**
    * name
    */
    public static disposeQueue = new DisposeQueue();
    
    public static freeGPU(asset: any, force = false) {
    if (!asset) return

    // -----------------
    // Object3D tree
    // -----------------
    if (asset instanceof THREE.Object3D) {
        asset.traverse((child: any) => {
            if (child.geometry) {
                ThreeHelpers.freeGPU(child.geometry, force)
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((m: THREE.Material) => ThreeHelpers.freeGPU(m, force))
                } else {
                    ThreeHelpers.freeGPU(child.material, force)
                }
            }
        })
        return
    }

    // -----------------
    // Geometry
    // -----------------
    if (asset instanceof THREE.BufferGeometry) {
        if (!force && asset.userData.uses > 0) return
        ThreeHelpers.disposeQueue.add(asset)
        return
    }

    // -----------------
    // Material (+ embedded textures)
    // -----------------
    if (asset instanceof THREE.Material) {
        if (!force && asset.userData.uses > 0) return
        for (const key in asset) {
            const value = (asset as any)[key]
            if (value instanceof THREE.Texture) {
                ThreeHelpers.freeGPU(value, force)
            }
        }
        ThreeHelpers.disposeQueue.add(asset)
        return
    }

    // -----------------
    // Texture
    // -----------------
    if (asset instanceof THREE.Texture) {
        if (!force && asset.userData.uses > 0) return
        ThreeHelpers.disposeQueue.add(asset)
    }
}
}
