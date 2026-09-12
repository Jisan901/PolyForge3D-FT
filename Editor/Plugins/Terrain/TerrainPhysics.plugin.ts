import { Plugin } from '@/Core/Plugins/Plugin';
import { THREE } from '@/Core/lib/THREE';
import { Editor } from '@/Editor/Editor';
import type { TerrainChunkManager, ChunkData } from './TerrainChunkManager';

export default class TerrainPhysicsPlugin extends Plugin {
    public static instance: TerrainPhysicsPlugin | null = null;
    public name = 'Terrain Physics Plugin';
    public version = '1.0.0';

    public RAPIER: any = null;
    public world: any = null;

    private _tempWorldPos = new THREE.Vector3();
    private _tempWorldQuat = new THREE.Quaternion();
    private _tempWorldScale = new THREE.Vector3();
    private _registeredManagers: Set<TerrainChunkManager> = new Set();

    constructor(public override app: any) {
        super(app);
        TerrainPhysicsPlugin.instance = this;
    }

    async init() {
        TerrainPhysicsPlugin.instance = this;
        await this.resolvePhysics();
        console.log('[TerrainPhysicsPlugin] Initialized');
    }

    public setPhysics(RAPIER: any, world: any): void {
        this.RAPIER = RAPIER;
        this.world = world;
    }

    public async resolvePhysics(): Promise<{ RAPIER: any; world: any } | null> {
        if (this.RAPIER && this.world) {
            return { RAPIER: this.RAPIER, world: this.world };
        }

        const physics = this.app?.pluginData?.physics || (Editor?.core as any)?.pluginData?.physics || (globalThis as any)?.Instance?.pluginData?.physics;
        if (physics?.RAPIER && physics?.world) {
            this.RAPIER = physics.RAPIER;
            this.world = physics.world;
            return { RAPIER: this.RAPIER, world: this.world };
        }

        try {
            const rapierModule = await import('@dimforge/rapier3d');
            const RAPIER = rapierModule.default || rapierModule;
            let world = this.app?.pluginData?.physics?.world || (Editor?.core as any)?.pluginData?.physics?.world;
            if (!world) {
                world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
                const target = this.app || Editor?.core;
                if (target) {
                    if (!target.pluginData) target.pluginData = {};
                    target.pluginData.physics = { RAPIER, world };
                }
            }
            this.RAPIER = RAPIER;
            this.world = world;
            return { RAPIER, world };
        } catch (err) {
            console.warn('[TerrainPhysicsPlugin] Could not initialize Rapier:', err);
            return null;
        }
    }

    public registerManager(manager: TerrainChunkManager): void {
        this._registeredManagers.add(manager);
        this.syncManager(manager);
    }

    public unregisterManager(manager: TerrainChunkManager): void {
        this.cleanupManager(manager);
        this._registeredManagers.delete(manager);
    }

    onUpdate(_dt?: number): void {
        // Find managers in active scene if none explicitly registered
        const scene = this.app?.sceneManager?.activeScene || Editor?.core?.sceneManager?.activeScene;
        if (scene) {
            scene.traverse((obj: any) => {
                if (obj && obj.isTerrainChunkManager) {
                    this._registeredManagers.add(obj as TerrainChunkManager);
                }
            });
        }

        for (const manager of this._registeredManagers) {
            this.syncManager(manager);
        }
    }

    /**
     * Synchronizes chunk physics for a TerrainChunkManager.
     * Ensures physics is attached if and only if chunk is at the first LOD (minLod).
     */
    public syncManager(manager: TerrainChunkManager): void {
        if (!manager || !manager.chunks) return;

        if (!manager.enablePhysics) {
            this.cleanupManager(manager);
            return;
        }

        if (!this.world || !this.RAPIER) {
            const physics = this.app?.pluginData?.physics || (Editor?.core as any)?.pluginData?.physics;
            if (physics?.RAPIER && physics?.world) {
                this.RAPIER = physics.RAPIER;
                this.world = physics.world;
            } else {
                return;
            }
        }

        const minLod = manager.minLod;

        for (let i = 0; i < manager.chunks.length; i++) {
            const chunk = manager.chunks[i];

            // Only chunk meshes that are active at the first LOD get physics
            if (chunk.mesh && chunk.currentLod === minLod) {
                if (!chunk.rigidBody) {
                    this.createChunkCollider(manager, chunk);
                } else {
                    this.syncChunkTransform(chunk);
                }
            } else {
                if (chunk.rigidBody) {
                    this.removeChunkCollider(chunk);
                }
            }
        }
    }

