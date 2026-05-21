import * as THREE from "three";

// ─── dtype ────────────────────────────────────────────────────────────────────

const enum DType {
  Float32 = 0, Float64 = 1,
  Uint8   = 2, Uint16  = 3, Uint32 = 4,
  Int8    = 5, Int16   = 6, Int32  = 7,
}

type TypedArray =
  | Float32Array | Float64Array
  | Uint8Array   | Uint16Array  | Uint32Array
  | Int8Array    | Int16Array   | Int32Array;

const DTYPE_CTORS = [
  Float32Array, Float64Array,
  Uint8Array,   Uint16Array,  Uint32Array,
  Int8Array,    Int16Array,   Int32Array,
] as const;

const DTYPE_NAMES = [
  "float32", "float64",
  "uint8",   "uint16", "uint32",
  "int8",    "int16",  "int32",
] as const;

function dtypeOf(arr: TypedArray): DType {
  if (arr instanceof Float32Array) return DType.Float32;
  if (arr instanceof Float64Array) return DType.Float64;
  if (arr instanceof Uint8Array)   return DType.Uint8;
  if (arr instanceof Uint16Array)  return DType.Uint16;
  if (arr instanceof Uint32Array)  return DType.Uint32;
  if (arr instanceof Int8Array)    return DType.Int8;
  if (arr instanceof Int16Array)   return DType.Int16;
  return DType.Int32;
}

// ─── public types ─────────────────────────────────────────────────────────────

export interface AttributeInfo {
  name:      string;
  dtype:     string;
  itemSize:  number;
  count:     number;
  isMorph?:  boolean;
  morphKey?: string;
}

export interface GeometryInfo {
  uuid:       string;
  name:       string;
  type:       string;
  version:    number;
  byteLength: number;
  numVerts:   number;
  numIndices: number;
  attributes: AttributeInfo[];
}

export interface SerializeOptions {
  position?: boolean;
  normal?:   boolean;
  uv?:       boolean;
  index?:    boolean;
}

export interface DeserializeResult {
  geometry: THREE.BufferGeometry;
  info:     GeometryInfo;
}

// ─── binary format  GEO3B v2 ─────────────────────────────────────────────────
//
//  ┌─────────────────────────────────────────────────────────────────────────┐
//  │ HEADER                                                                  │
//  │  0- 3   4B   magic  0x47 0x45 0x4F 0x42  ("GEOB")                     │
//  │  4      1B   version  uint8 = 2                                         │
//  │  5-40  36B   uuid     ASCII-36                                          │
//  │  +     2B+*  typeStr        uint16LE len + UTF-8                        │
//  │  +     2B+*  nameStr        uint16LE len + UTF-8                        │
//  │  +     4B+*  userDataStr    uint32LE len + UTF-8 JSON  (empty = len 0) │
//  │  +     4B+*  parametersStr  uint32LE len + UTF-8 JSON  (empty = len 0) │
//  │  +      4B   flags  uint32LE                                            │
//  │               bit 0 = hasIndex                                          │
//  │               bit 1 = hasPosition                                       │
//  │               bit 2 = hasNormal                                         │
//  │               bit 3 = hasUV                                             │
//  │               bit 4 = hasMorphAttributes                                │
//  │               bit 5 = morphTargetsRelative                              │
//  │               bit 6 = hasGroups                                         │
//  │               bit 7 = hasBoundingSphere                                 │
//  │  +      4B   numVerts      uint32LE                                     │
//  │  +      4B   numIndices    uint32LE                                     │
//  │  +      4B   numAttributes uint32LE                                     │
//  │  +      4B   numMorphKeys  uint32LE                                     │
//  ├─────────────────────────────────────────────────────────────────────────┤
//  │ ATTRIBUTE BLOCK  (× numAttributes)                                      │
//  │   2B+*  name        uint16LE len + UTF-8                                │
//  │   1B    dtype       uint8 (DType enum)                                  │
//  │   2B    itemSize    uint16LE                                             │
//  │   1B    normalized  uint8  (0|1)                                        │
//  │   4B    byteLength  uint32LE                                            │
//  │   *B    typed-array bytes                                               │
//  ├─────────────────────────────────────────────────────────────────────────┤
//  │ MORPH KEY BLOCK  (× numMorphKeys)                                       │
//  │   2B+*  keyName    uint16LE len + UTF-8  (e.g. "position")             │
//  │   4B    numTargets uint32LE                                             │
//  │   — × numTargets: same layout as ATTRIBUTE BLOCK                        │
//  ├─────────────────────────────────────────────────────────────────────────┤
//  │ INDEX BLOCK  (when bit 0 set)                                           │
//  │   4B    byteLength  uint32LE                                            │
//  │   *B    Uint32Array bytes                                               │
//  ├─────────────────────────────────────────────────────────────────────────┤
//  │ GROUPS BLOCK  (when bit 6 set)                                          │
//  │   4B    count  uint32LE                                                 │
//  │   × count:  start(4B) + count(4B) + materialIndex(4B)  uint32LE each  │
//  ├─────────────────────────────────────────────────────────────────────────┤
//  │ BOUNDING SPHERE  (when bit 7 set)                                       │
//  │   4B cx  4B cy  4B cz  4B radius   all float32LE                       │
//  └─────────────────────────────────────────────────────────────────────────┘

