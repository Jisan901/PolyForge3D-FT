import { THREE } from "@/Core/lib/THREE";
import fs from "@/Core/lib/fs";
import { BinarySerializer } from "@/Core/Plugins/Three.patch.plugin";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AssetType = "object" | "geometry" | "material" | "texture" | "animation";

export type ResolvableType = Exclude<AssetType, "object" | "animation">;

export type ResolvableAsset =
    | THREE.Material
    | THREE.BufferGeometry
    | THREE.Texture;

/** Raw unpacked binary data — JSON manifest + binary blobs. */
export interface UnpackedData {
    json: any;
    blobs: ArrayBuffer[];
    bytes: number;
}

/**
 * Pre-resolved stub assets to inject into the parse pipeline.
 * Populated by resolveExternalStubs(); each map is keyed by the stub's uuid
 * (the same uuid that json.object's children reference).
 */
export interface StubContext {
    materials:  Record<string, THREE.Material>;
    geometries: Record<string, THREE.BufferGeometry>;
    textures:   Record<string, THREE.Texture>;
}

/**
 * Mirrors every intermediate result produced by THREE.ObjectLoader.parseAsync.
 * Any field you pre-populate is used as-is; missing fields are computed from
 * the JSON by parseObjectWithContext().
 */
export interface ObjectParseContext {
    json: any;
    animations?: THREE.AnimationClip[];
    shapes?:     Record<string, THREE.Shape>;
    geometries?: Record<string, THREE.BufferGeometry>;
    images?:     Record<string, THREE.Source>;
    textures?:   Record<string, THREE.Texture>;
    materials?:  Record<string, THREE.Material>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-private binary unpacker
// ─────────────────────────────────────────────────────────────────────────────

function unpackRaw(buffer: ArrayBuffer): Omit<UnpackedData, "bytes"> {
    const view = new DataView(buffer);
    let off = 0;

    const count = view.getUint32(off, true); off += 4;
    const jLen  = view.getUint32(off, true); off += 4;

    const json = JSON.parse(
        new TextDecoder().decode(new Uint8Array(buffer, off, jLen))
    );
    off += jLen;

    const blobs: ArrayBuffer[] = [];
    for (let i = 0; i < count; i++) {
        const len = view.getUint32(off, true); off += 4;
        blobs.push(buffer.slice(off, off + len));
        off += len;
    }

    return { json, blobs };
}

// ─────────────────────────────────────────────────────────────────────────────
// AbstractLoader
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asset loader for Three.js resources.
 *
 * Three layers:
 *  1. `load*Raw`                → I/O only; returns UnpackedData
 *  2. `parse*` / `parseObjectWithContext` → Three.js construction from data
 *  3. `load*`                   → convenience: raw + parse + userData stamp
 *
 * Extension point: override `resolveStub(type, url)` to intercept any external
 * stub resolution during object loading — e.g. to serve from a registry cache
 * instead of always fetching from disk.
 */
export class AbstractLoader {
    protected objectLoader = new THREE.ObjectLoader();

    constructor() {}

    // =========================================================================
    // Extension point
    // =========================================================================

    /**
     * Called for every external stub (mat.url / geo.url / tex.url) found in an
     * Object3D manifest during loadObjectRaw().
     *
     * Default: always returns null → fall through to disk load.
     * Override in a subclass to serve from a cache or registry.
     *
     * Returning a live asset bypasses disk loading and JSON merging for that
     * stub — it is injected directly into the parse context by uuid.
     * Returning null falls back to the default disk load + JSON inline.
     */
    protected async resolveStub(
        _type: ResolvableType,
        _url: string
    ): Promise<ResolvableAsset | null> {
        return null;
    }

    // =========================================================================
    // 1. Convenience API  (load = raw → parse → stamp userData)
    // =========================================================================

    public async loadObject(assetId: string, clone = true): Promise<THREE.Object3D> {
        const raw = await this.loadObjectRaw(assetId);
        const object = await this.parseObjectWithContext({
            json:       raw.json,
            materials:  raw.stubs.materials,
            geometries: raw.stubs.geometries,
            textures:   raw.stubs.textures,
        });
        object.userData.bytes = raw.bytes;
        object.userData.templateFile = assetId;
        return clone && object.clone ? object.clone(true) : object;
    }

    public async loadGeometry(assetId: string): Promise<THREE.BufferGeometry> {
        const raw = await this.loadGeometryRaw(assetId);
        const geo = this.parseGeometry(raw);
        geo.userData.bytes = raw.bytes;
        return geo;
    }

    public async loadMaterial(assetId: string): Promise<THREE.Material> {
        const raw = await this.loadMaterialRaw(assetId);
        const mat = await this.parseMaterial(raw);
        mat.userData.bytes = raw.bytes;
        mat.userData.url = assetId;
        return mat;
    }

    public async loadTexture(assetId: string): Promise<THREE.Texture> {
        const raw = await this.loadTextureRaw(assetId);
        const tex = await this.parseTexture(raw);
        tex.userData.bytes = raw.bytes;
        tex.userData.url = assetId;
        tex.userData.sourceFile = assetId;
        return tex;
    }

