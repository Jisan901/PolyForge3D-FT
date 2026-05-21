import { THREE } from "@/Core/lib/THREE";
import fs from "@/Core/lib/fs";
import { BinarySerializer } from "@/Core/Plugins/Three.patch.plugin";

/**
 * Export options shared by all export methods.
 */
export interface ExportOptions {
    /**
     * Output directory.  The exporter will write to:
     *   `<dir>/<name><suffix>.bin`
     */
    dir: string;

    /**
     * Override the file name (without extension).
     * Falls back to the asset's own `.name`, `.type`, or a sensible default.
     */
    name?: string;
    
    path?: string; // Override everything
}

// ─────────────────────────────────────────────────────────────────────────────
// Baxporter  –  high-level binary exporter
//
// Each export* method:
//  1. Calls the matching BinarySerializer.serialize* to register typed-array
//     blobs and replace them with blob indices in the JSON.
//  2. Wraps the resulting JSON in the canonical envelope expected by MemoLoader.
//  3. Packs everything into one ArrayBuffer via the internal pack() helper.
//  4. Writes to disk.
//
// All methods return the packed ArrayBuffer so callers can pipe it elsewhere
// (e.g. send over the network) without a second read from disk.
// ─────────────────────────────────────────────────────────────────────────────
export class Baxporter1 {
    private serializer = new BinarySerializer();

    // =========================================================================
    // exportObject
    //   Serialises a complete Object3D (meshes, materials, textures, animations).
    //   This mirrors the old BinarySerializer.save() but gives you the packed
    //   buffer back as well.
    // =========================================================================

