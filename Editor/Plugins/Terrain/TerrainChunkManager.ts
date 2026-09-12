import { THREE } from '@/Core/lib/THREE';
import fs from '@/Core/lib/fs';
import { MemoLoader } from '@/Core/Loaders/ObjectLoader';
import { Editor } from '@/Editor/Editor';
import { TerrainManifest } from './TerrainGenerationService';
import TerrainPhysicsPlugin from './TerrainPhysics.plugin';
import terrainMaterial from './TerrainMaterial';

export interface ChunkData {
    cx: number;
    cz: number;
    center: [number, number];
    lodFilePaths: Record<number, string> | string[];
    mesh: THREE.Mesh | null;
    currentLod: number; // -1 if unloaded or placeholder
    geometries: Record<number, THREE.BufferGeometry | null> | (THREE.BufferGeometry | null)[];
    isLoading: boolean;
    loadingLod: number;
    rigidBody?: any | null;
    collider?: any | null;
}

export class TerrainChunkManager extends THREE.Group {
    public isTerrainChunkManager = true;
    public sharedMaterial: THREE.Material;
    public manifest: TerrainManifest | null = null;
    public chunks: ChunkData[] = [];
    public minLod: number = 0;
    public maxLod: number = 4;
    public lodDistances: number[] = [60, 90, 150, 300];
    public maxDistance: number = 800;
    public unloadHysteresis: number = 1.15; // 15% extra distance before unloading to prevent boundary flickering
    public loader: MemoLoader;
    public enablePhysics: boolean = true;

    private static _emptyGeo = new THREE.BufferGeometry();

    private _camPos = new THREE.Vector3();
    private _lastCamCheckPos = new THREE.Vector3(Infinity, Infinity, Infinity);
    private _minCamDistanceThreshold = 1.0; // Recalculate if moved > 1 unit

    // Concurrency control for async geometry loading
    private _activeLoads = 0;
    private _maxConcurrentLoads = 12;
    private _loadQueue: { chunk: ChunkData; lod: number; distSq: number }[] = [];

    constructor(sharedMaterial?: THREE.Material) {
        super();
        this.name = 'Terrain';

        // Single shared material across every chunk in the terrain (defaults to next-gen TSL procedural material)
        this.sharedMaterial = sharedMaterial || terrainMaterial;

        // Use high capacity so active geometries are never evicted/disposed while visible
        this.loader = new MemoLoader(10000);

        // Automatic frame update hook via Three.js render pipeline
        // this.onBeforeRender = (
        //     _renderer: any,
        //     _scene: any,
        //     camera: any
        // ) => {
        //     this.update(camera);
        // };
    }

    /**
     * Initializes chunk metadata from in-memory geometries (e.g. after editor baking).
     * Meshes are NOT all created at once; only visible chunks are spawned.
     */
    public initFromGenerated(
        manifest: TerrainManifest,
        geometriesMap: Map<string, THREE.BufferGeometry>
    ): void {
        this.clearExisting();
        this.manifest = manifest;
        this.minLod = manifest.minLod !== undefined ? manifest.minLod : 0;
        this.maxLod = manifest.maxLod !== undefined ? manifest.maxLod : (manifest.lodLevels - 1);
        this.lodDistances = manifest.lodDistances || [60, 120, 240, 500];
        this.maxDistance = manifest.maxDistance || 800;

        for (const info of manifest.chunks) {
            const geometries: Record<number, THREE.BufferGeometry | null> = {};
            for (let lod = this.minLod; lod <= this.maxLod; lod++) {
                const geo = geometriesMap.get(`${info.cx}_${info.cz}_${lod}`) || null;
                if (geo) {
                    geo.computeBoundingBox();
                    geo.computeBoundingSphere();
                }
                geometries[lod] = geo;
            }

            const chunkData: ChunkData = {
                cx: info.cx,
                cz: info.cz,
                center: info.center,
                lodFilePaths: info.lods,
                mesh: null,
                currentLod: -1,
                geometries,
                isLoading: false,
                loadingLod: -1
            };

            this.chunks.push(chunkData);
        }

        this._lastCamCheckPos.set(Infinity, Infinity, Infinity);
        this.update();
    }

