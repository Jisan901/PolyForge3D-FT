import { Components } from "@/Core/Types/Components";
import { THREE } from '@/Core/lib/THREE';
import { Instance } from "@/Core/PolyForge";
import type { Entity } from '@/Core/ECS/Entity';
import type { Component, ComponentConstructor } from '@/Core/ECS/Component';
import type { ComponentDataMap } from './types';

// ---------------------------------------------------------------------------
// Component Access
// ---------------------------------------------------------------------------

export function getComponent<T extends Component>(
  ctor: ComponentConstructor<T>,
  target?: THREE.Object3D | Entity | null
): T | undefined;
export function getComponent<C extends keyof ComponentDataMap>(
  componentId: C,
  target?: THREE.Object3D | Entity | null
): ComponentDataMap[C] | undefined;
export function getComponent<T = unknown>(
  componentId: Components | number | string,
  target?: THREE.Object3D | Entity | null
): T | undefined;
export function getComponent(
  componentOrCtor: any,
  target?: THREE.Object3D | Entity | null
): any {
  if (!target) return undefined;

  const entity =
    typeof (target as any).getComponent === 'function'
      ? (target as Entity)
      : Instance.entityManager?.getEntity(target as THREE.Object3D);

  // If passed a Component constructor class
  if (typeof componentOrCtor === 'function' && entity) {
    return entity.getComponent(componentOrCtor);
  }

  // If entity is present and has ctor for nameCode
  if (typeof componentOrCtor === 'number' && entity) {
    const ctor = Instance.entityManager?.getCtorByNameCode(componentOrCtor);
    if (ctor) {
      const comp = entity.getComponent(ctor);
      if (comp) return comp;
    }
  }

  // Fallback to userData._ecs or legacy userData.components
  const obj = (target as any).isObject3D ? (target as any) : (target as any).object3d;
  const ecsComps = obj?.userData?._ecs?.components;
  if (Array.isArray(ecsComps)) {
    const keyStr = String(componentOrCtor).toLowerCase();
    const found = ecsComps.find(
      (c: any) =>
        String(c.nameCode) === keyStr ||
        c.type?.toLowerCase() === keyStr ||
        c.id === componentOrCtor
    );
    if (found?.data !== undefined) return found.data;
  }

  const comps = obj?.userData?.components;
  if (!comps) return undefined;

  if (comps[componentOrCtor]?.data !== undefined) {
    return comps[componentOrCtor].data;
  }

  // Check string key or nameCode match
  for (const k of Object.keys(comps)) {
    if (comps[k]?.key === componentOrCtor || comps[k]?.nameCode === componentOrCtor) {
      return comps[k].data;
    }
  }

  return undefined;
}

/**
 * Retrieve ALL attached components of a given type from an object or Entity.
 * Supports multiple component instances (e.g. multiple scripts or colliders).
 */
export function getComponents<T extends Component>(
  ctor: ComponentConstructor<T>,
  target?: THREE.Object3D | Entity | null
): T[];
export function getComponents<C extends keyof ComponentDataMap>(
  componentId: C,
  target?: THREE.Object3D | Entity | null
): ComponentDataMap[C][];
export function getComponents<T = unknown>(
  componentId: Components | number | string,
  target?: THREE.Object3D | Entity | null
): T[];
export function getComponents(
  componentOrCtor: any,
  target?: THREE.Object3D | Entity | null
): any[] {
  if (!target) return [];

  const entity =
    typeof (target as any).getComponents === 'function'
      ? (target as Entity)
      : Instance.entityManager?.getEntity(target as THREE.Object3D);

  // If passed a Component constructor class
  if (typeof componentOrCtor === 'function' && entity) {
    return entity.getComponents(componentOrCtor);
  }

  // If entity is present and has ctor for nameCode
  if (typeof componentOrCtor === 'number' && entity) {
    const ctor = Instance.entityManager?.getCtorByNameCode(componentOrCtor);
    if (ctor) {
      const list = entity.getComponents(ctor);
      if (list.length > 0) return list;
    }
  }

  // Search userData._ecs or legacy userData.components for all instances
  const obj = (target as any).isObject3D ? (target as any) : (target as any).object3d;
  const ecsComps = obj?.userData?._ecs?.components;
  if (Array.isArray(ecsComps)) {
    const keyStr = String(componentOrCtor).toLowerCase();
    const matches = ecsComps
      .filter(
        (c: any) =>
          String(c.nameCode) === keyStr ||
          c.type?.toLowerCase() === keyStr ||
          c.id === componentOrCtor
      )
      .map((c: any) => c.data);
    if (matches.length > 0) return matches;
  }

  const comps = obj?.userData?.components;
  if (!comps) return [];

  const keyStr = String(componentOrCtor);
  const results: any[] = [];

  for (const [k, v] of Object.entries(comps)) {
    const baseK = k.split('_')[0];
    if (
      baseK === keyStr ||
      (v as any)?.key === componentOrCtor ||
      (v as any)?.nameCode === componentOrCtor
    ) {
      if ((v as any)?.data !== undefined) {
        results.push((v as any).data);
      }
    }
  }

  return results;
}
