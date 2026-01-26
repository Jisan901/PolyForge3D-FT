import { THREE } from '@/Core/lib/THREE'

/**
 * Union type for supported Three.js runtime objects.
 */
export type AnyThree =
  | THREE.Object3D
  | THREE.Material
  | THREE.BufferGeometry
  | THREE.Texture


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
 * Actual disposal is handled elsewhere (MemoLoader / Scene cleanup).
 */
export class ThreeRegistry {

  /** All Object3D instances */
  private objects = new Map<string, THREE.Object3D>()

  /** Special flagged objects (userData.special === true) */
  private specialObjects = new Map<string, THREE.Object3D>()

  /** All materials */
  private materials = new Map<string, THREE.Material>()

  /** All geometries */
  private geometries = new Map<string, THREE.BufferGeometry>()

  /** All textures */
  private textures = new Map<string, THREE.Texture>()
  
  
  constructor(private onRegister:(a:AnyThree)=>boolean, private onUnregister:(a:AnyThree)=>boolean){}
  
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

    if (!item) return item
    if ( !this.onRegister(item) ) return;
    // -----------------
    // Object3D
    // -----------------

    if (item instanceof THREE.Object3D) {

      this.objects.set(item.uuid, item)

      if (item.userData?.special) {
        this.specialObjects.set(item.uuid, item)
      }

      // Geometry
      const geometry = (item as any).geometry
      if (geometry) this.register(geometry)

      // Material(s)
      const material = (item as any).material

      if (Array.isArray(material)) {
        material.forEach(m => this.register(m))
      } else if (material) {
        this.register(material)
      }

      // Children traversal
      if (traverse) {
        item.traverse(child => {
          if (child !== item) {
            this.register(child)
          }
        })
      }

      return item
    }

    // -----------------
    // Material
    // -----------------

    if (item instanceof THREE.Material) {

      this.materials.set(item.uuid, item)

      // Track textures referenced by material
      for (const key in item) {
        const value = (item as any)[key]
        if (value instanceof THREE.Texture) {
          this.register(value)
        }
      }

      return item
    }

    // -----------------
    // Geometry
    // -----------------

    if (item instanceof THREE.BufferGeometry) {

      this.geometries.set(item.uuid, item)
      return item
    }

    // -----------------
    // Texture
    // -----------------

    if (item instanceof THREE.Texture) {

      this.textures.set(item.uuid, item)
      return item
    }

    return item
  }

  // =====================================================
  // UNREGISTER
  // =====================================================

  /**
   * Remove an item from registry.
   *
   * Does NOT dispose GPU memory.
   *
   * @param item Three.js instance
   */
  unregister(item: AnyThree) {

    if (!item) return
    if (!this.onUnregister(item)) return;
    
    this.objects.delete(item.uuid)
    this.specialObjects.delete(item.uuid)
    this.materials.delete(item.uuid)
    this.geometries.delete(item.uuid)
    this.textures.delete(item.uuid)
  }

  /**
   * Remove everything belonging to an Object3D tree.
   *
   * @param root Root object
   */
  unregisterTree(root: THREE.Object3D) {

    root.traverse(obj => {

      this.unregister(obj)

      const geo = (obj as any).geometry
      if (geo) this.unregister(geo)

      const mat = (obj as any).material
      if (Array.isArray(mat)) {
        mat.forEach(m => this.unregister(m))
      } else if (mat) {
        this.unregister(mat)
      }

    })
  }

  // =====================================================
  // LOOKUPS
  // =====================================================

  /**
   * Get Object3D by UUID.
   */
  getObject(uuid: string) {
    return this.objects.get(uuid)
  }

  /**
   * Get Material by UUID.
   */
  getMaterial(uuid: string) {
    return this.materials.get(uuid)
  }

  /**
   * Get Geometry by UUID.
   */
  getGeometry(uuid: string) {
    return this.geometries.get(uuid)
  }

  /**
   * Get Texture by UUID.
   */
  getTexture(uuid: string) {
    return this.textures.get(uuid)
  }

  /**
   * Get all special tagged objects.
   */
  getSpecialObjects() {
    return [...this.specialObjects.values()]
  }

  // =====================================================
  // DEBUG / UTILITIES
  // =====================================================

  /**
   * Get registry statistics.
   */
  getStats() {
    return {
      objects: this.objects.size,
      specialObjects: this.specialObjects.size,
      materials: this.materials.size,
      geometries: this.geometries.size,
      textures: this.textures.size
    }
  }

  /**
   * Clear registry references.
   *
   * WARNING:
   * Does NOT dispose GPU memory.
   */
  clear() {

    this.objects.clear()
    this.specialObjects.clear()
    this.materials.clear()
    this.geometries.clear()
    this.textures.clear()
  }
}



import {getComponent, isSpacial} from "@/Core/Functions"
import {Components} from "@/Core/Types/Components";

export const registerHandler = (e:AnyThree, app)=>{
    if (isSpacial(e)){
        let script = getComponent(Components.SCRIPT, e)
        if (!script) return true;
        const path = script.data.path.value;
        if (!path) return true;
        
        app.loaders
        
        
    }
    return true;
}
export const unregisterHandler = (e:AnyThree, app)=>{
    if (isSpacial(e)){
        let script = getComponent(Components.SCRIPT, e)
    }
    return true;
}