    public async loadAnimation(assetId: string): Promise<THREE.AnimationClip[]> {
        const raw = await this.loadAnimationRaw(assetId);
        return this.parseAnimation(raw);
    }

    // =========================================================================
    // 2. Raw loaders  — I/O + blob decode, no Three.js object construction
    // =========================================================================

    /**
     * Read + BinarySerializer.unpack + resolve all external stubs.
     * Returns the JSON manifest, byte count, and a StubContext containing
     * any pre-resolved assets to be injected into parseObjectWithContext.
     */
    public async loadObjectRaw(
        url: string
    ): Promise<{ json: any; bytes: number; stubs: StubContext }> {
        const data = await fs.readFile(url);
        const json = await BinarySerializer.unpack(data, this.objectLoader);
        const stubs = await this.resolveExternalStubs(json);
        return { json, bytes: data.byteLength, stubs };
    }

    /** Read + unpack + restore geometry typed-array blobs. */
    public async loadGeometryRaw(url: string): Promise<UnpackedData> {
        const data = await fs.readFile(url);
        const { json, blobs } = unpackRaw(data);
        BinarySerializer.unpackGeometries(json.geometries, blobs);
        return { json, blobs, bytes: data.byteLength };
    }

    /** Read + unpack + decode image blobs to ImageBitmaps. */
    public async loadMaterialRaw(url: string): Promise<UnpackedData> {
        const data = await fs.readFile(url);
        const { json, blobs } = unpackRaw(data);
        await BinarySerializer.unpackImages(json.images ?? [], blobs);
        return { json, blobs, bytes: data.byteLength };
    }

    /** Read + unpack + decode image blobs to ImageBitmaps. */
    public async loadTextureRaw(url: string): Promise<UnpackedData> {
        const data = await fs.readFile(url);
        const { json, blobs } = unpackRaw(data);
        await BinarySerializer.unpackImages(json.images ?? [], blobs);
        return { json, blobs, bytes: data.byteLength };
    }

    /** Read + unpack + restore animation Float32 typed-array blobs. */
    public async loadAnimationRaw(url: string): Promise<UnpackedData> {
        const data = await fs.readFile(url);
        const { json, blobs } = unpackRaw(data);
        BinarySerializer.unpackAnimations(json.animations ?? [], blobs);
        return { json, blobs, bytes: data.byteLength };
    }

    // =========================================================================
    // 3. Parsers  — Three.js object construction from already-unpacked data
    // =========================================================================

    /**
     * Full Object3D pipeline with per-stage injection.
     * Pre-built maps in the context are merged with JSON-parsed results;
     * context values win on uuid collision (registry assets take precedence
     * over anything in the JSON).
     */
    public async parseObjectWithContext(ctx: ObjectParseContext): Promise<THREE.Object3D> {
        const { json } = ctx;

        const animations = ctx.animations
            ?? this.objectLoader.parseAnimations(json.animations ?? []);

        const shapes = ctx.shapes
            ?? this.objectLoader.parseShapes?.(json.shapes ?? [])
            ?? {};

        // Merge: JSON-parsed geometries as base, pre-built stubs override
        const jsonGeometries = this.objectLoader.parseGeometries(json.geometries ?? [], shapes);
        const geometries = ctx.geometries
            ? { ...jsonGeometries, ...ctx.geometries }
            : jsonGeometries;

        const images = ctx.images
            ?? await this._buildImageMap(json.images ?? []);

        // Merge: JSON-parsed textures as base, pre-built stubs override
        const jsonTextures = this.objectLoader.parseTextures(json.textures ?? [], images);
        const textures = ctx.textures
            ? { ...jsonTextures, ...ctx.textures }
            : jsonTextures;

        // Merge: JSON-parsed materials as base, pre-built stubs override
        const jsonMaterials = this.objectLoader.parseMaterials(json.materials ?? [], textures);
        const materials = ctx.materials
            ? { ...jsonMaterials, ...ctx.materials }
            : jsonMaterials;

        const object = this.objectLoader.parseObject(
            json.object,
            geometries,
            materials,
            textures,
            animations
        );

        const skeletons = this.objectLoader.parseSkeletons(json.skeletons ?? [], object);
        this.objectLoader.bindSkeletons(object, skeletons);
        this.objectLoader.bindLightTargets?.(object);

        return object;
    }

    /** Parse a standalone BufferGeometry from unpacked data. */
    public parseGeometry(raw: UnpackedData): THREE.BufferGeometry {
        const shapes = this.objectLoader.parseShapes?.(raw.json.shapes ?? []) ?? {};
        const geometries = this.objectLoader.parseGeometries(
            raw.json.geometries ?? [raw.json],
            shapes
        );
        return Object.values(geometries)[0] as THREE.BufferGeometry;
    }

    /** Parse a standalone Material from unpacked data (images must be pre-decoded). */
    public async parseMaterial(raw: UnpackedData): Promise<THREE.Material> {
        const images    = await this._buildImageMap(raw.json.images ?? []);
        const textures  = this.objectLoader.parseTextures(raw.json.textures ?? [], images);
        const materials = this.objectLoader.parseMaterials(raw.json.materials ?? [raw.json], textures);
        return Object.values(materials)[0] as THREE.Material;
    }

