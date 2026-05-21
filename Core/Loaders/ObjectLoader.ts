import { THREE } from "@/Core/lib/THREE";
import fs from "@/Core/lib/fs";
import { ThreeHelpers } from "@/Core/three/Helper";
import { BinarySerializer } from "@/Core/Plugins/Three.patch.plugin";

/**
 * Supported asset types
 */
type AssetType = "object" | "geometry" | "material" | "texture" | "animation";

/**
 * Internal cache entry type
 */
type CacheEntry =
    | Promise<THREE.Object3D>
    | Promise<THREE.BufferGeometry>
    | Promise<THREE.Material>
    | Promise<THREE.Texture>
    | Promise<THREE.AnimationClip[]>;

/**
 * Memoized LRU asset loader for Three.js resources.
 *
 * Features:
 * - Promise deduplication
 * - LRU eviction
 * - GPU resource disposal
 * - Object cloning
 * - Manual invalidation
 */
export class MemoLoader {
    /** LRU cache storage */
    private cache = new Map<string, CacheEntry>();

    /** Maximum cached entries */
    private maxSize: number;

    /** Three.js ObjectLoader instance */
    private objectLoader = new THREE.ObjectLoader();
    private nodeObjectLoader = new THREE.NodeObjectLoader();

    /** Three.js TextureLoader instance */
    private textureLoader = new THREE.TextureLoader();

    /**
     * Create a new MemoLoader instance.
     *
     * @param maxSize Maximum number of cached assets (default: 20)
     */
    constructor(maxSize = 20) {
        this.maxSize = maxSize;
    }

    // =====================================================
    // PUBLIC API
    // =====================================================

    /**
     * Load and cache a Three.js Object3D from a packed binary file.
     *
     * @param assetId File path or URL
     * @param clone Whether to clone before returning (default true)
     */
    loadObject(assetId: string, clone = true) {
        return this.load<THREE.Object3D>("object", assetId, clone);
    }

    /**
     * Load and cache a BufferGeometry from a packed binary file.
     *
     * @param assetId File path or URL
     */
    loadGeometry(assetId: string) {
        return this.load<THREE.BufferGeometry>("geometry", assetId);
    }

    /**
     * Load and cache a Material from a packed binary file.
     *
     * @param assetId File path or URL
     */
    loadMaterial(assetId: string) {
        return this.load<THREE.Material>("material", assetId);
    }

    /**
     * Load and cache a Texture.
     *
     * @param assetId File path or URL
     */
    loadTexture(assetId: string) {
        return this.load<THREE.Texture>("texture", assetId);
    }

    /**
     * Load and cache AnimationClips from a packed binary file.
     *
     * The file is expected to be a BinarySerializer-packed buffer whose JSON
     * root has an `animations` array (same structure produced by
     * BinarySerializer.serializeAnimations).
     *
     * @param assetId File path or URL
     */
    loadAnimation(assetId: string) {
        return this.load<THREE.AnimationClip[]>("animation", assetId);
    }

    /**
     * Manually invalidate a cached resource.
     *
     * This will:
     * - Remove it from cache
     * - Dispose GPU memory
     * - Force reload on next request
     *
     * Useful for:
     * - Hot reload
     * - Asset editing
     * - Live pipeline updates
     *
     * @param type Asset type
     * @param assetId File path or URL
     *
     * @returns true if resource existed and was removed
     */
    invalidateResource(type: AssetType, assetId: string): boolean {
        const key = `${type}:${assetId}`;
        const entry = this.cache.get(key);

        if (!entry) return false;

        entry.then(asset => this.disposeAsset(asset));
        this.cache.delete(key);

        return true;
    }

    // =====================================================
    // CORE LOADER
    // =====================================================

    /**
     * Generic memoized loader.
     *
     * @param type Asset type
     * @param assetId File path or URL
     * @param clone Clone result (Object3D only)
     */
    private async load<T>(
        type: AssetType,
        assetId: string,
        clone = false
    ): Promise<T> {
        const key = `${type}:${assetId}`;

        // Caching disabled — load fresh every time
        if (this.maxSize === 0) {
            const base = (await this.loadBase(type, assetId)) as any;
            return clone && base.clone ? base.clone(true) : base;
        }

        // Cache hit — refresh LRU order
        if (this.cache.has(key)) {
            const entry = this.cache.get(key)!;
            this.cache.delete(key);
            this.cache.set(key, entry);

            const base = (await entry) as any;
            return clone && base.clone ? base.clone(true) : base;
        }

        const promise = this.loadBase(type, assetId) as CacheEntry;
        this.cache.set(key, promise);

        // Evict if over limit
        if (this.cache.size > this.maxSize) {
            this.evictOldest();
        }

        const base = (await promise) as any;
        return clone && base.clone ? base.clone(true) : base;
    }

    /**
     * Low-level asset loader router.
     */
    private loadBase(type: AssetType, assetId: string) {
        switch (type) {
            case "object":
                return this.loadObjectBase(assetId);
            case "geometry":
                return this.loadGeometryBase(assetId);
            case "material":
                return this.loadMaterialBase(assetId);
            case "texture":
                return this.loadTextureBase(assetId);
            case "animation":
                return this.loadAnimationBase(assetId);
            default:
                throw new Error(`Unknown asset type: ${type}`);
        }
    }

    // =====================================================
    // LOAD IMPLEMENTATIONS
    // =====================================================