    /**
     * Loads chunk metadata from a manifest file on disk.
     * ZERO meshes and ZERO geometries are loaded at startup.
     * Only visible chunks within maxDistance are loaded on demand.
     */
    public async loadFromManifest(manifestPath: string): Promise<void> {
        const raw = await fs.readFile(manifestPath, { encoding: "utf-8" });
        const jsonStr = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
        const manifest: TerrainManifest = JSON.parse(jsonStr);

        this.clearExisting();
        this.manifest = manifest;
        this.minLod = manifest.minLod !== undefined ? manifest.minLod : 0;
        this.maxLod = manifest.maxLod !== undefined ? manifest.maxLod : (manifest.lodLevels - 1);
        this.lodDistances = manifest.lodDistances || [60, 120, 240, 500];
        this.maxDistance = manifest.maxDistance || 800;

        // Store metadata only (no mesh creation, no file loading at startup)
        for (const info of manifest.chunks) {
            const geometries: Record<number, THREE.BufferGeometry | null> = {};
            for (let lod = this.minLod; lod <= this.maxLod; lod++) {
                geometries[lod] = null;
            }

            const chunkData: ChunkData = {
                cx: info.cx,
                cz: info.cz,
                center: info.center,
                lodFilePaths: info.lods,
                mesh: null,
                currentLod: -1,
                geometries,
                isLoading: false,
                loadingLod: -1
            };

            this.chunks.push(chunkData);
        }

        this._lastCamCheckPos.set(Infinity, Infinity, Infinity);
        this.update();
    }

    /**
     * Updates visible chunks: spawns meshes for chunks entering maxDistance,
     * unloads meshes for chunks leaving maxDistance, and swaps LOD levels.
     * Accepts a Camera or an Object3D (e.g. player target).
     */
    public update(cameraOrTarget?: THREE.Camera | THREE.Object3D): void {
        if (this.chunks.length === 0) return;

        // 1. Resolve target world position
        if (cameraOrTarget) {
            cameraOrTarget.getWorldPosition(this._camPos);
        } else {
            const cam = this.resolveActiveCamera();
            if (cam) cam.getWorldPosition(this._camPos);
            else return;
        }

        // 2. Transform world camera position into local space of Terrain
        this.worldToLocal(this._camPos);

        const distMovedSq = this._camPos.distanceToSquared(this._lastCamCheckPos);
        const hasPendingChunks = this._loadQueue.length > 0 || this.chunks.some(c => c.mesh !== null && c.currentLod === -1);

        // If target hasn't moved and no visible chunks are pending load, continue queue processing and return
        if (distMovedSq < (this._minCamDistanceThreshold * this._minCamDistanceThreshold) && !hasPendingChunks) {
            this.processQueue();
            return;
        }
        this._lastCamCheckPos.copy(this._camPos);

        const minLod = this.manifest?.minLod !== undefined ? this.manifest.minLod : this.minLod;
        const maxLod = this.manifest?.maxLod !== undefined ? this.manifest.maxLod : this.maxLod;
        const maxDistSq = this.maxDistance * this.maxDistance;
        const unloadDist = this.maxDistance * this.unloadHysteresis;
        const unloadDistSq = unloadDist * unloadDist;

        for (let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i];

            // 2D distance squared in Terrain local space
            const dx = this._camPos.x - chunk.center[0];
            const dz = this._camPos.z - chunk.center[1];
            const distSq = dx * dx + dz * dz;

            // ── CASE 1: UNLOAD OUT-OF-RANGE CHUNKS ──────────────────
            if (distSq > unloadDistSq) {
                if (chunk.mesh !== null) {
                    TerrainPhysicsPlugin.instance?.removeChunkCollider(chunk);
                    this.remove(chunk.mesh);
                    chunk.mesh = null;
                    chunk.currentLod = -1;
                    chunk.isLoading = false;
                    chunk.loadingLod = -1;
                }
                continue;
            }

            // ── CASE 2: VISIBLE CHUNKS (LOAD / SWAP LOD) ────────────
            if (distSq <= maxDistSq || chunk.mesh !== null) {
                const dist = Math.sqrt(distSq);

                // Determine target LOD for this distance within [minLod, maxLod]
                let targetLod = minLod;
                for (let l = 0; l < this.lodDistances.length; l++) {
                    if (dist > this.lodDistances[l]) {
                        targetLod = minLod + l + 1;
                    }
                }
                targetLod = Math.min(targetLod, maxLod);

                // Find any fallback geometry already in memory so there are NO HOLES while target LOD loads
                let fallbackGeo: THREE.BufferGeometry | null = null;
                if (chunk.geometries[targetLod]) {
                    fallbackGeo = chunk.geometries[targetLod];
                } else {
                    for (let f = minLod; f <= maxLod; f++) {
                        if (chunk.geometries[f]) {
                            fallbackGeo = chunk.geometries[f];
                            break;
                        }
                    }
                }

                // Spawn mesh if not yet in scene
                if (chunk.mesh === null) {
                    const chunkMesh = new THREE.Mesh(
                        fallbackGeo || TerrainChunkManager._emptyGeo,
                        this.sharedMaterial
                    );
                    chunkMesh.name = `Chunk_${chunk.cx}_${chunk.cz}`;
                    chunkMesh.position.set(chunk.center[0], 0, chunk.center[1]);
                    chunkMesh.receiveShadow = true;
                    chunkMesh.castShadow = true;
                    chunkMesh.frustumCulled = false; // Prevent premature clipping by camera frustum

                    this.add(chunkMesh);
                    chunk.mesh = chunkMesh;

                    if (fallbackGeo && chunk.geometries[targetLod]) {
                        chunk.currentLod = targetLod;
                    }
                }

                // If geometry for target LOD is needed
                if (chunk.currentLod !== targetLod) {
                    const cachedGeo = chunk.geometries[targetLod];
                    if (cachedGeo) {
                        chunk.mesh.geometry = cachedGeo;
                        chunk.currentLod = targetLod;
                    } else if (chunk.loadingLod !== targetLod && !chunk.isLoading) {
                        this.enqueueLoad(chunk, targetLod, distSq);
                    }
                }
            }
        }