    /**
     * Export a full Object3D hierarchy to a binary file.
     *
     * The output envelope is the standard Three.js ObjectLoader JSON extended
     * with `blobIndex` references for all typed-array data.
     *
     * @param object  Any Three.js Object3D (Scene, Mesh, Group, SkinnedMesh…)
     * @param options Export options
     * @returns       The packed ArrayBuffer written to disk
     */
    async exportObjectv2(
        object: THREE.Object3D,
        options: ExportOptions
    ): Promise<ArrayBuffer> {
        console.log('bxp ')
        this.serializer.reset();

        const meta = {
            geometries: {},
            images: {},
            textures: {},
            materials: {},
            shapes: {},
            skeletons: {},
            animations: {},
            nodes: {}
        };

        // Standard Three.js JSON — contains full inline geometries + materials
        const json = object.toJSON(meta);
        console.log(json, meta)
        const seenGeo = new Map<string, string>(); // uuid → url
        const seenMat = new Map<string, string>(); // uuid → url

        // -----------------
        // Export geometries
        // -----------------
        for (const geoJson of Object.values(meta.geometries) ?? []) {
            if (seenGeo.has(geoJson.uuid)) continue;

            const geometries = [geoJson];
            this.serializer.reset();
            this.serializer.serializeGeometries(geometries);

            const packed = pack({
                json: { geometries },
                blobs: this.serializer.blobs
            });
            const path = this._resolvePath(
                options,
                geoJson.name || geoJson.uuid,
                "geo"
            );
            console.log(path)
            await fs.writeFile(path, packed);
            seenGeo.set(geoJson.uuid, path);
        }

        // -----------------
        // Export materials
        // -----------------
        for (const matJson of Object.values(meta.materials) ?? []) {
            if (seenMat.has(matJson.uuid)) continue;

            // Collect only the images/textures referenced by this material
            const texUuids = new Set<string>(
                matJson.map?.uuid ? [matJson.map.uuid] : []
            );
            const textures = (Object.values(meta.textures) ?? []).filter((t: any) =>
                texUuids.has(t.uuid)
            );
            const imgUuids = new Set<string>(textures.map((t: any) => t.image));
            const images = (Object.values(meta.images) ?? []).filter((i: any) =>
                imgUuids.has(i.uuid)
            );

            this.serializer.reset();
            await this.serializer.serializeMaterials([matJson], images);

            const packed = pack({
                json: { materials: [matJson], textures, images },
                blobs: this.serializer.blobs
            });
            const path = this._resolvePath(
                options,
                matJson.name || matJson.uuid,
                "mat"
            );

            await fs.writeFile(path, packed);
            seenMat.set(matJson.uuid, path);
        }

        // -----------------
        // Build manifest
        // Replace inline geometry/material arrays with url stubs
        // -----------------
        const manifest = {
            metadata: json.metadata,
            geometries: [...seenGeo.entries()].map(([uuid, url]) => ({
                uuid,
                url
            })),
            materials: [...seenMat.entries()].map(([uuid, url]) => ({
                uuid,
                url
            })),
            object: json.object,
            // animations and skeletons stay inline — they're lightweight
            animations: json.animations,
            skeletons: json.skeletons
        };

        const packed = pack({ json: manifest, blobs: [] });
        const path = this._resolvePath(
            options,
            object.name || object.type,
            "object"
        );

        await fs.writeFile(path, packed);
        return packed;
    }
    async exportObjectv1(
        object: THREE.Object3D,
        options: ExportOptions
    ): Promise<ArrayBuffer> {
        this.serializer.reset()
        const { json, blobs } = await this.serializer.serializeObject(object);
        console.log(json)
        const packed = pack({ json, blobs });
        const path = this._resolvePath(
            options,
            object.name || object.type,
            "object"
        );

        await fs.writeFile(path, packed);
        return packed;
    }
    async exportObject(
        object: THREE.Object3D,
        options: ExportOptions
    ): Promise<ArrayBuffer> {
        console.log('bxp ')
        this.serializer.reset();

        // Standard Three.js JSON — contains full inline geometries + materials
        const json = object.toJSON();
        console.log(json)
        //return 
        
    
        // -----------------
        // Export materials
        // -----------------
        let internalMats = [];
        let externalMats = [];
        for (const matJson of json.materials ?? []) {
            
            let path = this._resolvePath(
                options,
                matJson.name || matJson.uuid,
                "mat"
            );

            
            if (matJson.meta && matJson.userData.url){
                // process external mat
                path = matJson.userData.url;
                const meta = matJson.meta;
                matJson.meta = null;
                delete matJson.meta;
                
                const images = Object.values(meta.images) as any[];
                const textures = Object.values(meta.textures) as any[];
                
                this.serializer.reset();
                await this.serializer.serializeMaterials([matJson], images);
        
                const json = {
                    materials: [matJson],
                    textures,
                    images
                };
                
                const packed = pack({ json, blobs: this.serializer.blobs });
                await fs.writeFile(path, packed);
                externalMats.push({url:path, uuid:matJson.uuid})
                
            }
            else {
                internalMats.push(matJson)
            }
        }

        // -----------------
        // Build manifest
        // Replace inline geometry/material arrays with url stubs
        // -----------------
        const manifest = {
            ...json, materials: [...internalMats, ...externalMats]
        };
        const {json:jsonParsed, blobs} = await this.serializer.serializeJsonObject(manifest);
        console.log(jsonParsed)
        const packed = pack({ json: jsonParsed, blobs });
        const path = this._resolvePath(
            options,
            object.name || object.type,
            "object"
        );

        await fs.writeFile(path, packed);
        return packed;
    }
    // =========================================================================
    // exportGeometry
    //   Serialises a single BufferGeometry.
    //   Envelope: { geometries: [ <BufferGeometry JSON> ] }
    // =========================================================================

