import { Component } from '../Component';

export type ColliderShape = 'box' | 'sphere' | 'capsule' | 'cylinder' | 'cone' | 'mesh' | string;
export type CombineRule = 'average' | 'min' | 'multiply' | 'max';
export type MeshColliderType = 'convexHull' | 'trimesh' | 'boundingBox';

export interface ColliderComponentData {
    shape?: ColliderShape;
    size?: { x: number; y: number; z: number; isVector3?: boolean };
    radius?: number;
    height?: number;
    center?: { x: number; y: number; z: number; isVector3?: boolean };
    isTrigger?: boolean;
    friction?: number;
    frictionCombineRule?: CombineRule;
    restitution?: number;
    restitutionCombineRule?: CombineRule;
    density?: number;
    meshType?: MeshColliderType;
    collisionLayer?: number;
    collisionMask?: number;
    [key: string]: any;
}

export class ColliderComponent extends Component<ColliderComponentData> {
    public static override readonly componentName = 'Collider';
    public static override readonly allowMultiple = true; // Support multiple colliders on single entity

    public shape: ColliderShape = 'box';
    public size = { x: 1, y: 1, z: 1, isVector3: true };
    public radius: number = 0.5;
    public height: number = 2;
    public center = { x: 0, y: 0, z: 0, isVector3: true };
    public isTrigger: boolean = false;

    // Physical Material & Interaction Properties
    public friction: number = 0.5;
    public frictionCombineRule: CombineRule = 'average';
    public restitution: number = 0.0;
    public restitutionCombineRule: CombineRule = 'average';
    public density: number = 1.0;

    // Mesh Collider Options
    public meshType: MeshColliderType = 'convexHull';

    // Collision Filtering & Layers
    public collisionLayer: number = 0; // 0 to 15
    public collisionMask: number = 0xffff; // 16-bit mask

    public override serialize(): ColliderComponentData {
        return {
            shape: this.shape,
            size: { ...this.size },
            radius: this.radius,
            height: this.height,
            center: { ...this.center },
            isTrigger: this.isTrigger,
            friction: this.friction,
            frictionCombineRule: this.frictionCombineRule,
            restitution: this.restitution,
            restitutionCombineRule: this.restitutionCombineRule,
            density: this.density,
            meshType: this.meshType,
            collisionLayer: this.collisionLayer,
            collisionMask: this.collisionMask
        };
    }

    public override deserialize(data: Partial<ColliderComponentData>): void {
        if (data.shape !== undefined) this.shape = data.shape;
        if (data.size !== undefined) {
            this.size = {
                x: data.size.x ?? 1,
                y: data.size.y ?? 1,
                z: data.size.z ?? 1,
                isVector3: true
            };
        }
        if (data.radius !== undefined) this.radius = data.radius;
        if (data.height !== undefined) this.height = data.height;
        if (data.center !== undefined) {
            this.center = {
                x: data.center.x ?? 0,
                y: data.center.y ?? 0,
                z: data.center.z ?? 0,
                isVector3: true
            };
        }
        if (data.isTrigger !== undefined) this.isTrigger = data.isTrigger;
        if (data.friction !== undefined) this.friction = data.friction;
        if (data.frictionCombineRule !== undefined) this.frictionCombineRule = data.frictionCombineRule;
        if (data.restitution !== undefined) this.restitution = data.restitution;
        if (data.restitutionCombineRule !== undefined) this.restitutionCombineRule = data.restitutionCombineRule;
        if (data.density !== undefined) this.density = data.density;
        if (data.meshType !== undefined) this.meshType = data.meshType;
        if (data.collisionLayer !== undefined) this.collisionLayer = data.collisionLayer;
        if (data.collisionMask !== undefined) this.collisionMask = data.collisionMask;
    }
}