        // Delegate physics synchronization on first LOD chunks to TerrainPhysicsPlugin
        TerrainPhysicsPlugin.instance?.syncManager(this);

        this.processQueue();
    }

    /**
     * Enqueues an async load for a chunk's specific LOD, prioritized by distance.
     */
    private enqueueLoad(chunk: ChunkData, lod: number, distSq: number): void {
        chunk.loadingLod = lod;
        const existingIdx = this._loadQueue.findIndex(q => q.chunk === chunk);
        if (existingIdx !== -1) {
            this._loadQueue[existingIdx].lod = lod;
            this._loadQueue[existingIdx].distSq = distSq;
            return;
        }

        this._loadQueue.push({ chunk, lod, distSq });
    }

    /**
     * Processes queue items up to max concurrency, sorted closest to camera first.
     */
    private processQueue(): void {
        if (this._loadQueue.length === 0 || this._activeLoads >= this._maxConcurrentLoads) {
            return;
        }

        // Sort closest first
        this._loadQueue.sort((a, b) => a.distSq - b.distSq);

        while (this._loadQueue.length > 0 && this._activeLoads < this._maxConcurrentLoads) {
            const item = this._loadQueue.shift()!;
            this.executeLoad(item.chunk, item.lod);
        }
    }

    private async executeLoad(chunk: ChunkData, lod: number): Promise<void> {
        // If already loaded in memory
        if (chunk.geometries[lod]) {
            if (chunk.mesh) {
                chunk.mesh.geometry = chunk.geometries[lod]!;
                chunk.currentLod = lod;
                TerrainPhysicsPlugin.instance?.syncManager(this);
            }
            chunk.isLoading = false;
            chunk.loadingLod = -1;
            return;
        }

        const filePath = chunk.lodFilePaths[lod];
        if (!filePath) {
            chunk.isLoading = false;
            chunk.loadingLod = -1;
            return;
        }

        this._activeLoads++;
        chunk.isLoading = true;

        try {
            const geo = await this.loader.loadGeometry(filePath);
            if (geo) {
                geo.computeBoundingBox();
                geo.computeBoundingSphere();
                chunk.geometries[lod] = geo;

                // Apply to mesh if mesh is active
                if (chunk.mesh) {
                    chunk.mesh.geometry = geo;
                    chunk.currentLod = lod;
                    TerrainPhysicsPlugin.instance?.syncManager(this);
                }
            }
        } catch (err) {
            console.error(`[TerrainChunkManager] Failed to load LOD ${lod} for chunk [${chunk.cx}, ${chunk.cz}] (${filePath}):`, err);
        } finally {
            chunk.isLoading = false;
            chunk.loadingLod = -1;
            this._activeLoads--;
            this.processQueue();
        }
    }

    private resolveActiveCamera(): THREE.Camera | null {
        try {
            if (Editor?.core?.engine?.getActiveCamera) {
                const cam = Editor.core.engine.getActiveCamera();
                if (cam) return cam;
            }
            if (Editor?.api?.three?.editorCamera) {
                return Editor.api.three.editorCamera;
            }
        } catch {
            // Ignore if Editor is not initialized
        }
        return null;
    }

    public clearExisting(): void {
        TerrainPhysicsPlugin.instance?.cleanupManager(this);
        for (const chunk of this.chunks) {
            if (chunk.mesh) {
                this.remove(chunk.mesh);
                chunk.mesh = null;
            }
            for (const geo of Object.values(chunk.geometries)) {
                if (geo && geo !== TerrainChunkManager._emptyGeo) {
                    geo.dispose();
                }
            }
        }
        this.chunks = [];
        this._loadQueue = [];
        this._activeLoads = 0;
    }

    public dispose(): void {
        this.clearExisting();
        if (this.sharedMaterial) {
            this.sharedMaterial.dispose();
        }
    }
}