const MAGIC:   readonly number[] = [0x47, 0x45, 0x4f, 0x42];
const VERSION                    = 2;
const UUID_LEN                   = 36;

const enc = new TextEncoder();
const dec = new TextDecoder();

// ─── internal helpers ─────────────────────────────────────────────────────────

function writeStr(u8: Uint8Array, dv: DataView, off: number, s: string, lenBytes: 2 | 4): number {
  const b = enc.encode(s);
  if (lenBytes === 2) dv.setUint16(off, b.length, true);
  else                dv.setUint32(off, b.length, true);
  off += lenBytes;
  u8.set(b, off);
  return off + b.length;
}

function readStr(u8: Uint8Array, dv: DataView, off: number, lenBytes: 2 | 4): [string, number] {
  const len = lenBytes === 2 ? dv.getUint16(off, true) : dv.getUint32(off, true);
  off += lenBytes;
  return [dec.decode(u8.subarray(off, off + len)), off + len];
}

function strSize(s: string, lenBytes: 2 | 4): number {
  return lenBytes + enc.encode(s).length;
}

interface AttrDesc {
  name:       string;
  arr:        TypedArray;
  itemSize:   number;
  dtype:      DType;
  normalized: boolean;
}

function attrSize(d: AttrDesc): number {
  return strSize(d.name, 2) + 1 + 2 + 1 + 4 + d.arr.byteLength;
}

function writeAttr(u8: Uint8Array, dv: DataView, off: number, d: AttrDesc): number {
  off = writeStr(u8, dv, off, d.name, 2);
  dv.setUint8(off++, d.dtype);
  dv.setUint16(off, d.itemSize, true); off += 2;
  dv.setUint8(off++, d.normalized ? 1 : 0);
  dv.setUint32(off, d.arr.byteLength, true); off += 4;
  u8.set(new Uint8Array(d.arr.buffer, d.arr.byteOffset, d.arr.byteLength), off);
  return off + d.arr.byteLength;
}

function readAttr(u8: Uint8Array, dv: DataView, off: number): [AttrDesc, number] {
  let name: string;
  [name, off] = readStr(u8, dv, off, 2);
  const dtype      = dv.getUint8(off++) as DType;
  const itemSize   = dv.getUint16(off, true); off += 2;
  const normalized = dv.getUint8(off++) === 1;
  const byteLen    = dv.getUint32(off, true); off += 4;
  const Ctor       = DTYPE_CTORS[dtype] ?? Float32Array;
  const arr        = new (Ctor as Float32ArrayConstructor)(u8.buffer.slice(off, off + byteLen)) as TypedArray;
  return [{ name, arr, itemSize, dtype, normalized }, off + byteLen];
}

function fromBufAttr(name: string, a: THREE.BufferAttribute): AttrDesc {
  return { name, arr: a.array as TypedArray, itemSize: a.itemSize, dtype: dtypeOf(a.array as TypedArray), normalized: a.normalized };
}

// ─── class ────────────────────────────────────────────────────────────────────

export class GeoSerializer {

  // ── serialize ──────────────────────────────────────────────────────────────

