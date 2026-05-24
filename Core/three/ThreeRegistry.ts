// import { THREE } from "@/Core/lib/THREE";

// /**
//  * Union type for supported Three.js runtime objects.
//  */
// export type AnyThree =
//     | THREE.Object3D
//     | THREE.Material
//     | THREE.BufferGeometry
//     | THREE.Texture;

// /**
//  * Runtime registry for tracking Three.js objects.
//  *
//  * Purpose:
//  * - Central lookup by UUID
//  * - Debugging & editor tooling
//  * - Scene graph inspection
//  * - Safe cleanup tracking
//  * - Special object tagging
//  *
//  * NOTE:
//  * This registry does NOT own memory.
//  * It only tracks references.
//  * Actual disposal is handled elsewhere (Scene cleanup).
//  */
// export class ThreeRegistry {
//     /** All Object3D instances */
//     private objects = new Map<string, THREE.Object3D>();

//     /** Special flagged objects (userData.special === true) */
//     private specialObjects = new Map<string, THREE.Object3D>();

//     /** All materials */
//     private materials = new Map<string, THREE.Material>();

//     /** All geometries */
//     private geometries = new Map<string, THREE.BufferGeometry>();

//     /** All textures */
//     private textures = new Map<string, THREE.Texture>();

//     constructor(
//         private onRegister: (a: AnyThree) => boolean,
//         private onUnregister: (a: AnyThree) => boolean
//     ) {}

//     // =====================================================
//     // REGISTRATION
//     // =====================================================

//     /**
//      * Register a Three.js object into the registry.
//      *
//      * Automatically registers:
//      * - child objects (optional)
//      * - attached geometry
//      * - attached materials
//      * - material textures
//      *
//      * @param item Three.js instance
//      * @param traverse Recursively register children (Object3D only)
//      *
//      * @returns Same item for chaining
//      */
//     register(item: AnyThree, traverse = false): AnyThree {
//         if (!item) return item;
//         // FIX: was missing `return item` — returned undefined instead of item
//         if (!this.onRegister(item)) return item;

//         // -----------------
//         // Object3D
//         // -----------------

//         if (item instanceof THREE.Object3D) {
//             this.objects.set(item.uuid, item);

//             if (item.userData?.special) {
//                 this.specialObjects.set(item.uuid, item);
//             }

//             // Geometry
//             const geometry = (item as any).geometry;
//             if (geometry) this.register(geometry);

//             // Material(s)
//             const material = (item as any).material;

//             if (Array.isArray(material)) {
//                 material.forEach(m => this.register(m));
//             } else if (material) {
//                 this.register(material);
//             }

//             // Children traversal
//             if (traverse) {
//                 item.traverse(child => {
//                     if (child !== item) this.register(child);
//                 });
//             }

//             return item;
//         }

//         // -----------------
//         // Material
//         // -----------------

//         if (item instanceof THREE.Material) {
//             if (this.materials.has(item.uuid)) {
//                 item.userData.uses++;
//             } else {
//                 this.materials.set(item.uuid, item);
//                 item.userData.uses = 1;
//             }

//             // Track textures referenced by material
//             for (const key in item) {
//                 const value = (item as any)[key];
//                 if (value instanceof THREE.Texture) {
//                     this.register(value);
//                 }
//             }

//             return item;
//         }

//         // -----------------
//         // Geometry
//         // -----------------

//         if (item instanceof THREE.BufferGeometry) {
//             if (this.geometries.has(item.uuid)) {
//                 item.userData.uses++;
//             } else {
//                 this.geometries.set(item.uuid, item);
//                 item.userData.uses = 1;
//             }

//             return item;
//         }

//         // -----------------
//         // Texture
//         // -----------------

//         if (item instanceof THREE.Texture) {
//             // FIX: added ref-counting to match material/geometry pattern,
//             // preventing premature removal of shared textures
//             if (this.textures.has(item.uuid)) {
//                 item.userData.uses++;
//             } else {
//                 this.textures.set(item.uuid, item);
//                 item.userData.uses = 1;
//             }

//             return item;
//         }

//         return item;
//     }

//     // =====================================================
//     // UNREGISTER
//     // =====================================================

//     /**
//      * Remove an item from registry.
//      *
//      * Does NOT dispose GPU memory.
//      *
//      * @param item Three.js instance
//      */
//     unregister(item: AnyThree) {
//         if (!item) return;
//         if (!this.onUnregister(item)) return;

//         // -----------------
//         // Object3D
//         // -----------------

//         if (item instanceof THREE.Object3D) {
//             // FIX: must delete from both maps independently —
//             // an object can exist in objects but not specialObjects and vice versa
//             this.objects.delete(item.uuid);
//             this.specialObjects.delete(item.uuid);
//             return;
//         }

//         // -----------------
//         // Material
//         // -----------------

//         const mat = this.materials.get(item.uuid);
//         if (mat) {
//             if (mat.userData.uses > 1) {
//                 mat.userData.uses--;
//                 return;
//             }