    /**
     * Export a standalone BufferGeometry to a binary file.
     *
     * @param geometry  The geometry to export
     * @param options   Export options
     * @returns         The packed ArrayBuffer written to disk
     */
    async exportGeometry(
        geometry: THREE.BufferGeometry,
        options: ExportOptions
    ): Promise<ArrayBuffer> {
        this.serializer.reset();

        // Use a meta object so Three.js can write shape definitions into it.
        // BufferGeometry.toJSON(meta) stores Shape JSON under meta.shapes when
        // the geometry is a ShapeGeometry / ExtrudeGeometry whose constructor
        // parameters reference Shape instances.
        const meta = {
            geometries: {},
            images: {},
            textures: {},
            materials: {},
            shapes: {},
            skeletons: {},
            animations: {},
            nodes: {}
        };

        const geoJson = geometry.toJSON(meta);
        const shapes = Object.values(meta.shapes) as any[];

        // Wrap in array — serializeGeometries always expects an array
        const geometries = [geoJson];
        this.serializer.serializeGeometries(geometries);

        // shapes is pure CurvePath JSON — no typed arrays, carry as-is
        const json: any = { geometries };
        if (shapes.length) json.shapes = shapes;

        const packed = pack({ json, blobs: this.serializer.blobs });
        const path = this._resolvePath(
            options,
            geometry.name || "geometry",
            "geo"
        );

        await fs.writeFile(path, packed);
        return packed;
    }

    // =========================================================================
    // exportMaterial
    //   Serialises a Material together with its textures and image sources.
    //   Envelope: { materials: [...], textures: [...], images: [...] }
    // =========================================================================

    /**
     * Export a standalone Material (and its textures/images) to a binary file.
     *
     * @param material  The material to export
     * @param options   Export options
     * @returns         The packed ArrayBuffer written to disk
     */
    async exportMaterial(
        material: THREE.Material,
        options: ExportOptions
    ): Promise<ArrayBuffer> {
        this.serializer.reset();

        // Three.js Material.toJSON produces { uuid, type, ... } at root level.
        // We collect the shared images/textures pools it writes into via meta.
        const meta = {
            geometries: {},
            images: {},
            textures: {},
            materials: {},
            shapes: {},
            skeletons: {},
            animations: {},
            nodes: {}
        };

        const matJson = material.toJSON(meta);
        const images = Object.values(meta.images) as any[];
        const textures = Object.values(meta.textures) as any[];

        // serializeMaterials handles image blob packing internally
        await this.serializer.serializeMaterials([matJson], images);

        const json = {
            materials: [matJson],
            textures,
            images
        };

        const packed = pack({ json, blobs: this.serializer.blobs });
        const path = this._resolvePath(
            options,
            material.name || material.type || "material",
            "mat"
        );

        await fs.writeFile(path, packed);
        return packed;
    }

    // =========================================================================
    // exportAnimations
    //   Serialises one or more AnimationClips.
    //   Envelope: { animations: [ <AnimationClip JSON>, ... ] }
    // =========================================================================

    /**
     * Export one or more AnimationClips to a single binary file.
     *
     * @param clips    Array of AnimationClip instances
     * @param options  Export options
     * @returns        The packed ArrayBuffer written to disk
     */
    async exportAnimations(
        clips: THREE.AnimationClip[],
        options: ExportOptions
    ): Promise<ArrayBuffer> {
        this.serializer.reset();

        const animations = clips.map(clip => THREE.AnimationClip.toJSON(clip));
        this.serializer.serializeAnimations(animations);

        const json = { animations };

        const packed = pack({ json, blobs: this.serializer.blobs });
        const firstName = clips[0]?.name || "animation";
        const path = this._resolvePath(options, firstName, "anim");

        await fs.writeFile(path, packed);
        return packed;
    }

    // =========================================================================
    // exportTexture
    //   Serialises a single Texture (source image → blob).
    //   Envelope: { images: [...], textures: [...] }
    // =========================================================================

    /**
     * Export a standalone Texture to a binary file.
     *
     * @param texture  The texture to export
     * @param options  Export options
     * @returns        The packed ArrayBuffer written to disk
     */
    async exportTexture(
        texture: THREE.Texture,
        options: ExportOptions
    ): Promise<ArrayBuffer> {
        this.serializer.reset();

        const meta = {
            geometries: {},
            images: {},
            textures: {},
            materials: {},
            shapes: {},
            skeletons: {},
            animations: {},
            nodes: {}
        };

        const texJson = texture.toJSON(meta);
        const images = Object.values(meta.images) as any[];

        await this.serializer.serializeImages(images);

        const json = {
            textures: [texJson],
            images
        };

        const packed = pack({ json, blobs: this.serializer.blobs });
        const path = this._resolvePath(
            options,
            texture.name || "texture",
            "tex"
        );

        await fs.writeFile(path, packed);
        return packed;
    }

