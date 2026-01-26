import { type ScriptLoader } from "@/Core/Loaders/ScriptLoader";
import { Behavior, type BehaviorProps, type BehaviorContext } from "@/Core/Behavior";

export class BehaviorLoader {
    /**
     * behavior is a spacial type of hybrid script
    */
    private behaviors = new Map<string, typeof Behavior>();
    
    constructor(private scriptLoader: ScriptLoader) {}
    
    /**
    * loadBehavior
    * Already cached by script loader
    */
    public async loadBehavior(url: string) {
        const ScriptClass = await this.scriptLoader.getScriptClass(url);
        this.behaviors.set(url, ScriptClass);
    }
    
    
    /**
     * instantiate
     */
    instantiate(url: string, instance_id: string, ctx: BehaviorContext, props:BehaviorProps) {
        const behavior = this.behaviors.get(url);
        if (!behavior) throw new Error(`Behavior ${url} not loaded try to load : BehaviorLoader.loadBehavior(url)`);

        const instance = new behavior(ctx);
        instance.wire(props||{});
        return instance;
    }
    
    /**
     * life cycle handed to executor;
     */
     
    
}