//             this.materials.delete(mat.uuid);

//             for (const key in mat) {
//                 const value = (mat as any)[key];
//                 if (value instanceof THREE.Texture) {
//                     this.unregister(value);
//                 }
//             }

//             return;
//         }

//         // -----------------
//         // Geometry
//         // -----------------

//         const geo = this.geometries.get(item.uuid);
//         if (geo) {
//             if (geo.userData.uses > 1) {
//                 geo.userData.uses--;
//             } else {
//                 this.geometries.delete(geo.uuid);
//             }
//             return;
//         }

//         // -----------------
//         // Texture
//         // -----------------

//         // FIX: respect ref-count instead of always deleting
//         const tex = this.textures.get(item.uuid);
//         if (tex) {
//             if (tex.userData.uses > 1) {
//                 tex.userData.uses--;
//             } else {
//                 this.textures.delete(tex.uuid);
//             }
//         }
//     }

//     /**
//      * Remove everything belonging to an Object3D tree.
//      *
//      * @param root Root object
//      */
//     unregisterTree(root: THREE.Object3D) {
//         root.traverse(obj => {
//             this.unregister(obj);

//             const geo = (obj as any).geometry;
//             if (geo) this.unregister(geo);

//             const mat = (obj as any).material;
//             if (Array.isArray(mat)) {
//                 mat.forEach(m => this.unregister(m));
//             } else if (mat) {
//                 this.unregister(mat);
//             }
//         });
//     }

//     // =====================================================
//     // LOOKUPS
//     // =====================================================

//     /** Get Object3D by UUID. */
//     getObject(uuid: string) {
//         return this.objects.get(uuid);
//     }

//     /** Get Material by UUID. */
//     getMaterial(uuid: string) {
//         return this.materials.get(uuid);
//     }

//     /** Get Geometry by UUID. */
//     getGeometry(uuid: string) {
//         return this.geometries.get(uuid);
//     }

//     /** Get Texture by UUID. */
//     getTexture(uuid: string) {
//         return this.textures.get(uuid);
//     }

//     /** Get all special tagged objects. */
//     getSpecialObjects() {
//         return [...this.specialObjects.values()];
//     }

//     // =====================================================
//     // DEBUG / UTILITIES
//     // =====================================================

//     /** Get registry statistics. */
//     getStats() {
//         return {
//             objects: this.objects.size,
//             specialObjects: this.specialObjects.size,
//             materials: this.materials.size,
//             geometries: this.geometries.size,
//             textures: this.textures.size
//         };
//     }

//     /**
//      * Clear registry references.
//      *
//      * WARNING: Does NOT dispose GPU memory.
//      */
//     clear() {
//         this.objects.clear();
//         this.specialObjects.clear();
//         this.materials.clear();
//         this.geometries.clear();
//         this.textures.clear();
//     }
// }



import { THREE } from "@/Core/lib/THREE";

/**
 * Union type for supported Three.js runtime objects.
 */
export type AnyThree =
    | THREE.Object3D
    | THREE.Material
    | THREE.BufferGeometry
    | THREE.Texture;

/**
 * Runtime registry for tracking Three.js objects.
 *
 * Purpose:
 * - Central lookup by UUID
 * - Debugging & editor tooling
 * - Scene graph inspection
 * - Safe cleanup tracking
 * - Special object tagging
 *
 * NOTE:
 * This registry does NOT own memory.
 * It only tracks references.
 */
export class ThreeRegistry {
    /** All Object3D instances */
    private objects = new Map<string, THREE.Object3D>();

    /** Special flagged objects (userData.special === true) */
    private specialObjects = new Map<string, THREE.Object3D>();

    /** All materials */
    private materials = new Map<string, THREE.Material>();

    /** All geometries */
    private geometries = new Map<string, THREE.BufferGeometry>();

    /** All textures */
    private textures = new Map<string, THREE.Texture>();

    constructor(
        private onRegister: (a: AnyThree) => boolean,
        private onUnregister: (a: AnyThree) => boolean
    ) {}

    // =====================================================
    // REGISTRATION
    // =====================================================

