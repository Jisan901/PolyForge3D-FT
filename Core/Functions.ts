import {Components} from "@/Core/Types/Components";
import { THREE } from '@/Core/lib/THREE';
import { Instance } from "@/Core/PolyForge";
import { ThreeHelpers } from '@/Core/three/Helper';

export const getComponent = (componentId:Components, object:THREE.Object3D):unknown=>{
    return object?.userData?.components?.[componentId]?.data
}

export const getRef = (ref: {isRef: boolean, ref: string}) => {
    if (ref && ref?.isRef && ref?.ref) return Instance.threeRegistry.getObject(ref.ref);
}

export const getScript = (id: string)=>{
    return Instance.scriptExecutor.getScript(id);
}


// *** object instance

export async function instantiate(
    url: string,
    transform?: THREE.Matrix4
): Promise<THREE.Object3D> {
    const object = await Instance.loaders.loadObject(url, false);

    if (transform) {
        object.applyMatrix4(transform);
        object.updateMatrixWorld(true);
    }

    Instance.sceneManager.activeScene.add(object);
    Instance.threeRegistry.register(object);

    return object;
}

export function destroy(
    target: THREE.Object3D | string,
    gpuCleanup = true
): boolean {
    const object =
        typeof target === "string"
            ? getRef({ isRef: true, ref: target })
            : target;

    if (!(object instanceof THREE.Object3D)) {
        return false;
    }

    object.removeFromParent();

    Instance.threeRegistry.unregisterTree(object);

    if (gpuCleanup) {
        ThreeHelpers.freeGPU(object);
    }

    return true;
}



export const queryAll = ()=>{
    return Instance.threeRegistry.getSpecialObjects();
}

export const queryCamera = (i: typeof Instance) => {
    return i.sceneManager.activeScene.getObjectByProperty('isCamera', true) as THREE.Camera || Instance.engine.getActiveCamera();
}


export const getEntities = (...components: Components[]): THREE.Object3D[] => {
  const result: THREE.Object3D[] = [];
  const entities = queryAll();

  outer:
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    const comps = e.userData?.components;

    if (!comps) continue;

    for (let j = 0; j < components.length; j++) {
      if (!comps[components[j]]) {
        continue outer;
      }
    }

    result.push(e);
  }

  return result;
};

export const isSpacial = (e)=>e?.isObject3D && e.userData?.special

export function getCamera() {
    return queryCamera(Instance);
}

export function getRenderer() {
    return Instance.engine.three.renderer;
}

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



export function resetTransform(obj: THREE.Object3D) {
    obj.position.set(0, 0, 0);
    obj.quaternion.identity();
    obj.scale.set(1, 1, 1);
    obj.updateMatrixWorld(true);
}
