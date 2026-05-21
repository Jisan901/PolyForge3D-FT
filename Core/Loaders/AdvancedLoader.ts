import { AbstractLoader, ResolvableAsset, ResolvableType } from "@/Core/Loaders/AbstractLoader";
import { type ThreeRegistry, type AnyThree } from "@/Core/three/ThreeRegistry";
import { THREE } from "@/Core/lib/THREE";
import { AnyThree } from "@/Core/three/ThreeRegistry";
import { BinarySerializer } from "@/Core/Plugins/Three.patch.plugin";


type AssetType = "object" | "geometry" | "material" | "texture" | "animation";

interface CacheEntry {
    uuid: string;
    type: AssetType;
}

export class AdvancedLoaderVc {
    private abstractLoader = new AbstractLoader();

    // url → { uuid, type }
    private cache = new Map<string, CacheEntry>();

    constructor(private registry: ThreeRegistry) {}

    // =====================================================
    // PUBLIC API
    // =====================================================

    loadObject(url: string, clone = true) {
        return this.load<THREE.Object3D>("object", url, clone);
    }

    loadGeometry(url: string) {
        return this.load<THREE.BufferGeometry>("geometry", url);
    }

    loadMaterial(url: string) {
        return this.load<THREE.Material>("material", url);
    }

    loadTexture(url: string) {
        return this.load<THREE.Texture>("texture", url);
    }

    loadAnimation(url: string) {
        return this.abstractLoader.loadAnimation(url);
        // Animations are plain data (no GPU resources),
        // so caching via registry uuid doesn't apply
    }

    // =====================================================
    // CORE
    // =====================================================

    private async load<T extends AnyThree>(
        type: AssetType,
        url: string,
        clone = false
    ): Promise<T> {
        const key = `${type}:${url}`;
        const entry = this.cache.get(key);

        // -----------------
        // Cache hit
        // -----------------
        if (entry) {
            const cached = this.resolveFromRegistry(entry);

            if (cached) {
                // clone=true: register the clone as a new instance
                if (clone && "clone" in cached) {
                    const cloned = (cached as any).clone(true) as T;
                    this.registry.register(cloned, true);
                    return cloned;
                }

                // shared ref: bump uses via register
                this.registry.register(cached);
                return cached as T;
            }

            // Stale entry — asset was evicted from registry, reload
            this.cache.delete(key);
        }

        // -----------------
        // Cache miss — load fresh
        // -----------------
        const asset = await this.loadFresh<T>(type, url);

        // Register without clone (canonical instance)
        this.registry.register(asset, type === "object");

        this.cache.set(key, { uuid: (asset as any).uuid, type });

        // Caller wants a clone of the canonical instance
        if (clone && "clone" in asset) {
            const cloned = (asset as any).clone(true) as T;
            this.registry.register(cloned, true);
            return cloned;
        }

        return asset;
    }

    // =====================================================
    // HELPERS
    // =====================================================

    private resolveFromRegistry(entry: CacheEntry): AnyThree | undefined {
        switch (entry.type) {
            case "object":
                return this.registry.getObject(entry.uuid);
            case "geometry":
                return this.registry.getGeometry(entry.uuid);
            case "material":
                return this.registry.getMaterial(entry.uuid);
            case "texture":
                return this.registry.getTexture(entry.uuid);
        }
    }

    private loadFresh<T>(type: AssetType, url: string): Promise<T> {
        switch (type) {
            case "object":
                return this.abstractLoader.loadObject(url, false) as Promise<T>;
            case "geometry":
                return this.abstractLoader.loadGeometry(url) as Promise<T>;
            case "material":
                return this.abstractLoader.loadMaterial(url) as Promise<T>;
            case "texture":
                return this.abstractLoader.loadTexture(url) as Promise<T>;
        }
    }

    // =====================================================
    // UTILS
    // =====================================================

    /**
     * Evict a cached entry without touching the registry.
     * Call when you know an asset has been fully unregistered and freed.
     */
    evict(type: AssetType, url: string) {
        this.cache.delete(`${type}:${url}`);
    }