    // =========================================================================
    // export  –  auto-detecting convenience wrapper
    //   Inspects the asset at runtime and delegates to the correct export*
    //   method, so callers don't need to know which type they have.
    // =========================================================================

    /**
     * Export any supported Three.js asset to a binary file.
     *
     * Type is detected automatically:
     *  - `THREE.AnimationClip` / `THREE.AnimationClip[]`  → exportAnimations
     *  - `THREE.BufferGeometry`                           → exportGeometry
     *  - `THREE.Material` subclass                        → exportMaterial
     *  - `THREE.Texture` subclass                         → exportTexture
     *  - `THREE.Object3D` subclass (Mesh, Group, Scene…)  → exportObject
     *
     * @param asset  Any supported Three.js object
     * @param dir    Output directory
     * @param name   File base-name (without extension). Falls back to asset.name / asset.type.
     * @returns      The packed ArrayBuffer written to disk
     */
    export(
        asset:
            | THREE.Object3D
            | THREE.BufferGeometry
            | THREE.Material
            | THREE.Texture
            | THREE.AnimationClip
            | THREE.AnimationClip[],
        dir: string,
        name?: string,
        path?: string
    ): Promise<ArrayBuffer> {
        const options: ExportOptions = { dir, name, path };

        if (Array.isArray(asset)) {
            return this.exportAnimations(asset, options);
        }

        if (asset instanceof THREE.AnimationClip) {
            return this.exportAnimations([asset], options);
        }

        if (asset instanceof THREE.BufferGeometry) {
            return this.exportGeometry(asset, options);
        }

        if (asset instanceof THREE.Material) {
            return this.exportMaterial(asset, options);
        }

        if (asset instanceof THREE.Texture) {
            return this.exportTexture(asset, options);
        }

        if (asset instanceof THREE.Object3D) {
            return this.exportObject(asset, options);
        }

        throw new Error(
            `Baxporter.export: unsupported asset type — ${(asset as any)?.constructor?.name ?? typeof asset}`
        );
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Build the output file path.
     *
     * Format:  `<dir>/<name>.<suffix>.bin`
     *
     * The suffix keeps files of different types unambiguous even when they
     * share a name (e.g. "Character.object.bin" vs "Character.anim.bin").
     */
    private _resolvePath(
        options: ExportOptions,
        fallbackName: string,
        suffix: string
    ): string {
        if (options.path) return options.path;
        const name = (options.name ?? fallbackName).replace(/[/\\]/g, "_");
        return `${options.dir}/${name}.${suffix}.bin`;
    }
}






// ─────────────────────────────────────────────────────────────────────────────
// Exporter
// ─────────────────────────────────────────────────────────────────────────────

export class Baxporter {
    private serializer = new BinarySerializer();

    // =========================================================================
    // Public API
    // =========================================================================

    async exportObject(
        object: THREE.Object3D,
        options: ExportOptions
    ): Promise<ArrayBuffer> {
        this.serializer.reset();

        const json = object.toJSON();

        // Export geometries — split external (userData.url) from internal
        const { internalList: internalGeos, externalStubs: externalGeos } =
            await this._exportGeometries(json.geometries ?? [], options);

        // Export materials — split external (userData.url) from internal
        // Also handles textures nested inside each material
        const { internalList: internalMats, externalStubs: externalMats } =
            await this._exportMaterials(json.materials ?? [], json.textures ?? [], json.images ?? [], options);

        // Build manifest — inline assets stay embedded, external ones become stubs
        const manifest = {
            ...json,
            geometries: [...internalGeos, ...externalGeos],
            materials:  [...internalMats, ...externalMats],
            // Textures and images that remain internal after material export
            // are already stripped from json by _exportMaterials; manifest
            // carries only what belongs inline.
        };

        this.serializer.reset();
        const { json: jsonParsed, blobs } = await this.serializer.serializeJsonObject(manifest);
        const packed = pack({ json: jsonParsed, blobs });

        const path = this._resolvePath(options, object.name || object.type, "object");
        await fs.writeFile(path, packed);
        return packed;
    }

