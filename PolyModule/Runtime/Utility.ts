export enum Components {
  TRANSFORM      = 1,
  CAMERA         = 2,
  MESH_RENDERER  = 3,
  LIGHT          = 4,
  RIGIDBODY      = 5,
  COLLIDER       = 6,
  SCRIPT         = 7,
  ANIMATION      = 8,
  AUDIO          = 9,
  UI_ELEMENT     = 10,
  LOD            = 11
}


export function getEntities(ctx){
    if (!ctx?.isSystem) {
        console.warn('call getEntities inside system method. otherwise it won\'t work',ctx);
        return []
    }
    return Array.from(ctx?.app?.threeRegistry?.specialObjects?.values?.()||[])
}
export const getComponent = (componentId:Components, object:any):unknown=>{
    return object?.userData?.components?.[componentId]?.data
}

import * as THREE from 'three';

/**
 * Synchronize transform data to a Three.js Object3D
 * @param object3d - Three.js Object3D to update
 * @param p - Position {x, y, z}
 * @param r - Rotation quaternion {x, y, z, w}
 * @param s - Scale {x, y, z}
 */
export const syncEntityTransform = (
  object3d: THREE.Object3D,
  p: { x: number; y: number; z: number },
  r: { x: number; y: number; z: number; w: number },
  s: { x: number; y: number; z: number }
) => {
  // Update position
  if (p) {
    object3d.position.set(p.x, p.y, p.z);
  }
  
  // Update rotation (quaternion)
  if (r) {
    object3d.quaternion.set(r.x, r.y, r.z, r.w);
  }
  
  // Update scale
  if (s) {
    object3d.scale.set(s.x, s.y, s.z);
  }
  
  // Mark matrix as needing update
  object3d.updateMatrix();
};