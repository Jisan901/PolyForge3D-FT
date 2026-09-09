import { Components } from "@/Core/Types/Components";
import { THREE } from '@/Core/lib/THREE';
import type { Entity } from '@/Core/ECS/Entity';
import type { Component } from '@/Core/ECS/Component';
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
  gravityScale?: number;
  isStatic: boolean;
  isKinematic: boolean;
  updateKinematic?: boolean;
  drag: number;
  angularDrag: number;
  lockTranslationX?: boolean;
  lockTranslationY?: boolean;
  lockTranslationZ?: boolean;
  lockRotationX?: boolean;
  lockRotationY?: boolean;
  lockRotationZ?: boolean;
  ccdEnabled?: boolean;
  canSleep?: boolean;
  dominance?: number;
  [key: string]: any;
}

export interface ColliderComponentData {
  shape: 'box' | 'sphere' | 'capsule' | 'cylinder' | 'cone' | 'mesh' | string;
  size: Vector3Like;
  radius: number;
  height: number;
  center?: Vector3Like;
  isTrigger: boolean;
  friction?: number;
  frictionCombineRule?: 'average' | 'min' | 'multiply' | 'max';
  restitution?: number;
  restitutionCombineRule?: 'average' | 'min' | 'multiply' | 'max';
  density?: number;
  meshType?: 'convexHull' | 'trimesh' | 'boundingBox';
  collisionLayer?: number;
  collisionMask?: number;
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
  ref?: string | THREE.Object3D;
  uuid?: string;
  name?: string;
  value?: any;
  target?: any;
  [key: string]: any;
}

export type RefInput<T = THREE.Object3D> =
  | T
  | Entity
  | Component
  | EntityRef
  | string
  | number
  | null
  | undefined;

// ---------------------------------------------------------------------------
// Script Constructor Type
// ---------------------------------------------------------------------------

export type ScriptConstructor<T extends BaseScript = BaseScript> =
  | (new (...args: any[]) => T)
  | (abstract new (...args: any[]) => T);