    async exportMaterial(
        material: THREE.Material,
        options: ExportOptions
    ): Promise<ArrayBuffer> {
        this.serializer.reset();

        const meta = this._freshMeta();
        const matJson = material.toJSON(meta);

        const images   = Object.values(meta.images)   as any[];
        const textures = Object.values(meta.textures)  as any[];

        // Split textures — external ones become stubs inside the material file
        const { internalList: internalTexs, externalStubs: externalTexs, internalImages } =
            await this._exportTextures(textures, images, options);

        await this.serializer.serializeImages(internalImages);

        const json = {
            materials: [matJson],
            textures:  [...internalTexs, ...externalTexs],
            images:    internalImages,
        };

        const packed = pack({ json, blobs: this.serializer.blobs });
        const path = this._resolvePath(options, material.name || material.uuid, "mat");
        await fs.writeFile(path, packed);
        return packed;
    }

    async exportTexture(
        texture: THREE.Texture,
        options: ExportOptions
    ): Promise<ArrayBuffer> {
        this.serializer.reset();

        const meta = this._freshMeta();
        const texJson = texture.toJSON(meta);
        const images = Object.values(meta.images) as any[];

        await this.serializer.serializeImages(images);

        const json = { textures: [texJson], images };
        const packed = pack({ json, blobs: this.serializer.blobs });

        const path = this._resolvePath(options, texture.name || texture.uuid, "tex");
        await fs.writeFile(path, packed);
        return packed;
    }

    async exportGeometry(
        geometry: THREE.BufferGeometry,
        options: ExportOptions
    ): Promise<ArrayBuffer> {
        this.serializer.reset();

        const meta = this._freshMeta();
        const geoJson = geometry.toJSON(meta);

        this.serializer.serializeGeometries([geoJson]);

        const json = { geometries: [geoJson] };
        const packed = pack({ json, blobs: this.serializer.blobs });

        const path = this._resolvePath(options, geometry.name || geometry.uuid, "geo");
        await fs.writeFile(path, packed);
        return packed;
    }
    

    async exportAnimations(
        clips: THREE.AnimationClip[],
        options: ExportOptions
    ): Promise<ArrayBuffer> {
        this.serializer.reset();

        const animations = clips.map(clip => THREE.AnimationClip.toJSON(clip));
        this.serializer.serializeAnimations(animations);

        const json = { animations };

        const packed = pack({ json, blobs: this.serializer.blobs });
        const firstName = clips[0]?.name || "animation";
        const path = this._resolvePath(options, firstName, "anim");

        await fs.writeFile(path, packed);
        return packed;
    }

    
    
    
    export(
        asset:
            | THREE.Object3D
            | THREE.BufferGeometry
            | THREE.Material
            | THREE.Texture
            | THREE.AnimationClip
            | THREE.AnimationClip[],
        dir: string,
        name?: string,
        path?: string
    ): Promise<ArrayBuffer> {
        const options: ExportOptions = { dir, name, path };

        if (Array.isArray(asset)) {
            return this.exportAnimations(asset, options);
        }

        if (asset instanceof THREE.AnimationClip) {
            return this.exportAnimations([asset], options);
        }

        if (asset instanceof THREE.BufferGeometry) {
            return this.exportGeometry(asset, options);
        }

        if (asset instanceof THREE.Material) {
            return this.exportMaterial(asset, options);
        }

        if (asset instanceof THREE.Texture) {
            return this.exportTexture(asset, options);
        }

        if (asset instanceof THREE.Object3D) {
            return this.exportObject(asset, options);
        }

        throw new Error(
            `Baxporter.export: unsupported asset type — ${(asset as any)?.constructor?.name ?? typeof asset}`
        );
    }
    

