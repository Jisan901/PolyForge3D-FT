import { type ScriptLoader } from "@/Core/Loaders/ScriptLoader";
import { Behavior, type BehaviorProps, type BehaviorContext } from "@/Core/Behavior";

export class BehaviorLoader {
    /**
     * behavior is a spacial type of hybrid script
    */
    private behaviors = new Map<string, any>();
    
    constructor(private scriptLoader: ScriptLoader) {}
    
    /**
    * loadBehavior
    * Supports force reload to bypass cache
    */
    public async loadBehavior(url: string, forceReload = false) {
        const ScriptClass = await this.scriptLoader.getScriptClass(url, !forceReload);
        this.behaviors.set(url, ScriptClass);
        const resolved = this.scriptLoader.resolveScriptKey(url);
        if (resolved !== url) {
            this.behaviors.set(resolved, ScriptClass);
        }
        return ScriptClass;
    }

    public setBehavior(url: string, ScriptClass: any) {
        this.behaviors.set(url, ScriptClass);
        const resolved = this.scriptLoader.resolveScriptKey(url);
        if (resolved !== url) {
            this.behaviors.set(resolved, ScriptClass);
        }
    }

    public getBehavior(url: string) {
        if (this.behaviors.has(url)) return this.behaviors.get(url);
        const resolved = this.scriptLoader.resolveScriptKey(url);
        return this.behaviors.get(resolved);
    }
    
    /**
     * instantiate
     */
    instantiate(url: string, instance_id: string, ctx: BehaviorContext, props: BehaviorProps) {
        const behavior = this.getBehavior(url);
        if (!behavior) throw new Error(`Behavior ${url} not loaded try to load : BehaviorLoader.loadBehavior(url)`);

        const instance = new behavior(ctx);
        instance.wire(props || {});
        return instance;
    }
    
    /**
     * life cycle handed to executor;
     */
     
    
}