  serialize(geo: THREE.BufferGeometry, opts: SerializeOptions = {}): ArrayBuffer {
    const incPos  = opts.position ?? true;
    const incNorm = opts.normal   ?? true;
    const incUV   = opts.uv       ?? true;
    const incIdx  = opts.index    ?? true;

    // ── collect standard attributes ─────────────────────────────────────────
    const attrs: AttrDesc[] = [];
    const builtIn = new Set(["position", "normal", "uv"]);

    if (incPos  && geo.attributes["position"]) attrs.push(fromBufAttr("position", geo.attributes["position"] as THREE.BufferAttribute));
    if (incNorm && geo.attributes["normal"])   attrs.push(fromBufAttr("normal",   geo.attributes["normal"]   as THREE.BufferAttribute));
    if (incUV   && geo.attributes["uv"])       attrs.push(fromBufAttr("uv",       geo.attributes["uv"]       as THREE.BufferAttribute));

    for (const [k, a] of Object.entries(geo.attributes)) {
      if (!builtIn.has(k)) attrs.push(fromBufAttr(k, a as THREE.BufferAttribute));
    }

    // ── morph attributes ─────────────────────────────────────────────────────
    interface MorphEntry { key: string; targets: AttrDesc[]; }
    const morphEntries: MorphEntry[] = [];
    for (const [key, arr] of Object.entries(geo.morphAttributes)) {
      morphEntries.push({
        key,
        targets: (arr as THREE.BufferAttribute[]).map((a, i) => fromBufAttr(String(i), a)),
      });
    }

    // ── index ────────────────────────────────────────────────────────────────
    const idxSrc = incIdx ? geo.index?.array : null;
    const idxU32 = idxSrc instanceof Uint32Array ? idxSrc
                 : idxSrc ? new Uint32Array(idxSrc) : null;

    // ── metadata ─────────────────────────────────────────────────────────────
    const typeStr       = geo.type  || "BufferGeometry";
    const nameStr       = geo.name  || "";
    const userDataStr   = Object.keys(geo.userData ?? {}).length > 0 ? JSON.stringify(geo.userData) : "";
    const params        = (geo as unknown as { parameters?: Record<string, unknown> }).parameters;
    const parametersStr = params ? JSON.stringify(params) : "";

    // ── flags ────────────────────────────────────────────────────────────────
    let flags = 0;
    if (idxU32)                                    flags |= 1;
    if (incPos  && geo.attributes["position"])     flags |= 2;
    if (incNorm && geo.attributes["normal"])       flags |= 4;
    if (incUV   && geo.attributes["uv"])           flags |= 8;
    if (morphEntries.length > 0)                   flags |= 16;
    if (geo.morphTargetsRelative)                  flags |= 32;
    if (geo.groups.length > 0)                     flags |= 64;
    if (geo.boundingSphere !== null)               flags |= 128;

    // ── byte size ────────────────────────────────────────────────────────────
    let size = 4 + 1 + UUID_LEN                   // magic + version + uuid
             + strSize(typeStr, 2)
             + strSize(nameStr, 2)
             + strSize(userDataStr, 4)
             + strSize(parametersStr, 4)
             + 4 + 4 + 4 + 4 + 4;                 // flags + numVerts + numIdx + numAttrs + numMorphKeys

    for (const d of attrs)         size += attrSize(d);
    for (const me of morphEntries) { size += strSize(me.key, 2) + 4; for (const t of me.targets) size += attrSize(t); }
    if (idxU32)     size += 4 + idxU32.byteLength;
    if (flags & 64) size += 4 + geo.groups.length * 12;
    if (flags & 128) size += 16;

    // ── write ─────────────────────────────────────────────────────────────────
    const buf = new ArrayBuffer(size);
    const dv  = new DataView(buf);
    const u8  = new Uint8Array(buf);
    let off   = 0;

    MAGIC.forEach(b => { dv.setUint8(off++, b); });
    dv.setUint8(off++, VERSION);
    u8.set(enc.encode(geo.uuid.slice(0, UUID_LEN).padEnd(UUID_LEN)), off); off += UUID_LEN;

    off = writeStr(u8, dv, off, typeStr, 2);
    off = writeStr(u8, dv, off, nameStr, 2);
    off = writeStr(u8, dv, off, userDataStr, 4);
    off = writeStr(u8, dv, off, parametersStr, 4);

    dv.setUint32(off, flags,                         true); off += 4;
    dv.setUint32(off, (geo.attributes["position"] as THREE.BufferAttribute | undefined)?.count ?? 0, true); off += 4;
    dv.setUint32(off, idxU32?.length ?? 0,           true); off += 4;
    dv.setUint32(off, attrs.length,                  true); off += 4;
    dv.setUint32(off, morphEntries.length,           true); off += 4;

    for (const d  of attrs)         off = writeAttr(u8, dv, off, d);

    for (const me of morphEntries) {
      off = writeStr(u8, dv, off, me.key, 2);
      dv.setUint32(off, me.targets.length, true); off += 4;
      for (const t of me.targets) off = writeAttr(u8, dv, off, t);
    }

    if (idxU32) {
      dv.setUint32(off, idxU32.byteLength, true); off += 4;
      u8.set(new Uint8Array(idxU32.buffer, idxU32.byteOffset, idxU32.byteLength), off);
      off += idxU32.byteLength;
    }

    if (flags & 64) {
      dv.setUint32(off, geo.groups.length, true); off += 4;
      for (const g of geo.groups) {
        dv.setUint32(off, g.start,           true); off += 4;
        dv.setUint32(off, g.count,           true); off += 4;
        dv.setUint32(off, g.materialIndex ?? 0, true); off += 4;
      }
    }

    if (flags & 128) {
      const s = geo.boundingSphere!;
      dv.setFloat32(off, s.center.x, true); off += 4;
      dv.setFloat32(off, s.center.y, true); off += 4;
      dv.setFloat32(off, s.center.z, true); off += 4;
      dv.setFloat32(off, s.radius,   true); off += 4;
    }

    return buf;
  }