    // =========================================================================
    // Private — geometry splitting
    // =========================================================================

    /**
     * For each geometry in the list:
     *   - Has userData.url → already exported externally; replace with { url, uuid } stub.
     *   - No url           → keep inline; pack typed arrays as blobs via serializer.
     */
    private async _exportGeometries(
        geometries: any[],
        options: ExportOptions
    ): Promise<{ internalList: any[]; externalStubs: any[] }> {
        const internalList: any[] = [];
        const externalStubs: any[] = [];

        for (const geoJson of geometries) {
            if (geoJson.userData?.url) {
                // Write to the existing url path
                const path = geoJson.userData.url;

                this.serializer.reset();
                this.serializer.serializeGeometries([geoJson]);
                const json = { geometries: [geoJson] };
                const packed = pack({ json, blobs: this.serializer.blobs });
                await fs.writeFile(path, packed);

                externalStubs.push({ url: path, uuid: geoJson.uuid });
            } else {
                internalList.push(geoJson);
            }
        }

        return { internalList, externalStubs };
    }

    // =========================================================================
    // Private — material splitting
    // =========================================================================

    /**
     * For each material in the list:
     *   - Has userData.url + meta → write as external .mat file (handling its
     *     own textures recursively), replace with { url, uuid } stub.
     *   - No url                  → keep inline in the object manifest.
     *
     * Internal materials' textures and images remain in the root manifest.
     * External materials take their textures/images with them.
     */
    private async _exportMaterials(
        materials: any[],
        rootTextures: any[],
        rootImages: any[],
        options: ExportOptions
    ): Promise<{ internalList: any[]; externalStubs: any[] }> {
        const internalList: any[] = [];
        const externalStubs: any[] = [];

        // Build lookup maps for textures/images so external mats can claim theirs
        const textureByUuid = Object.fromEntries(rootTextures.map(t => [t.uuid, t]));
        const imageByUuid   = Object.fromEntries(rootImages.map(i => [i.uuid, i]));

        for (const matJson of materials) {
            if (matJson.meta && matJson.userData?.url) {
                const path = matJson.userData.url;
                const meta = matJson.meta;
                delete matJson.meta;

                const images   = Object.values(meta.images)   as any[];
                const textures = Object.values(meta.textures)  as any[];

                // Handle external textures nested inside this material
                const { internalList: internalTexs, externalStubs: externalTexs, internalImages } =
                    await this._exportTextures(textures, images, options);

                this.serializer.reset();
                await this.serializer.serializeImages(internalImages);

                const matFileJson = {
                    materials: [matJson],
                    textures:  [...internalTexs, ...externalTexs],
                    images:    internalImages,
                };

                const packed = pack({ json: matFileJson, blobs: this.serializer.blobs });
                await fs.writeFile(path, packed);

                externalStubs.push({ url: path, uuid: matJson.uuid });
            } else {
                internalList.push(matJson);
            }
        }

        return { internalList, externalStubs };
    }

    // =========================================================================
    // Private — texture splitting
    // =========================================================================