    /** Parse a standalone Texture from unpacked data (images must be pre-decoded). */
    public async parseTexture(raw: UnpackedData): Promise<THREE.Texture> {
        const images   = await this._buildImageMap(raw.json.images ?? []);
        const textures = this.objectLoader.parseTextures(raw.json.textures ?? [], images);
        return Object.values(textures)[0] as THREE.Texture;
    }

    /** Parse AnimationClips from unpacked data (typed arrays must be restored). */
    public parseAnimation(raw: UnpackedData): THREE.AnimationClip[] {
        return this.objectLoader.parseAnimations(raw.json.animations ?? []);
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    /**
     * Walk all stub arrays in the Object3D JSON and resolve each stub.
     *
     * Per stub:
     *   a) resolveStub(type, url) returns a live asset → store in StubContext
     *      by uuid; null out the stub so the JSON parser never sees it.
     *   b) resolveStub returns null → load from disk, inline the full JSON
     *      fragment back into the manifest (legacy path).
     *
     * Adding a new stub type in future:
     *   1. Add its url-field convention to your serializer
     *   2. Add a case to the switch below for its fallback inline path
     *   3. Everything else (hook, cache, inject) works automatically
     */
    /**
     * Walk all stub arrays in a JSON fragment and resolve each stub.
     *
     * Recursive: when a material is loaded from disk its JSON is also passed
     * through resolveExternalStubs before being inlined — so tex.url stubs
     * inside a material file are resolved with the same hook and dedup logic.
     *
     * seenImages is threaded through all recursion levels so images are never
     * duplicated across merged fragments.
     *
     * Adding a new stub type in future:
     *   1. Add its url-field convention to your serializer
     *   2. Add a case to the switch below for its fallback inline path
     *   3. Everything else (hook, StubContext inject, recursion) works automatically
     */
    private async resolveExternalStubs(
        json: any,
        stubs: StubContext = { materials: {}, geometries: {}, textures: {} },
        seenImages: Set<string> = new Set()
    ): Promise<StubContext> {

        const resolve = async (
            type: ResolvableType,
            array: any[],
            index: number,
            stub: any
        ) => {
            if (!stub?.url) return;

            const live = await this.resolveStub(type, stub.url);

            if (live) {
                // Registry hit — inject by uuid, strip stub from JSON
                (stubs[`${type}s`] as Record<string, ResolvableAsset>)[stub.uuid] = live;
                array[index] = null;
                return;
            }

            // Registry miss — load from disk and inline into manifest
            switch (type) {
                case "material": {
                    const raw = await this.loadMaterialRaw(stub.url);
                    const matJson = raw.json;

                    // Recurse: resolve any tex.url stubs inside the material file
                    // before inlining it. Shares stubs + seenImages with the parent
                    // so registry hits at this level are also tracked, and images
                    // deduped across the whole tree.
                    await this.resolveExternalStubs(matJson, stubs, seenImages);

                    array[index] = matJson.materials[0];
                    json.textures = [...(json.textures ?? []), ...(matJson.textures ?? [])];
                    for (const img of matJson.images ?? []) {
                        if (!seenImages.has(img.uuid)) {
                            seenImages.add(img.uuid);
                            json.images = [...(json.images ?? []), img];
                        }
                    }
                    break;
                }
                case "geometry": {
                    const raw = await this.loadGeometryRaw(stub.url);
                    array[index] = raw.json.geometries?.[0] ?? raw.json;
                    break;
                }
                case "texture": {
                    const raw = await this.loadTextureRaw(stub.url);
                    // Texture files have the same { textures, images } shape as
                    // exportTexture produces — images are already blob-decoded by
                    // loadTextureRaw; just inline and dedup.
                    array[index] = raw.json.textures[0];
                    for (const img of raw.json.images ?? []) {
                        if (!seenImages.has(img.uuid)) {
                            seenImages.add(img.uuid);
                            json.images = [...(json.images ?? []), img];
                        }
                    }
                    break;
                }
            }
        };

        await Promise.all([
            ...(json.materials  ?? []).map((s: any, i: number) => resolve("material",  json.materials,  i, s)),
            ...(json.geometries ?? []).map((s: any, i: number) => resolve("geometry",  json.geometries, i, s)),
            ...(json.textures   ?? []).map((s: any, i: number) => resolve("texture",   json.textures,   i, s)),
        ]);

        // Clean up nulled stubs from all arrays
        json.materials  = (json.materials  ?? []).filter(Boolean);
        json.geometries = (json.geometries ?? []).filter(Boolean);
        json.textures   = (json.textures   ?? []).filter(Boolean);

        return stubs;
    }

    /**
     * Build a { [uuid]: THREE.Source } map from pre-decoded image entries.
     * BinarySerializer.unpackImages stores a THREE.Source on each entry as `entry.source`.
     */
    private async _buildImageMap(images: any[]): Promise<Record<string, THREE.Source>> {
        const map: Record<string, THREE.Source> = {};
        images.forEach(e => { if (e.source) map[e.uuid] = e.source; });
        return map;
    }
}