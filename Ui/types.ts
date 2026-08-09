import { THREE } from '@/Core/lib/THREE';
import { ObjectType } from '@/Core/Types/Objects';

export { ObjectType };

export interface AssetFile {
    id: string;
    name: string;
    type: string;
    fullPath: string;
    size?: string;
}

export type SceneObject = THREE.Object3D;

export type ViewMode = 'editor' | 'game';
