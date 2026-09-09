import { THREE } from '@/Core/lib/THREE';
import type { PolyForge } from '@/Core/PolyForge';

/**
 * ECSScenePlugin connects the Hybrid ECS to the Scene lifecycle
 * in a completely decoupled plugin-style manner (without modifying Baxporter or Loaders).
 *
 * - On Scene Load: Automatically hydrates all loaded objects into typed entities and components.
 * - Before Save: Automatically flushes all in-memory component states into object.userData.components.
 */
export class ECSScenePlugin {
    constructor(private app: PolyForge) {}

    public init(): void {
        const sceneManager = this.app.sceneManager;
        const entityManager = this.app.entityManager;

        if (!sceneManager || !entityManager) return;

        // 1. Post-load hook: Hydrate entities whenever a scene is set/loaded
        sceneManager.onSceneLoaded.add((scene: THREE.Scene) => {
            entityManager.hydrateScene(scene);
        });

        // 2. Pre-save hook: Flush all component states to userData before scene is saved
        sceneManager.onBeforeSave.add((scene: THREE.Scene) => {
            entityManager.syncAll(scene);
        });

        // 3. Clear hook: Reset entities on scene clear
        sceneManager.onBeforeSceneClear.add(() => {
            entityManager.clear();
        });

        // If a scene is already active at plugin startup, hydrate it immediately
        if (sceneManager.activeScene) {
            entityManager.hydrateScene(sceneManager.activeScene);
        }
    }

    /**
     * Utility method to flush any single object or hierarchy before export.
     */
    public syncBeforeSave(object: THREE.Object3D): void {
        this.app.entityManager?.syncAll(object);
    }
}
