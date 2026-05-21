import { Plugin } from "@/Core/Plugins/Plugin";
import { THREE } from "@/Core/lib/THREE";
import fs from "@/Core/lib/fs";

// ─────────────────────────────────────────────────────────────────────────────
// ThreeJsPatchPlugin — monkey-patches Three.js toJSON methods so that typed
// arrays are kept as real typed arrays instead of being converted to plain JS
// arrays, which allows BinarySerializer to pack them efficiently.
// ─────────────────────────────────────────────────────────────────────────────
export default class ThreeJsPatchPlugin extends Plugin {
    async init() {
        const originalMatToJSON = THREE.Material.prototype.toJSON;
        THREE.Material.prototype.toJSON = function(meta1){
            let meta = meta1;
            if (this.userData.url){
                meta = {
                    geometries: {},
                    images: {},
                    textures: {},
                    materials: {},
                    shapes: {},
                    skeletons: {},
                    animations: {},
                    nodes: {}
                };
            }
            let data = originalMatToJSON.call(this, meta);
            if (this.userData.url) data.meta = meta
            return data;
        }
        
        
        const originalTexToJSON = THREE.Texture.prototype.toJSON;
        THREE.Texture.prototype.toJSON = function(meta1){
            let meta = meta1;
            if (this.userData.url){
                meta = {
                    geometries: {},
                    images: {},
                    textures: {},
                    materials: {},
                    shapes: {},
                    skeletons: {},
                    animations: {},
                    nodes: {}
                };
            }
            let data = originalTexToJSON.call(this, meta);
            if (this.userData.url) data.meta = meta
            return data;
        }
        
        
        // ── AnimationClip patch ────────────────────────────────────────────
        THREE.AnimationClip.toJSON = function (clip) {
            const tracks = [];
            const clipTracks = clip.tracks;

            const json = {
                name: clip.name,
                duration: clip.duration,
                tracks,
                uuid: clip.uuid,
                blendMode: clip.blendMode,
                userData: JSON.stringify(clip.userData)
            };

            for (let i = 0, n = clipTracks.length; i !== n; ++i) {
                const ct = clipTracks[i];
                tracks.push({
                    name: ct.name,
                    times: ct.times,
                    values: ct.values,
                    interpolation: ct.getInterpolation(),
                    type: ct.ValueTypeName
                });
            }

            return json;
        };

        // ── BufferAttribute patch ──────────────────────────────────────────
        THREE.BufferAttribute.prototype.toJSON = function () {
            const data = {
                itemSize: this.itemSize,
                type: this.array.constructor.name,
                array: this.array,
                normalized: this.normalized
            };

            if (this.name !== "") data.name = this.name;
            if (this.usage !== THREE.StaticDrawUsage) data.usage = this.usage;

            return data;
        };

        // ── BufferGeometry patch ───────────────────────────────────────────
        const originalGeoToJSON = THREE.BufferGeometry.prototype.toJSON;

        THREE.BufferGeometry.prototype.toJSON = function () {
            const index = this.index;
            this.index = null;

            const data = originalGeoToJSON.call(this);
            this.index = index;

            if (index !== null && !this.parameters) {
                data.data.index = {
                    type: index.array.constructor.name,
                    array: index.array
                };
            }

            return data;
        };
        

        // ── Source patch ───────────────────────────────────────────────────
        if (THREE.Source) {
            THREE.Source.prototype.toJSON = function (meta) {
                const isRootObject =
                    meta === undefined || typeof meta === "string";

                if (!isRootObject && meta.images[this.uuid] !== undefined) {
                    return meta.images[this.uuid];
                }

                const output = { uuid: this.uuid, url: "" };
                output.data = getBuffer(this.data);

                if (!isRootObject) {
                    meta.images[this.uuid] = output;
                }

                return output;
            };
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Image helper – converts an HTMLImageElement / HTMLCanvasElement / ImageData
// to an ArrayBuffer-backed Blob.
// ─────────────────────────────────────────────────────────────────────────────
let _canvas;

async function getBuffer(image, type = "image/png") {
    if (/^data:/i.test(image.src)) {
        return (await fetch(image.src)).blob();
    }

    if (typeof HTMLCanvasElement === "undefined") {
        return (await fetch(image.src)).blob();
    }

    let canvas;

    if (image instanceof HTMLCanvasElement) {
        canvas = image;
    } else {
        if (_canvas === undefined) {
            _canvas = document.createElementNS(
                "http://www.w3.org/1999/xhtml",
                "canvas"
            );
        }
        _canvas.width = image.width;
        _canvas.height = image.height;

        const context = _canvas.getContext("2d");

        if (image instanceof ImageData) {
            context.putImageData(image, 0, 0);
        } else {
            context.drawImage(image, 0, 0, image.width, image.height);
        }

        canvas = _canvas;
    }

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            blob
                ? resolve(blob)
                : reject(new Error("canvas.toBlob failed: returned null"));
        }, type);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// BinarySerializer
//
// Each serialize* method operates independently so callers can serialise only
// the asset type they care about.  serialize() (whole Object3D) composes them.
// ─────────────────────────────────────────────────────────────────────────────
export class BinarySerializer {
    constructor() {
        /** @type {ArrayBuffer[]} */
        this.blobs = [];
    }

    // ── Blob registry ──────────────────────────────────────────────────────
    _registerBlob(arrayBuffer) {
        const index = this.blobs.length;
        this.blobs.push(arrayBuffer);
        return index;
    }

    _sliceTyped(typedArray) {
        return typedArray.buffer.slice(
            typedArray.byteOffset,
            typedArray.byteOffset + typedArray.byteLength
        );
    }

    // ── Reset between independent saves ───────────────────────────────────
    reset() {
        this.blobs = [];
        return this;
    }

    // =========================================================================
    // serializeAnimations
    //   Input : animation clips JSON array (as produced by THREE.AnimationClip.toJSON)
    //   Mutates the array in-place, replacing typed arrays with blob indices.
    //   Returns the same array so it can be used fluently.
    // =========================================================================
    serializeAnimations(animations) {
        if (!animations?.length) return animations;
        
        animations.forEach(anim => {
            anim.tracks.forEach(track => {
                const rawTimes = track.times;
                const rawValues = track.values;
                track.times = this._registerBlob(this._sliceTyped(rawTimes));
                track.values = this._registerBlob(
                    this._sliceTyped(rawValues)
                );
            });
        });

        return animations;
    }

    // =========================================================================
    // serializeGeometries
    //   Input : geometries JSON array (as produced by BufferGeometry.toJSON)
    //   Mutates in-place. Returns the same array.
    // =========================================================================
    serializeGeometries(geometries) {
        if (!geometries?.length) return geometries;

        geometries.forEach(geo => {
            const data = geo.data;
            if (!data?.attributes) return;

            for (const name of Object.keys(data.attributes)) {
                const attr = data.attributes[name];
                if (!attr) continue;

                attr.blobIndex = this._registerBlob(
                    this._sliceTyped(attr.array)
                );
                delete attr.array;
            }

            if (data.index?.array) {
                data.index.blobIndex = this._registerBlob(
                    this._sliceTyped(data.index.array)
                );
                delete data.index.array;
            }
        });

        return geometries;
    }

    // =========================================================================
    // serializeMaterials
    //   Input : materials JSON array (as produced by Material.toJSON)
    //   Currently materials carry no typed-array data themselves, but this
    //   method is the right place to handle any future binary material data
    //   (e.g. LUT textures).  It also resolves the image blobs that are
    //   referenced by material textures.
    //
    //   NOTE: pass the *images* array from the same toJSON output so that
    //   texture sources can be packed.  If you only have materials without
    //   a shared image pool, pass an empty array.
    // =========================================================================
    async serializeMaterials(materials, images = []) {
        // Pack shared images referenced by the material textures.
        await this.serializeImages(images);
        // Materials themselves carry only JSON-safe values — nothing more to do.
        return materials;
    }

    // =========================================================================
    // serializeImages
    //   Input : images JSON array (as produced by Source.toJSON)
    //   Awaits all blob promises, then packs the binary data.
    //   Returns the same array.
    // =========================================================================
    async serializeImages(images) {
        if (!images?.length) return images;

        // Resolve blob Promises that the patched Source.toJSON left behind.
        await Promise.all(
            images.map(async img => {
                const idata = await img.data;
                img.data = await idata.arrayBuffer();
                img.type = idata.type;
            })
        );

        images.forEach(img => {
            if (img.data && img.blobIndex === undefined) {
                img.blobIndex = this._registerBlob(img.data);
                delete img.data;
            }
        });

        return images;
    }

    // =========================================================================
    // serializeObject
    //   Input : an Object3D instance (or anything with a .toJSON() method)
    //   This is the high-level method that calls all the specific serialisers.
    //   Returns { json, blobs }.
    // =========================================================================
    async serializeObject(object3d) {
        this.reset();
        const json = object3d.toJSON();
        
        this.serializeAnimations(json.animations);
        this.serializeGeometries(json.geometries);
        await this.serializeMaterials(json.materials, json.images);

        return { json, blobs: this.blobs };
    }
    async serializeJsonObject(json) {
        this.reset();
        
        this.serializeAnimations(json.animations);
        this.serializeGeometries(json.geometries);
        await this.serializeMaterials(json.materials, json.images);

        return { json, blobs: this.blobs };
    }

    // ── Convenience alias (preserves old API surface) ─────────────────────
    async serialize(object3d) {
        return this.serializeObject(object3d);
    }

    // =========================================================================
    // save  –  serialise an Object3D and write the packed binary to disk
    // =========================================================================
    async save(object, path, withext = false) {
        const { json, blobs } = await this.serializeObject(object);
        const packed = pack({ json, blobs });
        const fileUrl = withext
            ? path
            : `${path}/${object.name || object.type}pack.bin`;

        await fs.writeFile(fileUrl, packed);
    }

    // =========================================================================
    // Static helpers for deserialisation
    // =========================================================================

    // ── unpackAnimations ──────────────────────────────────────────────────
    static unpackAnimations(animations, blobs) {
        if (!animations?.length) return animations;

        animations.forEach(anim => {
            anim.tracks.forEach(track => {
                if (!Array.isArray(track.times)) {
                    track.times = resolveBlobIndex(
                        { blobIndex: track.times, type: "Float32Array" },
                        blobs
                    );
                }
                if (!Array.isArray(track.values)) {
                    track.values = resolveBlobIndex(
                        { blobIndex: track.values, type: "Float32Array" },
                        blobs
                    );
                }
            });
        });

        return animations;
    }

    // ── unpackGeometries ──────────────────────────────────────────────────
    static unpackGeometries(geometries, blobs) {
        if (!geometries?.length) return geometries;

        geometries.forEach(geo => {
            const data = geo.data;
            if (!data?.attributes) return;

            for (const name of Object.keys(data.attributes)) {
                const attr = data.attributes[name];
                if (!attr) continue;

                attr.array = resolveBlobIndex(attr, blobs);
                delete attr.blobIndex;
            }

            if (data.index?.blobIndex !== undefined) {
                data.index.array = resolveBlobIndex(data.index, blobs);
                delete data.index.blobIndex;
            }
        });

        return geometries;
    }

    // ── unpackImages ──────────────────────────────────────────────────────
    static async unpackImages(images, blobs) {
        if (!images?.length) return images;

        await Promise.all(
            images.map(async imgMeta => {
                const blob = new Blob([blobs[imgMeta.blobIndex]], {
                    type: imgMeta.type
                });
                const bitmap = await createImageBitmap(blob);
                imgMeta.source = new THREE.Source(bitmap);
            })
        );

        return images;
    }

    // ── unpack (full Object3D JSON) ───────────────────────────────────────
    static async unpack(data, loader) {
        const { json, blobs } = unpack(data);

        BinarySerializer.unpackAnimations(json.animations, blobs);
        BinarySerializer.unpackGeometries(json.geometries, blobs);
        await BinarySerializer.unpackImages(json.images, blobs);
        // todo unpackmaterial for external materials
        // Provide a custom image parser so the Three.js loader picks up the
        // pre-decoded ImageBitmaps instead of fetching URLs.
        loader.parseImagesAsync = async ig => {
            const images = {};
            ig?.forEach(e => {
                images[e.uuid] = e.source;
            });
            return images;
        };

        return json;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Binary format helpers
// Layout: [blobCount: u32][jsonLen: u32][jsonBytes][...blobs: u32 len + bytes]
// ─────────────────────────────────────────────────────────────────────────────
function pack({ json, blobs }) {
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
            blob instanceof ArrayBuffer ? new Uint8Array(blob) : blob;
        view.setUint32(off, bytes.byteLength, true);
        off += 4;
        new Uint8Array(out, off, bytes.byteLength).set(bytes);
        off += bytes.byteLength;
    }

    return out;
}

function unpack(buffer) {
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

    const blobs = [];
    for (let i = 0; i < count; i++) {
        const len = view.getUint32(off, true);
        off += 4;
        blobs.push(buffer.slice(off, off + len));
        off += len;
    }

    return { json, blobs };
}

function resolveBlobIndex(blobRef, blobs) {
    const TypeMap = {
        Float32Array,
        Uint32Array,
        Uint16Array,
        Int16Array,
        Int32Array,
        Uint8Array
    };
    const Ctor = TypeMap[blobRef.type] ?? Float32Array;
    return new Ctor(blobs[blobRef.blobIndex]);
}



// const blob   = new Blob([blobs[imgMeta.blobIndex]], { type: imgMeta.mimeType });
// const bitmap = await createImageBitmap(blob);

// const texture    = new THREE.Texture(bitmap);
// texture.needsUpdate = true;

// const bitmaps = await Promise.all(
//   json.images.map(imgMeta => {
//     const blob = new Blob([blobs[imgMeta.blobIndex]], { type: imgMeta.mimeType });
//     return createImageBitmap(blob);
//   })
// );



window.FSM = function(){
    let s = editor.api.three.selectedObject;
    console.log(s)
    const bones = [];
    s.parent.traverse(child=>{
        if(child.isBone){
            bones.push(child)
        }
    })
    s.skeleton.bones = bones;
    s.skeleton.update();
    s.skeleton.pose();
}