    /**
     * Register a Three.js object into the registry.
     *
     * Automatically registers:
     * - child objects (optional)
     * - attached geometry
     * - attached materials
     * - material textures
     *
     * @param item Three.js instance
     * @param traverse Recursively register children (Object3D only)
     *
     * @returns Same item for chaining
     */
    register(item: AnyThree, traverse = false): AnyThree {
        if (!item) return item;
        if (!this.onRegister(item)) return item;

        // -----------------
        // Object3D
        // -----------------
        if (item instanceof THREE.Object3D) {
            // FIX: Prevent double-registration leaks
            if (this.objects.has(item.uuid)) return item;

            this.objects.set(item.uuid, item);

            if (item.userData?.special) {
                this.specialObjects.set(item.uuid, item);
            }

            // Geometry
            const geometry = (item as any).geometry;
            if (geometry) this.register(geometry);

            // Material(s)
            const material = (item as any).material;
            if (Array.isArray(material)) {
                material.forEach(m => this.register(m));
            } else if (material) {
                this.register(material);
            }

            // Children traversal
            if (traverse) {
                for (const child of item.children) {
                    this.register(child, true);
                }
            }

            return item;
        }

        // -----------------
        // Material
        // -----------------
        if (item instanceof THREE.Material) {
            const existing = this.materials.get(item.uuid);
            if (existing) {
                existing.userData.uses = (existing.userData.uses || 0) + 1;
            } else {
                this.materials.set(item.uuid, item);
                item.userData.uses = 1;

                // FIX: Only track textures on the FIRST registration to prevent 
                // exponential ref-count inflation
                for (const key in item) {
                    const value = (item as any)[key];
                    if (value instanceof THREE.Texture) {
                        this.register(value);
                    }
                }
            }
            return item;
        }

        // -----------------
        // Geometry
        // -----------------
        if (item instanceof THREE.BufferGeometry) {
            const existing = this.geometries.get(item.uuid);
            if (existing) {
                existing.userData.uses = (existing.userData.uses || 0) + 1;
            } else {
                this.geometries.set(item.uuid, item);
                item.userData.uses = 1;
            }
            return item;
        }

        // -----------------
        // Texture
        // -----------------
        if (item instanceof THREE.Texture) {
            const existing = this.textures.get(item.uuid);
            if (existing) {
                existing.userData.uses = (existing.userData.uses || 0) + 1;
            } else {
                this.textures.set(item.uuid, item);
                item.userData.uses = 1;
            }
            return item;
        }

        return item;
    }

    // =====================================================
    // UNREGISTER
    // =====================================================

    /**
     * Remove an item from registry.
     * Automatically unregisters attached materials/geometry for Object3Ds.
     *
     * @param item Three.js instance
     * @param traverse Recursively unregister children (Object3D only)
     */
    unregister(item: AnyThree, traverse = false) {
        if (!item) return;
        if (!this.onUnregister(item)) return;

        // -----------------
        // Object3D
        // -----------------
        if (item instanceof THREE.Object3D) {
            // Prevent unregistering something that isn't here
            if (!this.objects.has(item.uuid)) return;

            this.objects.delete(item.uuid);
            this.specialObjects.delete(item.uuid);

            // FIX: Symmetry! We must automatically unregister the geometry 
            // and materials that were auto-registered.
            const geometry = (item as any).geometry;
            if (geometry) this.unregister(geometry);

            const material = (item as any).material;
            if (Array.isArray(material)) {
                material.forEach(m => this.unregister(m));
            } else if (material) {
                this.unregister(material);
            }

            // Children traversal
            if (traverse) {
                for (const child of item.children) {
                    this.unregister(child, true);
                }
            }
            return;
        }

        // -----------------
        // Material
        // -----------------
        if (item instanceof THREE.Material) {
            const mat = this.materials.get(item.uuid);
            if (!mat) return;

            mat.userData.uses--;
            
            if (mat.userData.uses <= 0) {
                this.materials.delete(mat.uuid);

                // FIX: Only unregister textures when the material is fully removed
                for (const key in mat) {
                    const value = (mat as any)[key];
                    if (value instanceof THREE.Texture) {
                        this.unregister(value);
                    }
                }
            }
            return;
        }

        // -----------------
        // Geometry
        // -----------------
        if (item instanceof THREE.BufferGeometry) {
            const geo = this.geometries.get(item.uuid);
            if (!geo) return;

            geo.userData.uses--;
            
            if (geo.userData.uses <= 0) {
                this.geometries.delete(geo.uuid);
            }
            return;
        }

        // -----------------
        // Texture
        // -----------------
        if (item instanceof THREE.Texture) {
            const tex = this.textures.get(item.uuid);
            if (!tex) return;

            tex.userData.uses--;
            
            if (tex.userData.uses <= 0) {
                this.textures.delete(tex.uuid);
            }
            return;
        }
    }

    /**
     * Remove everything belonging to an Object3D tree.
     * @param root Root object
     */
    unregisterTree(root: THREE.Object3D) {
        // FIX: Now we can just use the unified unregister logic with `traverse = true`
        this.unregister(root, true);
    }

    // =====================================================
    // LOOKUPS & UTILS
    // =====================================================

    getObject(uuid: string) { return this.objects.get(uuid); }
    getMaterial(uuid: string) { return this.materials.get(uuid); }
    getGeometry(uuid: string) { return this.geometries.get(uuid); }
    getTexture(uuid: string) { return this.textures.get(uuid); }
    getSpecialObjects() { return [...this.specialObjects.values()]; }

    getStats() {
        return {
            objects: this.objects.size,
            specialObjects: this.specialObjects.size,
            materials: this.materials.size,
            geometries: this.geometries.size,
            textures: this.textures.size
        };
    }

    clear() {
        this.objects.clear();
        this.specialObjects.clear();
        this.materials.clear();
        this.geometries.clear();
        this.textures.clear();
    }
}