    /**
     * Load a full Object3D from a BinarySerializer-packed binary file.
     * Uses BinarySerializer.unpack which handles animations, geometries,
     * and images in one pass.
     */
    private async loadObjectBase(url: string): Promise<THREE.Object3D> {
        const data = await fs.readFile(url);

        // Full unpack: resolves geometry blobs, animation blobs, image blobs
        const json = await BinarySerializer.unpack(data, this.objectLoader);

        const object = await this.objectLoader.parseAsync(json);
        object.userData.templateFile = url;

        return object;
    }

    /**
     * Load a standalone geometry from a BinarySerializer-packed binary file.
     *
     * Expected JSON structure (produced by BinarySerializer.serializeGeometries):
     * { geometries: [ <BufferGeometry JSON> ] }
     */
    private async loadGeometryBase(url: string): Promise<THREE.BufferGeometry> {
        const data = await fs.readFile(url);
        const { json, blobs } = unpackRaw(data);

        // Restore typed arrays from blobs
        BinarySerializer.unpackGeometries(json.geometries, blobs);

        const shapes = this.objectLoader.parseShapes?.(json.shapes || []);

        const geometries = this.objectLoader.parseGeometries(
            json.geometries ?? [json],
            shapes
        );

        return Object.values(geometries)[0] as THREE.BufferGeometry;
    }

    /**
     * Load a standalone material from a BinarySerializer-packed binary file.
     *
     * Expected JSON structure (produced by BinarySerializer.serializeMaterials):
     * { materials: [ <Material JSON> ], images: [...], textures: [...] }
     */
    private async loadMaterialBase(url: string): Promise<THREE.Material> {
        const data = await fs.readFile(url);
        const { json, blobs } = unpackRaw(data);

        // Restore image blobs → ImageBitmaps → THREE.Source instances
        await BinarySerializer.unpackImages(json.images ?? [], blobs);

        // Build custom parseImagesAsync so the loader picks up pre-decoded bitmaps
        const loaderWithImages = this._makeLoaderWithImages(json.images ?? []);

        const images = await loaderWithImages.parseImagesAsync(
            json.images ?? []
        );

        const textures = this.objectLoader.parseTextures(
            json.textures ?? [],
            images
        );

        const materials = this.objectLoader.parseMaterials(
            json.materials ?? [json],
            textures
        );

        return Object.values(materials)[0] as THREE.Material;
    }

    /**
     * Load standalone AnimationClips from a BinarySerializer-packed binary file.
     *
     * Expected JSON structure (produced by BinarySerializer.serializeAnimations):
     * { animations: [ <AnimationClip JSON> ] }
     */
    private async loadAnimationBase(
        url: string
    ): Promise<THREE.AnimationClip[]> {
        const data = await fs.readFile(url);
        const { json, blobs } = unpackRaw(data);

        // Restore Float32 typed arrays for times/values
        BinarySerializer.unpackAnimations(json.animations ?? [], blobs);

        return this.objectLoader.parseAnimations(json.animations ?? []);
    }

    /**
     * Load a Texture from a raw image file via TextureLoader.
     */
    private loadTextureBase(url: string): Promise<THREE.Texture> {
        return new Promise<THREE.Texture>((resolve, reject) => {
            this.textureLoader.load(
                url,
                texture => {
                    texture.userData.sourceFile = url;
                    resolve(texture);
                },
                undefined,
                reject
            );
        });
    }

    // =====================================================
    // HELPERS
    // =====================================================

    /**
     * Build a minimal ObjectLoader-compatible shim whose parseImagesAsync
     * returns the pre-decoded THREE.Source instances stored on imgMeta.source
     * (set by BinarySerializer.unpackImages).
     */
    private _makeLoaderWithImages(images: any[]) {
        return {
            parseImagesAsync: async (ig: any[]) => {
                const map: Record<string, THREE.Source> = {};
                ig?.forEach(e => {
                    if (e.source) map[e.uuid] = e.source;
                });
                return map;
            }
        };
    }

    // =====================================================
    // LRU MANAGEMENT
    // =====================================================

    /**
     * Evict the least recently used asset.
     */
    private evictOldest() {
        const oldestKey = this.cache.keys().next().value;
        const promise = this.cache.get(oldestKey)!;

        promise.then(asset => this.disposeAsset(asset));
        this.cache.delete(oldestKey);
    }

    // =====================================================
    // GPU RESOURCE DISPOSAL
    // =====================================================

    /**
     * Dispose Three.js asset safely.
     * Animations are pure CPU data — no GPU disposal needed.
     */
    private disposeAsset(asset: any) {
        if (Array.isArray(asset)) return; // AnimationClip[] — nothing to dispose
        ThreeHelpers.freeGPU(asset);
    }

    // =====================================================
    // GLOBAL CLEAR
    // =====================================================

    /**
     * Clear entire cache and free GPU memory.
     */
    clear() {
        for (const [, promise] of this.cache) {
            promise.then(asset => this.disposeAsset(asset));
        }
        this.cache.clear();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-private unpackRaw — exposes { json, blobs } without the loader shim
// so individual loaders can call only the unpack step they need.
// ─────────────────────────────────────────────────────────────────────────────
function unpackRaw(buffer: ArrayBuffer): { json: any; blobs: ArrayBuffer[] } {
    const view = new DataView(buffer);
    let off = 0;

    const count = view.getUint32(off, true);
    off += 4;
    const jLen = view.getUint32(off, true);
    off += 4;

    const json = JSON.parse(
        new TextDecoder().decode(new Uint8Array(buffer, off, jLen))
    );
    off += jLen;

    const blobs: ArrayBuffer[] = [];
    for (let i = 0; i < count; i++) {
        const len = view.getUint32(off, true);
        off += 4;
        blobs.push(buffer.slice(off, off + len));
        off += len;
    }

    return { json, blobs };
}
