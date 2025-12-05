export enum ObjectType {
  SCENE = 'SCENE',
  CUBE = 'CUBE',
  SPHERE = 'SPHERE',
  CYLINDER = 'CYLINDER',
  PLANE = 'PLANE',
  CAPSULE = 'CAPSULE',
  LIGHT = 'LIGHT',
  CAMERA = 'CAMERA',
  FOLDER = 'FOLDER',
  MATERIAL = 'MATERIAL',
  SCRIPT = 'SCRIPT'
}

export interface Transform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export interface SceneObject {
  id: string;
  name: string;
  type: ObjectType;
  children?: SceneObject[];
  expanded?: boolean;
  transform?: Transform;
  properties?: Record<string, any>;
}

export interface AssetFile {
  id: string;
  name: string;
  type: 'folder' | 'image' | 'model' | 'script' | 'material';
  size?: string;
}

export type ViewMode = 'SCENE' | 'GAME' | 'ANIMATION';