    /**
     * Drop all cache entries (does not unregister or dispose anything).
     */
    clearCache() {
        this.cache.clear();
    }
}

export class AdvancedLoaderV2 {
    private abstractLoader = new AbstractLoader();
    private cache = new Map<string, CacheEntry>();

    constructor(private registry: ThreeRegistry) {}

    // =====================================================
    // PUBLIC API
    // =====================================================

    

    loadObject(url: string) {
        return this.load<THREE.Object3D>("object", url);
    }
    loadGeometry(url: string) {
        return this.load<THREE.BufferGeometry>("geometry", url);
    }

    loadMaterial(url: string) {
        return this.load<THREE.Material>("material", url);
    }

    loadTexture(url: string) {
        return this.load<THREE.Texture>("texture", url);
    }

    loadAnimation(url: string) {
        return this.abstractLoader.loadAnimation(url);
    }

    // =====================================================
    // CORE
    // =====================================================

    private async load<T extends AnyThree>(
        type: AssetType,
        url: string
    ): Promise<T> {
        const key = `${type}:${url}`;
        const entry = this.cache.get(key);

        if (entry) {
            const cached = this.resolveFromRegistry(entry);
            if (cached) return cached as T;
            // Stale — registry evicted it, fall through to reload
            this.cache.delete(key);
        }

        const asset = await this.loadFresh<T>(type, url);
        this.registry.register(asset, type === "object");
        this.cache.set(key, { uuid: (asset as any).uuid, type });

        return asset;
    }

    // =====================================================
    // HELPERS
    // =====================================================

    private resolveFromRegistry(entry: CacheEntry): AnyThree | undefined {
        switch (entry.type) {
            case "object":
                return this.registry.getObject(entry.uuid);
            case "geometry":
                return this.registry.getGeometry(entry.uuid);
            case "material":
                return this.registry.getMaterial(entry.uuid);
            case "texture":
                return this.registry.getTexture(entry.uuid);
        }
    }

    private loadFresh<T>(type: AssetType, url: string): Promise<T> {
        switch (type) {
            case "object":
                return this.abstractLoader.loadObject(url, false) as Promise<T>;
            case "geometry":
                return this.abstractLoader.loadGeometry(url) as Promise<T>;
            case "material":
                return this.abstractLoader.loadMaterial(url) as Promise<T>;
            case "texture":
                return this.abstractLoader.loadTexture(url) as Promise<T>;
        }
    }

    // =====================================================
    // UTILS
    // =====================================================

    evict(type: AssetType, url: string) {
        this.cache.delete(`${type}:${url}`);
    }

    clearCache() {
        this.cache.clear();
    }
}








// ─────────────────────────────────────────────────────────────────────────────
// AdvancedLoader
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Caching loader built on top of AbstractLoader.
 *
 * - Registry-backed cache: stale entries (registry-evicted) trigger reload.
 * - Inflight deduplication: concurrent calls for the same url share one fetch.
 * - Animations bypass caching — loaded fresh, not tracked in registry.
 * - resolveStub() is overridden so that when an Object3D references any
 *   external asset (material, geometry, texture) by URL, the registry is
 *   checked first — no redundant disk loads.
 */
export class AdvancedLoaderv3 extends AbstractLoader {
    /** Registry-backed asset cache: "type:url" → { uuid, type } */
    private cache = new Map<string, CacheEntry>();

    /** Inflight requests: "type:url" → in-progress Promise */
    private inflight = new Map<string, Promise<AnyThree>>();

    constructor(private registry: ThreeRegistry) {
        super();
    }

    // =========================================================================
    // Public API
    // =========================================================================

    loadObject(url: string): Promise<THREE.Object3D> {
        return this.load<THREE.Object3D>("object", url);
    }

    loadGeometry(url: string): Promise<THREE.BufferGeometry> {
        return this.load<THREE.BufferGeometry>("geometry", url);
    }

    loadMaterial(url: string): Promise<THREE.Material> {
        return this.load<THREE.Material>("material", url);
    }

