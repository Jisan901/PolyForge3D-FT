import { THREE } from '@/Core/lib/THREE';
import { Instance } from "@/Core/PolyForge";
import { ThreeHelpers } from '@/Core/three/Helper';
import type { Entity } from '@/Core/ECS/Entity';
import type { EntityRef } from './types';
import { getRef } from './ref';

// ---------------------------------------------------------------------------
// Object Instantiation & Lifecycle
// ---------------------------------------------------------------------------

export async function instantiate<T extends THREE.Object3D = THREE.Object3D>(
  url: string,
  transform?: THREE.Matrix4
): Promise<T> {
  const object = await Instance.loaders.objectLoader.loadObject(url);

  if (transform && object) {
    object.applyMatrix4(transform);
    object.updateMatrixWorld(true);
  }

  if (object) {
    Instance.sceneManager.activeScene.add(object);
    Instance.threeRegistry.register(object);
  }

  return object as T;
}

export function destroy(
  target?: THREE.Object3D | Entity | EntityRef | string | number | null,
  gpuCleanup = true
): boolean {
  if (!target) return false;

  const object =
    typeof target === "string" || typeof target === "number" || (typeof target === "object" && !(target instanceof THREE.Object3D))
      ? getRef(target)
      : target;

  if (!(object instanceof THREE.Object3D)) {
    return false;
  }

  object.removeFromParent();
  Instance.threeRegistry?.unregisterTree(object);
  Instance.entityManager?.removeEntity(object);

  if (gpuCleanup) {
    ThreeHelpers.freeGPU(object);
  }

  return true;
}
