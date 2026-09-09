import { Components } from "@/Core/Types/Components";
import { THREE } from '@/Core/lib/THREE';
import { Instance } from "@/Core/PolyForge";
import type { Entity } from '@/Core/ECS/Entity';
import type { ComponentConstructor } from '@/Core/ECS/Component';
import type { RefInput } from './types';
import { getRef } from './ref';

// ---------------------------------------------------------------------------
// Querying & Scene Hierarchy
// ---------------------------------------------------------------------------

export const queryAll = (): THREE.Object3D[] => {
  return Instance.threeRegistry?.getSpecialObjects() || [];
};

export const queryCamera = (i: typeof Instance = Instance): THREE.Camera | undefined => {
  return (
    (i.sceneManager?.activeScene?.getObjectByProperty('isCamera', true) as THREE.Camera) ||
    i.engine?.getActiveCamera?.()
  );
};

export function getCamera(): THREE.Camera | undefined {
  return queryCamera(Instance);
}

export function getRenderer(): THREE.WebGPURenderer | undefined {
  return (Instance.engine?.three as any)?.renderer;
}

export const getEntity = (target?: THREE.Object3D | Entity | RefInput | string | null): Entity | undefined => {
  if (!target) return undefined;
  if (typeof (target as any).getComponent === 'function') {
    return target as Entity;
  }
  const obj = getRef(target as any);
  if (obj) {
    return Instance.entityManager?.getEntity(obj);
  }
  return Instance.entityManager?.getEntity(target as any);
};

export const getOrCreateEntity = (target?: THREE.Object3D | Entity | RefInput | string | null): Entity | undefined => {
  if (!target) return undefined;
  if (typeof (target as any).getComponent === 'function') {
    return target as Entity;
  }
  const obj = getRef(target as any);
  if (obj) {
    return Instance.entityManager?.getOrCreateEntity(obj);
  }
  return undefined;
};

export const queryEntities = (...components: (Components | number | ComponentConstructor)[]): Entity[] => {
  if (Instance.entityManager) {
    return Instance.entityManager.createQuery(components).entities;
  }
  return [];
};

export const getEntities = <T extends THREE.Object3D = THREE.Object3D>(
  ...components: Components[]
): T[] => {
  if (Instance.entityManager) {
    const query = Instance.entityManager.createQuery(components);
    if (query.entities.length > 0) {
      const out: T[] = new Array(query.entities.length);
      for (let i = 0; i < query.entities.length; i++) {
        out[i] = query.entities[i].object3d as T;
      }
      return out;
    }
  }

  // Fallback scan: auto-hydrates into entityManager for subsequent O(1) query access
  const result: T[] = [];
  const entities = queryAll();

  outer:
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    const entity = Instance.entityManager?.getEntity(e as THREE.Object3D);
    if (entity) {
      let matches = true;
      for (let j = 0; j < components.length; j++) {
        const ctor = Instance.entityManager?.getCtorByNameCode(components[j]);
        if (ctor ? !entity.hasComponent(ctor) : true) {
          matches = false;
          break;
        }
      }
      if (matches) {
        result.push(e as T);
        continue outer;
      }
    }

    const ecsComps = (e as any).userData?._ecs?.components;
    if (Array.isArray(ecsComps)) {
      let matches = true;
      for (let j = 0; j < components.length; j++) {
        const cId = String(components[j]);
        const has = ecsComps.some((c: any) => String(c.nameCode) === cId || c.type?.toLowerCase() === cId.toLowerCase());
        if (!has) {
          matches = false;
          break;
        }
      }
      if (matches) {
        if (Instance.entityManager) {
          Instance.entityManager.getOrCreateEntity(e);
        }
        result.push(e as T);
        continue outer;
      }
    }

    const comps = (e as any).userData?.components;
    if (!comps) continue;

    for (let j = 0; j < components.length; j++) {
      if (!comps[components[j]]) {
        continue outer;
      }
    }

    if (Instance.entityManager) {
      Instance.entityManager.getOrCreateEntity(e);
    }

    result.push(e as T);
  }

  return result;
};

export const isSpacial = (e: unknown): e is THREE.Object3D => {
  return Boolean(
    e &&
    typeof e === 'object' &&
    'isObject3D' in e &&
    Boolean((e as any).isObject3D) &&
    (e as any).userData?.special
  );
};

export const isSpecial = isSpacial;
