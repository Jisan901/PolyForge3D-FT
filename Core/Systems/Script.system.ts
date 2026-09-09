import { System } from "@/Core/Systems/System";
import { getComponent, getComponents, getEntities } from '@/Core/Functions';
import { Components } from "@/Core/Types/Components";
import type { Query } from "@/Core/ECS/Query";

enum ScriptState {
    LOADING,
    ACTIVE
}

interface ScriptInstance {
    state: ScriptState;
    instance?: any;
    path?: string;
    entityUuid: string;
    instanceId: string;
}

export default class ScriptSystem extends System {
    name = "script System";
    public static instance: ScriptSystem | null = null;
    public onScriptReloaded = new Set<(path: string) => void>();

    private activationMask = new Map<string, ScriptInstance>();
    private query: Query | null = null;

    constructor(public override app: any) {
        super(app);
        ScriptSystem.instance = this;
    }

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

    onStart(): void {
        console.log("Script System started");
        ScriptSystem.instance = this;

        if (this.app.entityManager) {
            this.query = this.app.entityManager.createQuery([Components.SCRIPT]);
            this.query.onEntityRemoved.add((e) => {
                this.removeEntityScripts(e.id);
            });
        }

        // Start existing scripted entities immediately
        this.startEntities();
    }

    onUpdate() {
        this.startEntities();
    }

    private startEntities() {
        const entities = this.query ? this.query.entities : null;
        if (entities) {
            for (let i = 0; i < entities.length; i++) {
                const entity = entities[i].object3d;
                if (!entity) continue;
                this.attachScriptsToEntity(entity);
            }
            return;
        }

        // Fallback if query not available
        const scripted = getEntities(Components.SCRIPT);
        for (let i = 0; i < scripted.length; i++) {
            const entity = scripted[i];
            if (!entity) continue;
            this.attachScriptsToEntity(entity);
        }
    }

    private attachScriptsToEntity(entity: any) {
        const id = entity.uuid;
        const scriptComps = getComponents(Components.SCRIPT, entity);
        if (!scriptComps || scriptComps.length === 0) return;

        for (let i = 0; i < scriptComps.length; i++) {
            const script: any = scriptComps[i];
            if (!script?.path?.value) continue;

            const instanceId = script.instanceId || (scriptComps.length === 1 ? id : `${id}_${i}_${script.path.value}`);
            if (this.activationMask.has(instanceId)) continue;

            // Mark LOADING immediately
            this.activationMask.set(instanceId, {
                state: ScriptState.LOADING,
                path: script.path.value,
                entityUuid: id,
                instanceId
            });

            // Fire and forget (no await blocking frame)
            this.loadAndAttach(entity, script, instanceId);
        }
    }

    private async loadAndAttach(entity: any, script: any, instanceId: string) {
        try {
            if (!this.app.loaders.behaviorLoader) {
                throw new Error("behaviorLoader not available");
            }

            await this.app.loaders.behaviorLoader.loadBehavior(script.path.value);

            // Check if entity / script still tracked
            if (!this.activationMask.has(instanceId)) {
                return; // Removed during loading
            }

            const instance = this.app.loaders.behaviorLoader.instantiate(
                script.path.value,
                instanceId,
                { object: entity },
                script.variables
            );

            this.app.scriptExecutor.addScript(instance, instanceId);

            // Update to ACTIVE only if still tracked
            const current = this.activationMask.get(instanceId);
            if (current) {
                this.activationMask.set(instanceId, {
                    state: ScriptState.ACTIVE,
                    instance,
                    path: script.path.value,
                    entityUuid: entity.uuid,
                    instanceId
                });
            }
        } catch (err) {
            console.error("Script load failed:", err);
        }
    }

    private removeEntityScripts(entityUuid: string) {
        for (const [key, data] of this.activationMask) {
            if (data.entityUuid === entityUuid || key === entityUuid) {
                if (data.state === ScriptState.ACTIVE && data.instance) {
                    this.app.scriptExecutor.removeScript(key);
                }
                this.activationMask.delete(key);
            }
        }
    }

    /**
     * Handles variable mutations emitted by the editor (e.g. from Inspector inputs).
     * Syncs updated values directly to the active Behavior instance and calls onValidate().
     */
    public handleVariableMutation(entity: any, path: string) {
        if (!entity?.uuid) return;

        // Find all matching instances for this entity
        for (const [key, tracked] of this.activationMask) {
            if (tracked.entityUuid === entity.uuid || key === entity.uuid) {
                const instance = tracked.instance;
                if (!instance) continue;

                const scriptData: any = getComponent(Components.SCRIPT, entity);
                if (!scriptData?.variables) continue;

                const marker = '.data.variables';
                const idx = path.indexOf(marker);
                if (idx === -1) continue;

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
                    continue;
                }

                // Extract root variable name (e.g. ".direction" or ".direction.x" -> "direction")
                const parts = subPath.replace(/^\./, '').split('.');
                const varName = parts[0];
                if (!varName) continue;

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
                const scriptComps = getComponents(Components.SCRIPT, entity);
                if (!scriptComps || scriptComps.length === 0) continue;

                for (let c = 0; c < scriptComps.length; c++) {
                    const script: any = scriptComps[c];
                    if (!script?.path?.value) continue;
                    if (!this.matchesPath(script.path.value, scriptPath)) continue;

                    const instanceId = script.instanceId || (scriptComps.length === 1 ? id : `${id}_${c}_${script.path.value}`);

                    // 4. Teardown existing instance cleanly (triggers onDisable & onDestroy)
                    const existing = this.activationMask.get(instanceId);
                    if (existing?.instance) {
                        this.app.scriptExecutor.removeScript(instanceId);
                    }
                    this.activationMask.delete(instanceId);

                    // 5. Instantiate fresh instance with new class definition
                    const instance = this.app.loaders.behaviorLoader.instantiate(
                        script.path.value,
                        instanceId,
                        { object: entity },
                        script.variables
                    );

                    // 6. Register with executor (triggers onAwake, onStart, onEnable)
                    this.app.scriptExecutor.addScript(instance, instanceId);

                    // 7. Update tracking mask
                    this.activationMask.set(instanceId, {
                        state: ScriptState.ACTIVE,
                        instance,
                        path: script.path.value,
                        entityUuid: id,
                        instanceId
                    });

                    reloadedCount++;
                }
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
        // Clean up all active scripts created by ScriptSystem
        for (const [key, data] of this.activationMask) {
            if (data.state === ScriptState.ACTIVE && data.instance) {
                this.app.scriptExecutor.removeScript(key);
            }
        }
        this.activationMask.clear();
        this.query = null;
        console.log("Script System stopped / destroyed");
    }
}