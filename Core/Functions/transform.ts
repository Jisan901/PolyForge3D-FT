import { THREE } from '@/Core/lib/THREE';
import type { Vector3Like, EulerLike, QuaternionLike } from './types';

// ---------------------------------------------------------------------------
// Transform Utilities
// ---------------------------------------------------------------------------

/**
 * Synchronize transform data to a Three.js Object3D
 * @param object3d - Three.js Object3D to update
 * @param p - Position {x, y, z}
 * @param r - Rotation quaternion {x, y, z, w}
 * @param s - Scale {x, y, z}
 */
export const syncEntityTransform = (
  object3d: THREE.Object3D,
  p?: Partial<Vector3Like> | null,
  r?: Partial<QuaternionLike> | null,
  s?: Partial<Vector3Like> | null
): void => {
  if (!object3d) return;

  // Update position
  if (p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number') {
    object3d.position.set(p.x, p.y, p.z);
  }

  // Update rotation (quaternion)
  if (
    r &&
    typeof r.x === 'number' &&
    typeof r.y === 'number' &&
    typeof r.z === 'number' &&
    typeof r.w === 'number'
  ) {
    object3d.quaternion.set(r.x, r.y, r.z, r.w);
  }

  // Update scale
  if (s && typeof s.x === 'number' && typeof s.y === 'number' && typeof s.z === 'number') {
    object3d.scale.set(s.x, s.y, s.z);
  }

  // Mark matrix as needing update
  object3d.updateMatrix();
};

export function resetTransform(obj: THREE.Object3D): void {
  if (!obj) return;
  obj.position.set(0, 0, 0);
  obj.quaternion.identity();
  obj.scale.set(1, 1, 1);
  obj.updateMatrixWorld(true);
}
