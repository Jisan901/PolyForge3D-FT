import { THREE } from '@/Core/lib/THREE'


class DisposeQueue {
  queue = [];
  budget = 5; // objects per frame

  add(resource: any) {
    this.queue.push(resource);
  }

  update() {
    for (let i = 0; i < this.budget; i++) {
      const r = this.queue.shift();
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
    
    public static freeGPU(asset: any) {

        if (!asset) return

        // Object tree
        if (asset instanceof THREE.Object3D) {

            asset.traverse((child: any) => {
                ThreeHelpers.freeGPU(child.geometry)
                if (child.material) {

                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => ThreeHelpers.freeGPU(m))
                    } else {
                        ThreeHelpers.freeGPU(child.material)
                    }
                }
            })

            return
        }

        // Geometry
        if (asset instanceof THREE.BufferGeometry) {
            ThreeHelpers.disposeQueue.add(asset);
            return
        }

        // Material (+ embedded textures)
        if (asset instanceof THREE.Material) {

            for (const key in asset) {
                const value = (asset as any)[key]
                if (value instanceof THREE.Texture) {
                    ThreeHelpers.disposeQueue.add(value);
                }
            }

            ThreeHelpers.disposeQueue.add(asset);
            return
        }

        // Texture
        if (asset instanceof THREE.Texture) {
            ThreeHelpers.disposeQueue.add(asset);
        }
    }
}
