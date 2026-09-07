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
    path?: string;
}

export default class ScriptSystem extends System {
    name = "script System";
    public static instance: ScriptSystem | null = null;
    public onScriptReloaded = new Set<(path: string) => void>();

    private activationMask = new Map<string, ScriptInstance>();

    async init() {
        ScriptSystem.instance = this;
        console.log("Script System initialized");

        // Vite HMR integration: listen for script file edits without reloading the browser page
        if ((import.meta as any).hot) {
            (import.meta as any).hot.on('poly:script-reload', async (data: { file: string }) => {
                if (data?.file) {
                    await this.reloadScript(data.file);
                }
            });
        }
    }

    onUpdate() {
        const scripted = getEntities(Components.SCRIPT);
        
        for (let i = 0; i < scripted.length; i++) {
            const entity = scripted[i];
            const id = entity.uuid;
            
            // Already loading or active
            if (this.activationMask.has(id)) continue;
            const script: any = getComponent(Components.SCRIPT, entity);
            if (!script?.path?.value) continue;
            
            // mark LOADING immediately
            this.activationMask.set(id, { state: ScriptState.LOADING, path: script.path.value });
            
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

    private async loadAndAttach(entity: any, script: any, id: string) {
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
                    instance,
                    path: script.path.value
                });
            }
        } catch (err) {
            console.error("Script load failed:", err);
            // Allow retry by removing from mask
            // this.activationMask.delete(id); // no retry
        }
    }

    /**
     * Handles variable mutations emitted by the editor (e.g. from Inspector inputs).
     * Syncs updated values directly to the active Behavior instance and calls onValidate().
     */
    public handleVariableMutation(entity: any, path: string) {
        if (!entity?.uuid) return;
        const tracked = this.activationMask.get(entity.uuid);
        const instance = tracked?.instance;
        if (!instance) return;

        const scriptData: any = getComponent(Components.SCRIPT, entity);
        if (!scriptData?.variables) return;

        const marker = '.data.variables';
        const idx = path.indexOf(marker);
        if (idx === -1) return;

        const subPath = path.slice(idx + marker.length);
        if (!subPath || subPath === '') {
            // Bulk update all variables
            if (typeof instance.wire === 'function') {
                instance.wire(scriptData.variables);
            } else {
                for (const k in scriptData.variables) {
                    instance[k] = scriptData.variables[k];
                }
                instance.onValidate?.();
            }
            return;
        }

        // Extract root variable name (e.g. ".direction" or ".direction.x" -> "direction")
        const parts = subPath.replace(/^\./, '').split('.');
        const varName = parts[0];
        if (!varName) return;

        const val = scriptData.variables[varName];
        if (typeof instance.setProp === 'function') {
            instance.setProp(varName, val);
        } else {
            instance[varName] = val;
            try {
                instance.onValidate?.();
            } catch (err) {
                console.error(err);
            }
        }
    }

    /**
     * Hot reloads a specific script by path.
     * 1. Invalidates cache in ScriptLoader and BehaviorLoader
     * 2. Re-imports the fresh script class with a cache-busting timestamp
     * 3. Disables and destroys the old instances across all attached entities
     * 4. Re-instantiates and attaches the new script class
     * 5. Runs onAwake, onStart, and onEnable on the new instances
     */
    public async reloadScript(scriptPath: string): Promise<boolean> {
        console.log(`[ScriptSystem] Hot reloading script: ${scriptPath}`);
        try {
            if (!this.app.loaders.behaviorLoader || !this.app.loaders.scriptLoader) {
                console.warn("[ScriptSystem] Loaders not ready for hot reload");
                return false;
            }

            // 1. Invalidate module cache
            this.app.loaders.scriptLoader.invalidateCache(scriptPath);

            // 2. Force load fresh script class
            const ScriptClass = await this.app.loaders.behaviorLoader.loadBehavior(scriptPath, true);
            if (!ScriptClass) {
                console.warn(`[ScriptSystem] Could not load script class for ${scriptPath}`);
                return false;
            }

            // 3. Find and reload all entities currently using this script
            const scripted = getEntities(Components.SCRIPT);
            let reloadedCount = 0;

            for (let i = 0; i < scripted.length; i++) {
                const entity = scripted[i];
                const id = entity.uuid;
                const script: any = getComponent(Components.SCRIPT, entity);
                if (!script?.path?.value) continue;

                if (!this.matchesPath(script.path.value, scriptPath)) continue;

                // 4. Teardown existing instance cleanly (triggers onDisable & onDestroy)
                const existing = this.activationMask.get(id);
                if (existing?.instance) {
                    this.app.scriptExecutor.removeScript(id);
                }
                this.activationMask.delete(id);

                // 5. Instantiate fresh instance with new class definition
                const instance = this.app.loaders.behaviorLoader.instantiate(
                    script.path.value,
                    id,
                    { object: entity },
                    script.variables
                );

                // 6. Register with executor (triggers onAwake, onStart, onEnable)
                this.app.scriptExecutor.addScript(instance, id);

                // 7. Update tracking mask
                this.activationMask.set(id, {
                    state: ScriptState.ACTIVE,
                    instance,
                    path: script.path.value
                });

                reloadedCount++;
            }

            console.log(`[ScriptSystem] Successfully hot-reloaded ${scriptPath} (${reloadedCount} instance(s) updated)`);

            // 8. Notify listeners (e.g. editor UI)
            this.onScriptReloaded.forEach(cb => {
                try { cb(scriptPath); } catch (e) { console.error(e); }
            });

            return true;
        } catch (err) {
            console.error(`[ScriptSystem] Error hot reloading script ${scriptPath}:`, err);
            return false;
        }
    }

    /**
     * Checks if two script paths match, considering alias formats:
     * - "@/Game/files/playerController.ts"
     * - "/Game/files/playerController.ts"
     * - Absolute system paths from Vite watcher
     */
    public matchesPath(pathA: string, pathB: string): boolean {
        if (!pathA || !pathB) return false;
        if (pathA === pathB) return true;

        const cleanA = pathA.replace(/\\/g, '/');
        const cleanB = pathB.replace(/\\/g, '/');
        if (cleanA === cleanB) return true;

        const idxA = cleanA.indexOf('/Game/');
        const idxB = cleanB.indexOf('/Game/');
        if (idxA !== -1 && idxB !== -1) {
            return cleanA.slice(idxA) === cleanB.slice(idxB);
        }

        return cleanA.endsWith(cleanB) || cleanB.endsWith(cleanA);
    }

    onDestroy() {
        if (ScriptSystem.instance === this) {
            ScriptSystem.instance = null;
        }
        // Clean up all active scripts
        for (const [id, data] of this.activationMask) {
            if (data.state === ScriptState.ACTIVE && data.instance) {
                this.app.scriptExecutor.removeScript(id);
            }
        }
        this.activationMask.clear();
        this.onScriptReloaded.clear();
    }
}