    loadTexture(url: string): Promise<THREE.Texture> {
        return this.load<THREE.Texture>("texture", url);
    }

    /** Animations are not cached or registered — always loaded fresh. */
    loadAnimation(url: string): Promise<THREE.AnimationClip[]> {
        return super.loadAnimation(url);
    }

    // =========================================================================
    // Registry hook — called by AbstractLoader.resolveExternalStubs()
    // =========================================================================

    /**
     * Single override handles materials, geometries, and textures uniformly.
     * Checks the registry cache by type + url; returns the live asset if found,
     * null if missing or stale (AbstractLoader falls back to disk).
     */
    protected override async resolveStub(
        type: ResolvableType,
        url: string
    ): Promise<ResolvableAsset | null> {
        const key = `${type}:${url}`;
        const entry = this.cache.get(key);
        console.log(type,url, ...this.cache.values())
        if (!entry) return null;

        const live = this.resolveFromRegistry(entry);
        if (!live) {
            // Registry evicted it — drop stale entry, let it reload from disk
            this.cache.delete(key);
            return null;
        }

        return live as ResolvableAsset;
    }

    // =========================================================================
    // Core
    // =========================================================================

    private async load<T extends AnyThree>(type: AssetType, url: string): Promise<T> {
        const key = `${type}:${url}`;

        // 1. Registry-backed cache check
        const entry = this.cache.get(key);
        if (entry) {
            const live = this.resolveFromRegistry(entry);
            if (live) return live as T;
            // Registry evicted — reload
            this.cache.delete(key);
        }

        // 2. Inflight deduplication
        const existing = this.inflight.get(key);
        if (existing) return existing as Promise<T>;

        // 3. Fresh load
        const promise = this.loadFresh<T>(type, url)
            .then(asset => {
                this.registry.register(asset, type === "object");
                this.cache.set(key, { uuid: (asset as any).uuid, type });
                this.inflight.delete(key);
                return asset;
            })
            .catch(err => {
                this.inflight.delete(key);
                throw err;
            });

        this.inflight.set(key, promise as Promise<AnyThree>);
        return promise;
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private resolveFromRegistry(entry: CacheEntry): AnyThree | undefined {
        switch (entry.type) {
            case "object":   return this.registry.getObject(entry.uuid);
            case "geometry": return this.registry.getGeometry(entry.uuid);
            case "material": return this.registry.getMaterial(entry.uuid);
            case "texture":  return this.registry.getTexture(entry.uuid);
            default:         return undefined;
        }
    }

    private loadFresh<T extends AnyThree>(type: AssetType, url: string): Promise<T> {
        switch (type) {
            case "object":   return super.loadObject(url, false) as Promise<T>;
            case "geometry": return super.loadGeometry(url) as Promise<T>;
            case "material": return super.loadMaterial(url) as Promise<T>;
            case "texture":  return super.loadTexture(url) as Promise<T>;
            default:
                throw new Error(`Unknown asset type: ${type satisfies never}`);
        }
    }

    // =========================================================================
    // Cache management
    // =========================================================================

    evict(type: AssetType, url: string): void {
        this.cache.delete(`${type}:${url}`);
    }

    clearCache(): void {
        this.cache.clear();
    }
}




// ─────────────────────────────────────────────────────────────────────────────
// AdvancedLoader
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Caching loader built on top of AbstractLoader.
 *
 * - Registry-backed cache: stale entries (registry-evicted) trigger reload.
 * - Inflight deduplication: concurrent calls for the same url share one fetch.
 * - Animations bypass caching — loaded fresh, not tracked in registry.
 * - resolveStub() is overridden so that when an Object3D references any
 *   external asset (material, geometry, texture) by URL, the full load()
 *   pipeline is used — registry check, inflight dedup, fresh load, register,
 *   cache — ensuring sub-assets are always tracked and never double-loaded.
 */
export class AdvancedLoader extends AbstractLoader {
    /** Registry-backed asset cache: "type:url" → { uuid, type } */
    private cache = new Map<string, CacheEntry>();

