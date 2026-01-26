import { System } from "@/Core/Systems/System"
import { getComponent, getEntities } from '@/Core/Functions';
import { Components } from "@/Core/Types/Components";

enum ScriptState {
    LOADING,
    ACTIVE
}

interface ScriptInstance {
    state: ScriptState;
    instance?: any;
}

export default class ScriptSystem extends System {
    private activationMask = new Map<string, ScriptInstance>();

    async init() {
        console.log("Script System initialized");
    }

    onUpdate() {
        const scripted = getEntities(Components.SCRIPT);
        
        for (let i = 0; i < scripted.length; i++) {
            const entity = scripted[i];
            const id = entity.uuid;
            
            // Already loading or active
            if (this.activationMask.has(id)) continue;
            
            const script = getComponent(Components.SCRIPT, entity);
            if (!script?.path?.value) continue;
            
            // mark LOADING immediately
            this.activationMask.set(id, { state: ScriptState.LOADING });
            
            // fire and forget (no await blocking frame)
            this.loadAndAttach(entity, script, id);
        }
        
        // Cleanup removed entities
        const scriptedIds = new Set(scripted.map(e => e.uuid));
        for (const [id, data] of this.activationMask) {
            if (!scriptedIds.has(id)) {
                if (data.state === ScriptState.ACTIVE && data.instance) {
                    this.app.scriptExecutor.removeScript(id);
                }
                this.activationMask.delete(id);
            }
        }
    }

    private async loadAndAttach(entity, script, id) {
        try {
            if (!this.app.loaders.behaviorLoader) {
                throw new Error("behaviorLoader not available");
            }

            await this.app.loaders.behaviorLoader.loadBehavior(script.path.value);
            
            // Check if entity still exists before instantiating
            if (!this.activationMask.has(id)) {
                return; // Entity was removed during loading
            }
            
            const instance = this.app.loaders.behaviorLoader.instantiate(
                script.path.value,
                id,
                { object: entity },
                script.variables
            ); // handover to executor 
            
            this.app.scriptExecutor.addScript(instance, id);
            
            // Update to ACTIVE only if still tracked
            const current = this.activationMask.get(id);
            if (current) {
                this.activationMask.set(id, { 
                    state: ScriptState.ACTIVE, 
                    instance 
                });
            }
        } catch (err) {
            console.error("Script load failed:", err);
            // Allow retry by removing from mask
            // this.activationMask.delete(id); // no retry
        }
    }

    onDestroy() {
        // Clean up all active scripts
        for (const [id, data] of this.activationMask) {
            if (data.state === ScriptState.ACTIVE && data.instance) {
                this.app.scriptExecutor.removeScript(id);
            }
        }
        this.activationMask.clear();
    }
}