import { AdvancedLoader } from "@/Core/Loaders/AdvancedLoader";
import { type ThreeRegistry, type AnyThree } from "@/Core/three/ThreeRegistry";

type AssetType = "object" | "geometry" | "material" | "texture" | "animation";

// =====================================================
// TYPES
// =====================================================

export interface PoolEntry {
    url: string;
    type: AssetType;
    uuid: string;
    bytes: number;
    lastUsed: number;
}

interface QueueItem {
    url: string;
    type: AssetType;
    priority: number;
    resolve: (asset: AnyThree) => void;
    reject: (err: unknown) => void;
}

type EvictCallback = (candidates: PoolEntry[]) => PoolEntry[];

// =====================================================
// STREAMER
// =====================================================

export class AssetStreamer {
    private loader: AdvancedLoader;
    private pool = new Map<string, PoolEntry>(); // key = `type:url`
    private queue: QueueItem[] = [];
    private inFlight = 0;

    private readonly budgetBytes: number;
    private readonly concurrency: number;
    private readonly immediateEvict: EvictCallback;

    private get usedBytes() {
        let total = 0;
        for (const e of this.pool.values()) total += e.bytes;
        return total;
    }

    constructor(options: {
        registry: ThreeRegistry;
        budgetMB?: number; // default 32
        concurrency?: number; // default 4
        immediateEvict: EvictCallback;
    }) {
        this.loader = new AdvancedLoader(options.registry);
        this.budgetBytes = (options.budgetMB ?? 32) * 1024 * 1024;
        this.concurrency = options.concurrency ?? 4;
        this.immediateEvict = options.immediateEvict;
    }

    // =====================================================
    // PUBLIC — DEMAND LOAD
    // =====================================================

    loadObject(url: string, priority = 0) {
        return this.enqueue<THREE.Object3D>("object", url, priority);
    }
    loadGeometry(url: string, priority = 0) {
        return this.enqueue<THREE.BufferGeometry>("geometry", url, priority);
    }
    loadMaterial(url: string, priority = 0) {
        return this.enqueue<THREE.Material>("material", url, priority);
    }
    loadTexture(url: string, priority = 0) {
        return this.enqueue<THREE.Texture>("texture", url, priority);
    }
    loadAnimation(url: string) {
        return this.loader.loadAnimation(url);
    }

    // =====================================================
    // PUBLIC — PRELOAD
    // =====================================================

    /**
     * Queue assets ahead of time without blocking.
     * Higher priority assets load first.
     */
    preload(assets: { url: string; type: AssetType; priority?: number }[]) {
        for (const a of assets) {
            this.enqueue(a.type, a.url, a.priority ?? 0).catch(() => {
                // Preload failures are silent — asset will reload on demand
            });
        }
    }

    // =====================================================
    // PUBLIC — POOL MANAGEMENT
    // =====================================================

    /**
     * Manually evict an asset by url + type.
     */
    evict(type: AssetType, url: string) {
        const key = `${type}:${url}`;
        if (!this.pool.has(key)) return;
        this.pool.delete(key);
        this.loader.evict(type, url);
    }

    getStats() {
        return {
            usedMB: +(this.usedBytes / 1024 / 1024).toFixed(2),
            budgetMB: +(this.budgetBytes / 1024 / 1024).toFixed(2),
            poolSize: this.pool.size,
            queued: this.queue.length,
            inFlight: this.inFlight
        };
    }

    // =====================================================
    // CORE
    // =====================================================

    private enqueue<T extends AnyThree>(
        type: AssetType,
        url: string,
        priority: number
    ): Promise<T> {
        // Already in pool — return immediately
        const key = `${type}:${url}`;
        const existing = this.pool.get(key);
        if (existing) {
            existing.lastUsed = Date.now();
            return this.loader[this.loaderMethod(type)](url) as Promise<T>;
        }

        return new Promise<T>((resolve, reject) => {
            this.queue.push({
                url,
                type,
                priority,
                resolve: resolve as any,
                reject
            });
            this.queue.sort((a, b) => b.priority - a.priority);
            this.tick();
        });
    }

    private tick() {
        while (this.inFlight < this.concurrency && this.queue.length > 0) {
            const item = this.queue.shift()!;
            this.inFlight++;
            this.processItem(item).finally(() => {
                this.inFlight--;
                this.tick();
            });
        }
    }

    private async processItem(item: QueueItem) {
        try {
            await this.makeRoom(item);

            const asset = (await this.loader[this.loaderMethod(item.type)](
                item.url
            )) as AnyThree;

            const bytes = (asset as any).userData?.bytes ?? 0;

            if (bytes > this.budgetBytes) {
                console.warn(
                    `[AssetStreamer] Asset "${item.url}" (${(bytes / 1024 / 1024).toFixed(1)} MB) ` +
                        `exceeds budget (${(this.budgetBytes / 1024 / 1024).toFixed(0)} MB) — loading anyway`
                );
            }

            this.pool.set(`${item.type}:${item.url}`, {
                url: item.url,
                type: item.type,
                uuid: (asset as any).uuid,
                bytes,
                lastUsed: Date.now()
            });

            item.resolve(asset);
        } catch (err) {
            item.reject(err);
        }
    }

    // =====================================================
    // EVICTION
    // =====================================================

    private async makeRoom(item: QueueItem) {
        // Estimate incoming size — unknown until loaded, use 0 as optimistic guess.
        // Real bytes get recorded after load; eviction logic still runs to free
        // space based on current pool state.
        const needed = this.budgetBytes - this.usedBytes;

        if (needed >= 0) return; // room available

        const candidates = [...this.pool.values()];

        // 1. Ask caller first
        const toEvict = this.immediateEvict(candidates);
        for (const e of toEvict) this.evict(e.type, e.url);

        // 2. Still over budget — forcefully evict random assets
        if (this.usedBytes > this.budgetBytes) {
            const remaining = [...this.pool.values()];
            this.shuffle(remaining);

            for (const e of remaining) {
                if (this.usedBytes <= this.budgetBytes) break;
                this.evict(e.type, e.url);
            }
        }
    }

    // =====================================================
    // HELPERS
    // =====================================================

    private loaderMethod(type: AssetType): keyof AdvancedLoader {
        switch (type) {
            case "object":
                return "loadObject";
            case "geometry":
                return "loadGeometry";
            case "material":
                return "loadMaterial";
            case "texture":
                return "loadTexture";
            case "animation":
                return "loadAnimation";
        }
    }

    private shuffle<T>(arr: T[]) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
}