    /** Inflight requests: "type:url" → in-progress Promise */
    private inflight = new Map<string, Promise<AnyThree>>();

    constructor(private registry: ThreeRegistry) {
        super();
    }

    // =========================================================================
    // Public API
    // =========================================================================

    loadObject(url: string): Promise<THREE.Object3D> {
        return this.load<THREE.Object3D>("object", url);
    }

    loadGeometry(url: string): Promise<THREE.BufferGeometry> {
        return this.load<THREE.BufferGeometry>("geometry", url);
    }

    loadMaterial(url: string): Promise<THREE.Material> {
        return this.load<THREE.Material>("material", url);
    }

    loadTexture(url: string): Promise<THREE.Texture> {
        return this.load<THREE.Texture>("texture", url);
    }

    /** Animations are not cached or registered — always loaded fresh. */
    loadAnimation(url: string): Promise<THREE.AnimationClip[]> {
        return super.loadAnimation(url);
    }

    // =========================================================================
    // Registry hook — called by AbstractLoader.resolveExternalStubs()
    // =========================================================================

    /**
     * Delegates to the full load() pipeline (registry check → inflight dedup
     * → fresh load → register → cache).
     *
     * Because this always returns a live asset (never null), AbstractLoader's
     * inline-into-JSON fallback is never triggered for sub-assets — they are
     * always injected into StubContext by uuid, which is the cleaner parse path.
     *
     * ResolvableType excludes "object" and "animation", so the cast to AssetType
     * is safe — load() will never hit those branches from here.
     */
    protected override async resolveStub(
        type: ResolvableType,
        url: string
    ): Promise<ResolvableAsset> {
        console.log(type,url,[...this.cache.keys()],[...this.cache.values()])
        return this.load(type as AssetType, url) as Promise<ResolvableAsset>;
    }

    // =========================================================================
    // Core
    // =========================================================================

    private async load<T extends AnyThree>(type: AssetType, url: string): Promise<T> {
        const key = `${type}:${url}`;

        // 1. Registry-backed cache check
        const entry = this.cache.get(key);
        if (entry) {
            const live = this.resolveFromRegistry(entry);
            if (live) return live as T;
            // Registry evicted — drop stale entry, fall through to reload
            this.cache.delete(key);
        }

        // 2. Inflight deduplication
        const existing = this.inflight.get(key);
        if (existing) return existing as Promise<T>;

        // 3. Fresh load
        const promise = this.loadFresh<T>(type, url)
            .then(asset => {
                this.registry.register(asset, type === "object");
                this.cache.set(key, { uuid: (asset as any).uuid, type });
                this.inflight.delete(key);
                console.log([...this.cache.keys()],[...this.cache.values()])
                return asset;
            })
            .catch(err => {
                this.inflight.delete(key);
                throw err;
            });

        this.inflight.set(key, promise as Promise<AnyThree>);
        return promise;
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private resolveFromRegistry(entry: CacheEntry): AnyThree | undefined {
        switch (entry.type) {
            case "object":   return this.registry.getObject(entry.uuid);
            case "geometry": return this.registry.getGeometry(entry.uuid);
            case "material": return this.registry.getMaterial(entry.uuid);
            case "texture":  return this.registry.getTexture(entry.uuid);
            default:         return undefined;
        }
    }

    private loadFresh<T extends AnyThree>(type: AssetType, url: string): Promise<T> {
        switch (type) {
            case "object":   return super.loadObject(url, false) as Promise<T>;
            case "geometry": return super.loadGeometry(url) as Promise<T>;
            case "material": return super.loadMaterial(url) as Promise<T>;
            case "texture":  return super.loadTexture(url) as Promise<T>;
            default:
                throw new Error(`Unknown asset type: ${type satisfies never}`);
        }
    }

    // =========================================================================
    // Cache management
    // =========================================================================

    evict(type: AssetType, url: string): void {
        this.cache.delete(`${type}:${url}`);
    }

    clearCache(): void {
        this.cache.clear();
    }
}