  // ── deserialize ────────────────────────────────────────────────────────────

  deserialize(buf: ArrayBuffer): DeserializeResult {
    const dv = new DataView(buf);
    const u8 = new Uint8Array(buf);
    let off  = 0;

    for (let i = 0; i < 4; i++) {
      if (dv.getUint8(off++) !== MAGIC[i])
        throw new Error("GeoSerializer: invalid magic — not a GEO3B file");
    }

    const version = dv.getUint8(off++);
    if (version !== VERSION)
      throw new Error(`GeoSerializer: unsupported version ${version} (expected ${VERSION})`);

    const uuid = dec.decode(u8.subarray(off, off + UUID_LEN)).trim(); off += UUID_LEN;

    let typeStr: string, nameStr: string, userDataStr: string, parametersStr: string;
    [typeStr,       off] = readStr(u8, dv, off, 2);
    [nameStr,       off] = readStr(u8, dv, off, 2);
    [userDataStr,   off] = readStr(u8, dv, off, 4);
    [parametersStr, off] = readStr(u8, dv, off, 4);

    const flags        = dv.getUint32(off, true); off += 4;
    const numVerts     = dv.getUint32(off, true); off += 4;
    const numIndices   = dv.getUint32(off, true); off += 4;
    const numAttribs   = dv.getUint32(off, true); off += 4;
    const numMorphKeys = dv.getUint32(off, true); off += 4;

    const geo = new THREE.BufferGeometry();
    geo.uuid  = uuid;
    geo.name  = nameStr;
    if (userDataStr)   geo.userData = JSON.parse(userDataStr);
    if (parametersStr) (geo as unknown as { parameters: unknown }).parameters = JSON.parse(parametersStr);
    geo.morphTargetsRelative = !!(flags & 32);

    const attrsInfo: AttributeInfo[] = [];

    // standard attributes
    for (let i = 0; i < numAttribs; i++) {
      let d: AttrDesc;
      [d, off] = readAttr(u8, dv, off);
      geo.setAttribute(d.name, new THREE.BufferAttribute(d.arr, d.itemSize, d.normalized));
      attrsInfo.push({ name: d.name, dtype: DTYPE_NAMES[d.dtype], itemSize: d.itemSize, count: d.arr.length / d.itemSize });
    }

    // morph attributes
    for (let m = 0; m < numMorphKeys; m++) {
      let key: string;
      [key, off] = readStr(u8, dv, off, 2);
      const numTargets = dv.getUint32(off, true); off += 4;
      geo.morphAttributes[key] = [];
      for (let t = 0; t < numTargets; t++) {
        let d: AttrDesc;
        [d, off] = readAttr(u8, dv, off);
        (geo.morphAttributes[key] as THREE.BufferAttribute[]).push(
          new THREE.BufferAttribute(d.arr, d.itemSize, d.normalized)
        );
        attrsInfo.push({ name: `${key}[${d.name}]`, dtype: DTYPE_NAMES[d.dtype], itemSize: d.itemSize, count: d.arr.length / d.itemSize, isMorph: true, morphKey: key });
      }
    }

    // index
    if (flags & 1) {
      const byteLen = dv.getUint32(off, true); off += 4;
      const idxArr  = new Uint32Array(u8.buffer.slice(off, off + byteLen));
      geo.setIndex(new THREE.BufferAttribute(idxArr, 1));
      off += byteLen;
    }

    // groups
    if (flags & 64) {
      const count = dv.getUint32(off, true); off += 4;
      for (let i = 0; i < count; i++) {
        const start  = dv.getUint32(off, true); off += 4;
        const cnt    = dv.getUint32(off, true); off += 4;
        const matIdx = dv.getUint32(off, true); off += 4;
        geo.addGroup(start, cnt, matIdx);
      }
    }

    // bounding sphere
    if (flags & 128) {
      const cx = dv.getFloat32(off, true); off += 4;
      const cy = dv.getFloat32(off, true); off += 4;
      const cz = dv.getFloat32(off, true); off += 4;
      const r  = dv.getFloat32(off, true); off += 4;
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), r);
    } else {
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
    }

    return {
      geometry: geo,
      info: { uuid, name: nameStr, type: typeStr, version, byteLength: buf.byteLength, numVerts, numIndices, attributes: attrsInfo },
    };
  }
}