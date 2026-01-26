// runtime/Behavior.ts
export type PropValue = any;
export type PropRef = string; // UUID of referenced object

export interface BehaviorProps {
    [key: string]: { ref?: PropRef; value: PropValue, isRef?:boolean }|string|number|any;
}

export interface BehaviorContext {
    scene: import('three').Scene;
    object: import('three').Object3D;
    getActiveCamera: ()=>unknown;
    // you can add input, time, physics, etc.
}

/**
 *     v1 
 * 
 */


export abstract class Behavior {
    public object!: import('three').Object3D;
    public scene!: import('three').Scene;
    public props: BehaviorProps = {};
    

    constructor(public ctx: BehaviorContext) {
        this.object = ctx.object;
        this.scene = ctx.scene;
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
            if (typeof val === 'object' && val!==null && val.isRef) {
                // find object in scene by uuid
                const obj = this.scene.getObjectByProperty('uuid', val.ref);
                if (obj) (this as any)[key] = obj;
            } else {
                (this as any)[key] = val;
            }
        }
    }

    // Lifecycle hooks
    onBeforeStart?(): void; // at first like on awake 
    onStart?(): void;
    onUpdate?(dt: number): void;
    onDestroy?(): void;
}



type BehaviorClassType = typeof Behavior;

interface RegisteredBehavior {
    name: string;
    url: string;
    props: any;
    cls?: BehaviorClassType;
}

export class BehaviorRegistry {
    private behaviors = new Map<string, RegisteredBehavior>();
    private instances = new Map<string, Behavior>();
    
    async register(name: string, url: string, propsJson: string) {
        if (!url) return
        let behavior = this.behaviors.get(name);

        const props = JSON.parse(propsJson);

        // Import script dynamically
        // if (import.meta.hot) {
        //     import.meta.hot.invalidate();
        // }
        const module = await import(/* @vite-ignore */`${url}?${Date.now()}`);
        const cls = module.default;

        if (!cls) throw new Error(`Behavior ${name} has no default export`);

        behavior = { name, url, props, cls };
        this.behaviors.set(name, behavior);

        return behavior;
    }

    /** Instantiate behavior for preview */
    instantiate(name: string, instance_id: string, ctx: any, props:BehaviorProps) {
        const behavior = this.behaviors.get(name);
        if (!behavior || !behavior.cls) throw new Error(`Behavior ${name} not loaded`);

        const instance = new behavior.cls(ctx);
        instance.wire(props||behavior.props);
        
        this.instances.set(instance_id, instance)
        
        instance.onBeforeStart?.();
        

        return instance;
    }
    
    async runOnStartCall(){
        for (let [key, instance] of this.instances){
            await instance.onStart?.();
        }
    }
    async runOnDestroyCall(){
        for (let [key, instance] of this.instances){
            await instance.onDestroy?.();
        }
    }
}