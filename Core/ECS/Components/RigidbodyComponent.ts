import { Component } from '../Component';

export interface RigidbodyComponentData {
    mass?: number;
    useGravity?: boolean;
    gravityScale?: number;
    isStatic?: boolean;
    isKinematic?: boolean;
    updateKinematic?: boolean;
    drag?: number;
    angularDrag?: number;
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

export class RigidbodyComponent extends Component<RigidbodyComponentData> {
    public static override readonly componentName = 'Rigidbody';
    public static override readonly allowMultiple = false;

    public mass: number = 1;
    public useGravity: boolean = true;
    public gravityScale: number = 1.0;
    public isStatic: boolean = false;
    public isKinematic: boolean = false;
    public updateKinematic: boolean = false;
    public drag: number = 0;
    public angularDrag: number = 0.05;

    // Constraints (Freeze position / rotation)
    public lockTranslationX: boolean = false;
    public lockTranslationY: boolean = false;
    public lockTranslationZ: boolean = false;
    public lockRotationX: boolean = false;
    public lockRotationY: boolean = false;
    public lockRotationZ: boolean = false;

    // Advanced Rapier 3D options
    public ccdEnabled: boolean = false;
    public canSleep: boolean = true;
    public dominance: number = 0;

    public override serialize(): RigidbodyComponentData {
        return {
            mass: this.mass,
            useGravity: this.useGravity,
            gravityScale: this.gravityScale,
            isStatic: this.isStatic,
            isKinematic: this.isKinematic,
            updateKinematic: this.updateKinematic,
            drag: this.drag,
            angularDrag: this.angularDrag,
            lockTranslationX: this.lockTranslationX,
            lockTranslationY: this.lockTranslationY,
            lockTranslationZ: this.lockTranslationZ,
            lockRotationX: this.lockRotationX,
            lockRotationY: this.lockRotationY,
            lockRotationZ: this.lockRotationZ,
            ccdEnabled: this.ccdEnabled,
            canSleep: this.canSleep,
            dominance: this.dominance
        };
    }

    public override deserialize(data: Partial<RigidbodyComponentData>): void {
        if (data.mass !== undefined) this.mass = data.mass;
        if (data.useGravity !== undefined) this.useGravity = data.useGravity;
        if (data.gravityScale !== undefined) this.gravityScale = data.gravityScale;
        if (data.isStatic !== undefined) this.isStatic = data.isStatic;
        if (data.isKinematic !== undefined) this.isKinematic = data.isKinematic;
        if (data.updateKinematic !== undefined) this.updateKinematic = data.updateKinematic;
        if (data.drag !== undefined) this.drag = data.drag;
        if (data.angularDrag !== undefined) this.angularDrag = data.angularDrag;
        if (data.lockTranslationX !== undefined) this.lockTranslationX = data.lockTranslationX;
        if (data.lockTranslationY !== undefined) this.lockTranslationY = data.lockTranslationY;
        if (data.lockTranslationZ !== undefined) this.lockTranslationZ = data.lockTranslationZ;
        if (data.lockRotationX !== undefined) this.lockRotationX = data.lockRotationX;
        if (data.lockRotationY !== undefined) this.lockRotationY = data.lockRotationY;
        if (data.lockRotationZ !== undefined) this.lockRotationZ = data.lockRotationZ;
        if (data.ccdEnabled !== undefined) this.ccdEnabled = data.ccdEnabled;
        if (data.canSleep !== undefined) this.canSleep = data.canSleep;
        if (data.dominance !== undefined) this.dominance = data.dominance;
    }
}
