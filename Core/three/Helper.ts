import { THREE } from '@/Core/lib/THREE'

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
    
    public static freeGPU(asset: any) {

        if (!asset) return

        // Object tree
        if (asset instanceof THREE.Object3D) {

            asset.traverse((child: any) => {
                this.disposeAsset(child.geometry)
                if (child.material) {

                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => this.disposeAsset(m))
                    } else {
                        this.disposeAsset(child.material)
                    }
                }
            })

            return
        }

        // Geometry
        if (asset instanceof THREE.BufferGeometry) {
            asset.dispose()
            return
        }

        // Material (+ embedded textures)
        if (asset instanceof THREE.Material) {

            for (const key in asset) {
                const value = (asset as any)[key]
                if (value instanceof THREE.Texture) {
                    value.dispose()
                }
            }

            asset.dispose()
            return
        }

        // Texture
        if (asset instanceof THREE.Texture) {
            asset.dispose()
        }
    }
}