    /**
     * For each texture in the list:
     *   - Has userData.url + meta → write as external .tex file, replace with
     *     { url, uuid } stub. Its images are claimed and removed from the pool.
     *   - No url                  → keep inline; its images stay in internalImages.
     *
     * Returns:
     *   internalList   — texture JSON to embed in the parent file
     *   externalStubs  — { url, uuid } stubs to embed in the parent file
     *   internalImages — images that belong to inline textures only
     */
    private async _exportTextures(
        textures: any[],
        images: any[],
        options: ExportOptions
    ): Promise<{ internalList: any[]; externalStubs: any[]; internalImages: any[] }> {
        const internalList: any[]   = [];
        const externalStubs: any[]  = [];
        const claimedImageUuids     = new Set<string>();

        const imageByUuid = Object.fromEntries(images.map(i => [i.uuid, i]));

        for (const texJson of textures) {
            if (texJson.meta && texJson.userData?.url) {
                const path = texJson.userData.url;
                const meta = texJson.meta;
                delete texJson.meta;

                const texImages = Object.values(meta.images) as any[];

                // Mark these images as claimed — they go into the .tex file
                texImages.forEach(img => claimedImageUuids.add(img.uuid));

                this.serializer.reset();
                await this.serializer.serializeImages(texImages);

                const texFileJson = {
                    textures: [texJson],
                    images:   texImages,
                };

                const packed = pack({ json: texFileJson, blobs: this.serializer.blobs });
                await fs.writeFile(path, packed);

                externalStubs.push({ url: path, uuid: texJson.uuid });
            } else {
                internalList.push(texJson);
            }
        }

        // Images not claimed by any external texture stay inline
        const internalImages = images.filter(img => !claimedImageUuids.has(img.uuid));

        return { internalList, externalStubs, internalImages };
    }

    // =========================================================================
    // Utils
    // =========================================================================

    private _freshMeta() {
        return {
            geometries: {},
            images:     {},
            textures:   {},
            materials:  {},
            shapes:     {},
            skeletons:  {},
            animations: {},
            nodes:      {},
        };
    }

    private _resolvePath(options: ExportOptions, name: string, ext: string): string {
        return options.path??`${options.dir}/${options.name ?? name}.${ext}.bin`;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// pack — mirrors unpackRaw; writes count + jLen header then blobs
// ─────────────────────────────────────────────────────────────────────────────
function pack({ json, blobs }: { json: any; blobs: ArrayBuffer[] }): ArrayBuffer {
    const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
    const totalBlobBytes = blobs.reduce((s, b) => s + 4 + b.byteLength, 0);
    const buf = new ArrayBuffer(8 + jsonBytes.byteLength + totalBlobBytes);
    const view = new DataView(buf);
    let off = 0;

    view.setUint32(off, blobs.length, true); off += 4;
    view.setUint32(off, jsonBytes.byteLength, true); off += 4;
    new Uint8Array(buf, off, jsonBytes.byteLength).set(jsonBytes); off += jsonBytes.byteLength;

    for (const blob of blobs) {
        view.setUint32(off, blob.byteLength, true); off += 4;
        new Uint8Array(buf, off, blob.byteLength).set(new Uint8Array(blob)); off += blob.byteLength;
    }

    return buf;
}


// ─────────────────────────────────────────────────────────────────────────────
// pack  –  identical binary format used by BinarySerializer, duplicated here
// so Baxporter has no hidden coupling to BinarySerializer internals.
//
// Layout: [blobCount: u32][jsonLen: u32][jsonBytes][...per blob: u32 len + bytes]
// ─────────────────────────────────────────────────────────────────────────────
function pack2({
    json,
    blobs
}: {
    json: any;
    blobs: ArrayBuffer[];
}): ArrayBuffer {
    const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
    const headerSize = 4 + 4 + jsonBytes.byteLength;
    const blobsSize = blobs.reduce((s, b) => s + 4 + b.byteLength, 0);

    const out = new ArrayBuffer(headerSize + blobsSize);
    const view = new DataView(out);
    let off = 0;

    view.setUint32(off, blobs.length, true);
    off += 4;
    view.setUint32(off, jsonBytes.byteLength, true);
    off += 4;
    new Uint8Array(out, off, jsonBytes.byteLength).set(jsonBytes);
    off += jsonBytes.byteLength;

    for (const blob of blobs) {
        const bytes =
            blob instanceof ArrayBuffer ? new Uint8Array(blob) : (blob as any);
        view.setUint32(off, bytes.byteLength, true);
        off += 4;
        new Uint8Array(out, off, bytes.byteLength).set(bytes);
        off += bytes.byteLength;
    }

    return out;
}
