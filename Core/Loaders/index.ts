import { ScriptLoader } from "@/Core/Loaders/ScriptLoader"
import { BehaviorLoader } from "@/Core/Loaders/BehaviorLoader"
import { AdvancedLoader } from "@/Core/Loaders/AdvancedLoader"
import { type ThreeRegistry } from '@/Core/three/ThreeRegistry'; // no gpu disposal 


export class Loaders {
    public scriptLoader = new ScriptLoader(); //own cache
    public objectLoader: AdvancedLoader; 
    public behaviorLoader = new BehaviorLoader(this.scriptLoader); // own cache
    /**
     * base loader 
    */
    constructor(private registry: ThreeRegistry) {
        this.objectLoader = new AdvancedLoader(registry);
    }
}

