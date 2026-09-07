import { THREE } from '@/Core/lib/THREE'
import { BaseScript } from "@/Core/Script/ScriptExecutor";

export interface BehaviorProps {
    [key: string]: any;
}

export interface BehaviorContext {
    object: THREE.Object3D;
}

/**
 * upgraded simplified 
 *     v2
 * 
 */

export abstract class Behavior extends BaseScript {
    public object!: THREE.Object3D;
    public props: BehaviorProps = {};

    constructor(public ctx: BehaviorContext) {
        super();
        this.object = ctx.object;
    }

    /** Called by engine to wire editor-provided props */
    wire(props: BehaviorProps) {
        this.props = props || {};
        this.initProps();
        this.invokeValidate();
    }

    /** Assign values / refs to internal fields */
    protected initProps() {
        for (const key in this.props) {
            this.assignProp(key, this.props[key]);
        }
    }

    /** Assigns a single property with Vector3 conversion */
    public assignProp(key: string, val: any) {
        this.props[key] = val;
        if (val && typeof val === 'object' && val.isVector3) {
            (this as any)[key] = new THREE.Vector3(
                Number(val.x ?? 0),
                Number(val.y ?? 0),
                Number(val.z ?? 0)
            );
        } else {
            (this as any)[key] = val;
        }
    }

    /** Update a single property and trigger onValidate */
    public setProp(key: string, val: any) {
        this.assignProp(key, val);
        this.invokeValidate();
    }

    /** Safely calls onValidate if defined on the script instance */
    public invokeValidate() {
        try {
            this.onValidate?.();
        } catch (err) {
            console.error(`[Behavior] Error in onValidate for ${this.constructor.name}:`, err);
        }
    }
}
