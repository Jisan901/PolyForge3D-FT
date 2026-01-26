import { THREE } from '@/Core/lib/THREE';
import fs from '@/Core/lib/fs';
import { ThreeHelpers } from '@/Core/three/Helper';

/**
 * Supported asset types
 */
type AssetType = 'object' | 'geometry' | 'material' | 'texture'

/**
 * Internal cache entry type
 */
type CacheEntry =
    | Promise<THREE.Object3D>
    | Promise<THREE.BufferGeometry>
    | Promise<THREE.Material>
    | Promise<THREE.Texture>

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
    private cache = new Map<string, CacheEntry>()

    /** Maximum cached entries */
    private maxSize: number

    /** Three.js ObjectLoader instance */
    private objectLoader = new THREE.ObjectLoader()

    /** Three.js TextureLoader instance */
    private textureLoader = new THREE.TextureLoader()

    /**
     * Create a new MemoLoader instance.
     *
     * @param maxSize Maximum number of cached assets (default: 20)
     */
    constructor(maxSize = 20) {
        this.maxSize = maxSize
    }

    // =====================================================
    // PUBLIC API
    // =====================================================

    /**
     * Load and cache a Three.js Object3D from JSON.
     *
     * @param assetId File path or URL
     * @param clone Whether to clone before returning (default true)
     */
    loadObject(assetId: string, clone = true) {
        return this.load<THREE.Object3D>('object', assetId, clone)
    }

    /**
     * Load and cache a BufferGeometry from JSON.
     *
     * @param assetId File path or URL
     */
    loadGeometry(assetId: string) {
        return this.load<THREE.BufferGeometry>('geometry', assetId)
    }

    /**
     * Load and cache a Material from JSON.
     *
     * @param assetId File path or URL
     */
    loadMaterial(assetId: string) {
        return this.load<THREE.Material>('material', assetId)
    }

    /**
     * Load and cache a Texture.
     *
     * @param assetId File path or URL
     */
    loadTexture(assetId: string) {
        return this.load<THREE.Texture>('texture', assetId)
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

        const key = `${type}:${assetId}`

        const entry = this.cache.get(key)

        if (!entry) return false

        entry.then(asset => {
            this.disposeAsset(asset)
        })

        this.cache.delete(key)

        return true
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

        const key = `${type}:${assetId}`

        // Refresh LRU order
        if (this.cache.has(key)) {

            const entry = this.cache.get(key)!
            this.cache.delete(key)
            this.cache.set(key, entry)

            const base = await entry as any
            return clone && base.clone ? base.clone(true) : base
        }

        const promise = this.loadBase(type, assetId) as CacheEntry

        this.cache.set(key, promise)

        // Evict if over limit
        if (this.cache.size > this.maxSize) {
            this.evictOldest()
        }

        const base = await promise as any
        return clone && base.clone ? base.clone(true) : base
    }

    /**
     * Low-level asset loader router.
     */
    private loadBase(type: AssetType, assetId: string) {

        switch (type) {

            case 'object':
                return this.loadObjectBase(assetId)

            case 'geometry':
                return this.loadGeometryBase(assetId)

            case 'material':
                return this.loadMaterialBase(assetId)

            case 'texture':
                return this.loadTextureBase(assetId)

            default:
                throw new Error(`Unknown asset type: ${type}`)
        }
    }

    // =====================================================
    // LOAD IMPLEMENTATIONS
    // =====================================================

    /**
     * Load Object3D JSON.
     */
    private async loadObjectBase(url: string) {

        const data = await fs.readFile(url, 'utf8')
        const json = JSON.parse(data)

        const object = this.objectLoader.parse(json)

        object.userData.templateFile = url

        return object
    }

    /**
     * Load Geometry JSON.
     */
    private async loadGeometryBase(url: string) {

        const data = await fs.readFile(url, 'utf8')
        const json = JSON.parse(data)

        const shapes = this.objectLoader.parseShapes?.(json.shapes || [])

        const geometries = this.objectLoader.parseGeometries(
            [json],
            shapes
        )

        return Object.values(geometries)[0]
    }

    /**
     * Load Material JSON.
     */
    private async loadMaterialBase(url: string) {

        const data = await fs.readFile(url, 'utf8')
        const json = JSON.parse(data)

        const images = await this.objectLoader.parseImagesAsync(
            json.images || []
        )

        const textures = this.objectLoader.parseTextures(
            json.textures || [],
            images
        )

        const materials = this.objectLoader.parseMaterials(
            [json],
            textures
        )

        return Object.values(materials)[0]
    }

    /**
     * Load Texture file.
     */
    private async loadTextureBase(url: string) {

        return new Promise<THREE.Texture>((resolve, reject) => {

            this.textureLoader.load(
                url,
                texture => {
                    texture.userData.sourceFile = url
                    resolve(texture)
                },
                undefined,
                reject
            )

        })
    }

    // =====================================================
    // LRU MANAGEMENT
    // =====================================================

    /**
     * Evict the least recently used asset.
     */
    private evictOldest() {

        const oldestKey = this.cache.keys().next().value
        const promise = this.cache.get(oldestKey)!

        promise.then(asset => {
            this.disposeAsset(asset)
        })

        this.cache.delete(oldestKey)
    }

    // =====================================================
    // GPU RESOURCE DISPOSAL
    // =====================================================

    /**
     * Dispose Three.js asset safely.
     *
     * Supports:
     * - Object3D
     * - Geometry
     * - Material
     * - Texture
     */
    private disposeAsset(asset: any) {
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
            promise.then(asset => this.disposeAsset(asset))
        }

        this.cache.clear()
    }
}