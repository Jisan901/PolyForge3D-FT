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
        this.props = props;
        this.initProps();
    }

    /** Assign values / refs to internal fields */
    protected initProps() {
        for (const key in this.props) {
            const val = this.props[key];
            (this as any)[key] = val;
        }
    }

    // Lifecycle hooks on base script 
    
}

