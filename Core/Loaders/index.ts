import { ScriptLoader } from "@/Core/Loaders/ScriptLoader"
import { BehaviorLoader } from "@/Core/Loaders/BehaviorLoader"
import { MemoLoader } from "@/Core/Loaders/ObjectLoader"
import { type ThreeRegistry } from '@/Core/three/ThreeRegistry'; // no gpu disposal 


export class Loaders {
    public scriptLoader = new ScriptLoader(); //own cache
    public objectLoader = new MemoLoader(); // own cache // own disposal
    public behaviorLoader = new BehaviorLoader(this.scriptLoader); // own cache
    /**
     * base loader 
    */
    constructor(private registry: ThreeRegistry) {}
}

