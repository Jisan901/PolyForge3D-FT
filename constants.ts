import { ObjectType, SceneObject, AssetFile } from './types';

export const INITIAL_SCENE: SceneObject[] = [
  {
    id: 'root',
    name: 'Main Scene',
    type: ObjectType.SCENE,
    expanded: true,
    children: [
      {
        id: 'cam-1',
        name: 'Main Camera',
        type: ObjectType.CAMERA,
        transform: { position: { x: 0, y: 1, z: -10 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        properties: { fov: 60, near: 0.1, far: 1000 }
      },
      {
        id: 'light-1',
        name: 'Directional Light',
        type: ObjectType.LIGHT,
        transform: { position: { x: 5, y: 10, z: 5 }, rotation: { x: 45, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        properties: { intensity: 1.5, color: '#ffffff', shadow: true }
      },
      {
        id: 'env-1',
        name: 'Environment',
        type: ObjectType.FOLDER,
        expanded: true,
        children: [
          {
            id: 'cube-1',
            name: 'Floor',
            type: ObjectType.CUBE,
            transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 10, y: 0.1, z: 10 } },
            properties: { material: 'Mat_Floor', collider: true }
          },
          {
            id: 'cube-2',
            name: 'PlayerBox',
            type: ObjectType.CUBE,
            transform: { position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 45, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
            properties: { material: 'Mat_Player', rigidBody: true }
          }
        ]
      }
    ]
  }
];



export const nameCodes = {
    Transform: 1,
    Camera: 2,
    MeshRenderer: 3,
    Light: 4,
    Rigidbody: 5,
    Collider: 6,
    Script: 7,
    Animation: 8,
    Audio: 9,
    UIElement: 10
} as const;


export const MOCK_ASSETS: AssetFile[] = [
  { id: 'f1', name: 'Scripts', type: 'folder' },
  { id: 'f2', name: 'Materials', type: 'folder' },
  { id: 'f3', name: 'Models', type: 'folder' },
  { id: 'a1', name: 'PlayerController.ts', type: 'script', size: '4 KB' },
  { id: 'a2', name: 'GameManager.ts', type: 'script', size: '12 KB' },
  { id: 'a3', name: 'Mat_Floor.mat', type: 'material', size: '2 KB' },
  { id: 'a4', name: 'Mat_Player.mat', type: 'material', size: '2 KB' },
  { id: 'a5', name: 'HeroModel.fbx', type: 'model', size: '4.5 MB' },
  { id: 'a6', name: 'Texture_Atlas.png', type: 'image', size: '1.2 MB' },
];