import { Components } from "@/Core/Types/Components";
import { THREE } from '@/Core/lib/THREE';
import { Instance } from "@/Core/PolyForge";
import { ThreeHelpers } from '@/Core/three/Helper';
import type { BaseScript } from '@/Core/Script/ScriptExecutor';

// ---------------------------------------------------------------------------
// Component Data Types & Mappings
// ---------------------------------------------------------------------------

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
  isVector3?: boolean;
  [key: string]: any;
}

export interface EulerLike {
  x: number;
  y: number;
  z: number;
  isEuler?: boolean;
  [key: string]: any;
}

export interface QuaternionLike {
  x: number;
  y: number;
  z: number;
  w: number;
  [key: string]: any;
}

export interface ColorLike {
  r: number;
  g: number;
  b: number;
  a?: number;
  isColor?: boolean;
  [key: string]: any;
}

export interface FileRefLike {
  isFile?: boolean;
  value?: string | null;
  [key: string]: any;
}

export interface TransformComponentData {
  position: Vector3Like;
  rotation: EulerLike;
  scale: Vector3Like;
  [key: string]: any;
}

export interface CameraComponentData {
  fov: number;
  near: number;
  far: number;
  orthographic: boolean;
  size: number;
  [key: string]: any;
}

export interface MeshRendererComponentData {
  mesh: any;
  material: any;
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  [key: string]: any;
}

export interface LightComponentData {
  type: 'directional' | 'point' | 'spot' | 'ambient' | 'hemisphere' | 'rectArea' | string;
  color: ColorLike;
  intensity: number;
  range: number;
  spotAngle: number;
  [key: string]: any;
}

export interface RigidbodyComponentData {
  mass: number;
  useGravity: boolean;
  isStatic: boolean;
  isKinematic: boolean;
  updateKinematic?: boolean;
  drag: number;
  angularDrag: number;
  [key: string]: any;
}

export interface ColliderComponentData {
  shape: 'box' | 'sphere' | 'capsule' | 'cylinder' | 'mesh' | string;
  size: Vector3Like;
  radius: number;
  height: number;
  isTrigger: boolean;
  [key: string]: any;
}

export interface ScriptComponentData {
  path: FileRefLike;
  enabled: boolean;
  variables: Record<string, any>;
  [key: string]: any;
}

export interface AnimationComponentData {
  clips: any[];
  current: string | null;
  speed: number;
  loop: boolean;
  playing: boolean;
  [key: string]: any;
}

export interface AudioComponentData {
  clip: any;
  volume: number;
  loop: boolean;
  playOnStart: boolean;
  [key: string]: any;
}

export interface UIElementComponentData {
  size: { x: number; y: number };
  anchor: string;
  pivot: { x: number; y: number };
  color: ColorLike;
  [key: string]: any;
}

export interface LODLevelData {
  distance: number;
  file: FileRefLike;
}

export interface LODComponentData {
  enabled: boolean;
  'level 0'?: LODLevelData;
  'level 1'?: LODLevelData;
  'level 2'?: LODLevelData;
  'level 3'?: LODLevelData;
  [key: string]: any;
}

export interface ComponentDataMap {
  [Components.TRANSFORM]: TransformComponentData;
  [Components.CAMERA]: CameraComponentData;
  [Components.MESH_RENDERER]: MeshRendererComponentData;
  [Components.LIGHT]: LightComponentData;
  [Components.RIGIDBODY]: RigidbodyComponentData;
  [Components.COLLIDER]: ColliderComponentData;
  [Components.SCRIPT]: ScriptComponentData;
  [Components.ANIMATION]: AnimationComponentData;
  [Components.AUDIO]: AudioComponentData;
  [Components.UI_ELEMENT]: UIElementComponentData;
  [Components.LOD]: LODComponentData;
}

// ---------------------------------------------------------------------------
// Entity Reference Types
// ---------------------------------------------------------------------------

export interface EntityRef {
  isRef?: boolean;
  ref?: string;
  [key: string]: any;
}

export type RefInput<T = THREE.Object3D> = T | EntityRef | string | null | undefined;

// ---------------------------------------------------------------------------
// Component Access
// ---------------------------------------------------------------------------

export function getComponent<C extends keyof ComponentDataMap>(
  componentId: C,
  object?: THREE.Object3D | null
): ComponentDataMap[C] | undefined;
export function getComponent<T = unknown>(
  componentId: Components | number,
  object?: THREE.Object3D | null
): T | undefined;
export function getComponent(
  componentId: Components | number,
  object?: THREE.Object3D | null
): any {
  return (object as any)?.userData?.components?.[componentId]?.data;
}

// ---------------------------------------------------------------------------
// Entity / Object Registry References
// ---------------------------------------------------------------------------

export function getRef<T extends THREE.Object3D = THREE.Object3D>(
  ref?: RefInput<T>
): T | undefined {
  if (!ref) return undefined;

  // Already a THREE.Object3D instance
  if (typeof ref === 'object' && 'isObject3D' in ref && (ref as any).isObject3D) {
    return ref as T;
  }

  // UUID string
  if (typeof ref === 'string') {
    return Instance.threeRegistry.getObject(ref) as T | undefined;
  }

  // Ref container { isRef: true, ref: 'uuid' }
  if (typeof ref === 'object' && 'ref' in ref && typeof (ref as any).ref === 'string') {
    return Instance.threeRegistry.getObject((ref as any).ref) as T | undefined;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Script Retrieval
// ---------------------------------------------------------------------------

export function getScript<T extends BaseScript = BaseScript>(id: string): T | undefined {
  return Instance.scriptExecutor.getScript<T>(id);
}

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
  target?: THREE.Object3D | EntityRef | string | null,
  gpuCleanup = true
): boolean {
  if (!target) return false;

  const object =
    typeof target === "string" || (typeof target === "object" && !(target instanceof THREE.Object3D))
      ? getRef(target)
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

// ---------------------------------------------------------------------------
// Querying & Scene Hierarchy
// ---------------------------------------------------------------------------

export const queryAll = (): THREE.Object3D[] => {
  return Instance.threeRegistry.getSpecialObjects() || [];
};

export const queryCamera = (i: typeof Instance = Instance): THREE.Camera | undefined => {
  return (
    (i.sceneManager?.activeScene?.getObjectByProperty('isCamera', true) as THREE.Camera) ||
    i.engine?.getActiveCamera?.()
  );
};

export const getEntities = <T extends THREE.Object3D = THREE.Object3D>(
  ...components: Components[]
): T[] => {
  const result: T[] = [];
  const entities = queryAll();

  outer:
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    const comps = (e as any).userData?.components;

    if (!comps) continue;

    for (let j = 0; j < components.length; j++) {
      if (!comps[components[j]]) {
        continue outer;
      }
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

export function getCamera(): THREE.Camera | undefined {
  return queryCamera(Instance);
}

export function getRenderer(): THREE.WebGPURenderer | undefined {
  return (Instance.engine?.three as any)?.renderer;
}

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