    /**
     * Creates a static Rapier trimesh collider for a chunk at the first LOD.
     */
    public createChunkCollider(manager: TerrainChunkManager, chunk: ChunkData): void {
        if (!this.world || !this.RAPIER || !chunk.mesh) return;

        const geo = chunk.geometries[manager.minLod];
        if (!geo || !geo.attributes?.position || !geo.index) return;

        try {
            chunk.mesh.updateWorldMatrix(true, false);
            chunk.mesh.getWorldPosition(this._tempWorldPos);
            chunk.mesh.getWorldQuaternion(this._tempWorldQuat);
            chunk.mesh.getWorldScale(this._tempWorldScale);

            const rawPositions = geo.attributes.position.array;
            let positions = rawPositions instanceof Float32Array
                ? rawPositions
                : new Float32Array(rawPositions);

            // Apply world scale to vertices if terrain group is scaled
            if (
                Math.abs(this._tempWorldScale.x - 1) > 1e-4 ||
                Math.abs(this._tempWorldScale.y - 1) > 1e-4 ||
                Math.abs(this._tempWorldScale.z - 1) > 1e-4
            ) {
                const scaled = new Float32Array(positions.length);
                for (let i = 0; i < positions.length; i += 3) {
                    scaled[i] = positions[i] * this._tempWorldScale.x;
                    scaled[i + 1] = positions[i + 1] * this._tempWorldScale.y;
                    scaled[i + 2] = positions[i + 2] * this._tempWorldScale.z;
                }
                positions = scaled;
            }

            const rawIndices = geo.index.array;
            const indices = rawIndices instanceof Uint32Array
                ? rawIndices
                : new Uint32Array(rawIndices);

            const rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed()
                .setTranslation(this._tempWorldPos.x, this._tempWorldPos.y, this._tempWorldPos.z)
                .setRotation({
                    x: this._tempWorldQuat.x,
                    y: this._tempWorldQuat.y,
                    z: this._tempWorldQuat.z,
                    w: this._tempWorldQuat.w
                });

            const rigidBody = this.world.createRigidBody(rigidBodyDesc);
            const colliderDesc = this.RAPIER.ColliderDesc.trimesh(positions, indices);
            if (typeof colliderDesc.setFriction === 'function') colliderDesc.setFriction(0.8);
            if (typeof colliderDesc.setRestitution === 'function') colliderDesc.setRestitution(0.0);
            const collider = this.world.createCollider(colliderDesc, rigidBody);

            (collider as any).userData = { isTerrain: true, cx: chunk.cx, cz: chunk.cz };
            (rigidBody as any).userData = { isTerrain: true, cx: chunk.cx, cz: chunk.cz };

            chunk.rigidBody = rigidBody;
            chunk.collider = collider;
        } catch (err) {
            console.warn(`[TerrainPhysicsPlugin] Failed to create collider for chunk [${chunk.cx}, ${chunk.cz}]:`, err);
        }
    }

    /**
     * Updates Rapier rigid body translation/rotation if terrain mesh moved.
     */
    public syncChunkTransform(chunk: ChunkData): void {
        if (!chunk.rigidBody || !chunk.mesh) return;

        chunk.mesh.updateWorldMatrix(true, false);
        chunk.mesh.getWorldPosition(this._tempWorldPos);
        chunk.mesh.getWorldQuaternion(this._tempWorldQuat);

        const curTrans = typeof chunk.rigidBody.translation === 'function' ? chunk.rigidBody.translation() : null;
        if (
            curTrans &&
            (Math.abs(curTrans.x - this._tempWorldPos.x) > 0.01 ||
             Math.abs(curTrans.y - this._tempWorldPos.y) > 0.01 ||
             Math.abs(curTrans.z - this._tempWorldPos.z) > 0.01)
        ) {
            if (typeof chunk.rigidBody.setTranslation === 'function') {
                chunk.rigidBody.setTranslation(this._tempWorldPos, true);
            }
            if (typeof chunk.rigidBody.setRotation === 'function') {
                chunk.rigidBody.setRotation(this._tempWorldQuat, true);
            }
        }
    }

    /**
     * Removes Rapier physics rigid body and collider from a chunk.
     */
    public removeChunkCollider(chunk: ChunkData): void {
        if (!chunk.rigidBody) return;
        if (this.world && typeof this.world.removeRigidBody === 'function') {
            try {
                this.world.removeRigidBody(chunk.rigidBody);
            } catch (err) {
                console.warn(`[TerrainPhysicsPlugin] Failed to remove rigid body for chunk [${chunk.cx}, ${chunk.cz}]:`, err);
            }
        }
        chunk.rigidBody = null;
        chunk.collider = null;
    }

    /**
     * Cleans up all chunk colliders for a given manager.
     */
    public cleanupManager(manager: TerrainChunkManager): void {
        if (!manager || !manager.chunks) return;
        for (const chunk of manager.chunks) {
            this.removeChunkCollider(chunk);
        }
    }

    onDestroy(): void {
        for (const manager of this._registeredManagers) {
            this.cleanupManager(manager);
        }
        this._registeredManagers.clear();
        TerrainPhysicsPlugin.instance = null;
    }
}
