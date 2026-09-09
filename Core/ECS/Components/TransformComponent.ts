import { Component } from '../Component';

export interface TransformComponentData {
    position?: { x: number; y: number; z: number; isVector3?: boolean };
    rotation?: { x: number; y: number; z: number; isEuler?: boolean };
    scale?: { x: number; y: number; z: number; isVector3?: boolean };
    [key: string]: any;
}

export class TransformComponent extends Component<TransformComponentData> {
    public static override readonly componentName = 'Transform';
    public static override readonly allowMultiple = false;

    public position = { x: 0, y: 0, z: 0, isVector3: true };
    public rotation = { x: 0, y: 0, z: 0, isEuler: true };
    public scale = { x: 1, y: 1, z: 1, isVector3: true };

    public override serialize(): TransformComponentData {
        return {
            position: { ...this.position },
            rotation: { ...this.rotation },
            scale: { ...this.scale }
        };
    }

    public override deserialize(data: Partial<TransformComponentData>): void {
        if (data.position) {
            this.position = { x: data.position.x ?? 0, y: data.position.y ?? 0, z: data.position.z ?? 0, isVector3: true };
        }
        if (data.rotation) {
            this.rotation = { x: data.rotation.x ?? 0, y: data.rotation.y ?? 0, z: data.rotation.z ?? 0, isEuler: true };
        }
        if (data.scale) {
            this.scale = { x: data.scale.x ?? 1, y: data.scale.y ?? 1, z: data.scale.z ?? 1, isVector3: true };
        }
    }
}
