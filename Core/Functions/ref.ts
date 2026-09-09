import { THREE } from '@/Core/lib/THREE';
import { Instance } from "@/Core/PolyForge";
import type { RefInput } from './types';

/**
 * Internal helper to resolve string / number identifiers to a Three.js Object3D
 */
export function resolveByIdOrUuid(idOrUuid: string | number): THREE.Object3D | undefined {
  if (idOrUuid === undefined || idOrUuid === null || idOrUuid === '') return undefined;

  // 1. Check threeRegistry (fast cached map)
  const regObj = Instance.threeRegistry?.getObject(idOrUuid as any);
  if (regObj) return regObj;

  // 2. Check active scene
  const scene = Instance.sceneManager?.activeScene || (Instance.engine?.three as any)?.scene;
  if (scene) {
    if (typeof idOrUuid === 'number') {
      const byId = scene.getObjectById(idOrUuid);
      if (byId) return byId;
    }
    const byUuid = scene.getObjectByProperty('uuid', String(idOrUuid));
    if (byUuid) return byUuid;
    const byName = scene.getObjectByName(String(idOrUuid));
    if (byName) return byName;
  }

  // 3. Check entityManager
  if (Instance.entityManager && typeof idOrUuid === 'string') {
    const ent = Instance.entityManager.getEntity(idOrUuid);
    if (ent?.object3d) return ent.object3d;
  }

  return undefined;
}

/**
 * Resolve any reference input (Object3D, Entity, Component, UUID, Ref container) to a THREE.Object3D.
 */
export function getRef<T extends THREE.Object3D = THREE.Object3D>(
  ref?: RefInput<T>
): T | undefined {
  if (!ref) return undefined;

  // 1. Direct Three.js Object3D instance
  if (typeof ref === 'object' && ref !== null) {
    if ('isObject3D' in ref && (ref as any).isObject3D) {
      return ref as T;
    }

    // 2. ECS Entity instance (has .object3d)
    if ('object3d' in ref && (ref as any).object3d?.isObject3D) {
      return (ref as any).object3d as T;
    }

    // 3. ECS Component instance (has .entity?.object3d)
    if ('entity' in ref && (ref as any).entity?.object3d?.isObject3D) {
      return (ref as any).entity.object3d as T;
    }

    // 4. Ref containers: { isRef: true, ref: ... }, { ref: ... }, { uuid: ... }, { value: ... }, { target: ... }
    if ('ref' in ref && (ref as any).ref) {
      const inner = (ref as any).ref;
      if (typeof inner === 'object' && inner !== null && inner.isObject3D) return inner as T;
      if (typeof inner === 'string' || typeof inner === 'number') {
        const found = resolveByIdOrUuid(inner);
        if (found) return found as T;
      }
    }

    if ('uuid' in ref && typeof (ref as any).uuid === 'string') {
      const found = resolveByIdOrUuid((ref as any).uuid);
      if (found) return found as T;
    }

    if ('value' in ref && (ref as any).value) {
      const inner = (ref as any).value;
      if (typeof inner === 'object' && inner !== null && inner.isObject3D) return inner as T;
      if (typeof inner === 'string' || typeof inner === 'number') {
        const found = resolveByIdOrUuid(inner);
        if (found) return found as T;
      }
    }

    if ('target' in ref && (ref as any).target) {
      const inner = (ref as any).target;
      if (typeof inner === 'object' && inner !== null && inner.isObject3D) return inner as T;
      if (typeof inner === 'string' || typeof inner === 'number') {
        const found = resolveByIdOrUuid(inner);
        if (found) return found as T;
      }
    }
  }

  // 5. String UUID, ID, or object name
  if (typeof ref === 'string') {
    return resolveByIdOrUuid(ref) as T | undefined;
  }

  // 6. Numeric Three.js Object ID
  if (typeof ref === 'number') {
    return resolveByIdOrUuid(ref) as T | undefined;
  }

  return undefined;
}
