import { THREE } from '@/Core/lib/THREE';
import fs from '@/Core/lib/fs';
import { Baxporter } from '@/Core/Plugins/Binary/Baxporter';
import { Editor } from '@/Editor/Editor';
import { Noise, NoiseSeed, NoiseDetail } from '@/PolyModule/perlin.js';
import {
    VoronoiNoise,
    RidgedMultifractal,
    BillowNoise,
    DomainWarp,
    HydraulicErosion,
    CompositeNoise
} from './NoiseExtra';

// ==========================================
// Globals for Vector Pooling (Zero Allocation)
// ==========================================
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _nA = new THREE.Vector3();
const _nB = new THREE.Vector3();
const _tempNormal = new THREE.Vector3();

// ==========================================
// Utility Math & Noise Functions
// ==========================================

function smoothstep(edge0: number, edge1: number, x: number): number {
    x = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
    return x * x * (3 - 2 * x);
}

// 2D Simplex Noise implementation (self-contained, deterministic)
class SimplexNoise2D {
    private perm: Uint8Array = new Uint8Array(512);

    private static readonly F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    private static readonly G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    private static readonly grad3 = [
        1, 1, -1, 1, 1, -1, -1, -1,
        1, 0, -1, 0, 0, 1, 0, -1
    ];

    constructor(seed: number = 12345) {
        this.reseed(seed);
    }

    public reseed(seed: number) {
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;

        // Shuffle with LCG
        let s = (seed >>> 0) || 1;
        for (let i = 255; i > 0; i--) {
            s = (s * 1664525 + 1013904223) >>> 0;
            const j = s % (i + 1);
            const tmp = p[i];
            p[i] = p[j];
            p[j] = tmp;
        }

        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
        }
    }

    public noise2D(xin: number, yin: number): number {
        const F2 = SimplexNoise2D.F2;
        const G2 = SimplexNoise2D.G2;
        const grad3 = SimplexNoise2D.grad3;

        let n0 = 0, n1 = 0, n2 = 0;
        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;

        let i1 = 0, j1 = 0;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;

        const ii = i & 255;
        const jj = j & 255;
        const gi0 = (this.perm[ii + this.perm[jj]] % 8) * 2;
        const gi1 = (this.perm[ii + i1 + this.perm[jj + j1]] % 8) * 2;
        const gi2 = (this.perm[ii + 1 + this.perm[jj + 1]] % 8) * 2;

        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
        }

        return 70.0 * (n0 + n1 + n2);
    }
}

// ==========================================
// Terrain Seam & Geometry Utilities
// Ported & enhanced from GeneratorV3.js
// ==========================================

export class TerrainUtils {
    /**
     * Removes unused vertices from the grid arrays and remaps the indices.
     * Uses TypedArrays and an Int32Array for O(1) lookups.
     */
    static remapAndClean(
        oldIndices: Uint32Array,
        indexCount: number,
        oldPositions: Float32Array,
        oldNormals: Float32Array,
        oldUvs: Float32Array
    ) {
        const numOldVertices = oldPositions.length / 3;

        const newPositions = new Float32Array(oldPositions.length);
        const newNormals = new Float32Array(oldNormals.length);
        const newUvs = new Float32Array(oldUvs.length);
        const newIndices = new Uint32Array(indexCount);

        const indexMap = new Int32Array(numOldVertices).fill(-1);
        let newIndexCounter = 0;

        for (let i = 0; i < indexCount; i++) {
            const oldIndex = oldIndices[i];
            let mapped = indexMap[oldIndex];

            if (mapped === -1) {
                mapped = newIndexCounter++;
                indexMap[oldIndex] = mapped;

                const i3 = oldIndex * 3;
                const i2 = oldIndex * 2;
                const ni3 = mapped * 3;
                const ni2 = mapped * 2;

                newPositions[ni3] = oldPositions[i3];
                newPositions[ni3 + 1] = oldPositions[i3 + 1];
                newPositions[ni3 + 2] = oldPositions[i3 + 2];

                newNormals[ni3] = oldNormals[i3];
                newNormals[ni3 + 1] = oldNormals[i3 + 1];
                newNormals[ni3 + 2] = oldNormals[i3 + 2];

                newUvs[ni2] = oldUvs[i2];
                newUvs[ni2 + 1] = oldUvs[i2 + 1];
            }

            newIndices[i] = mapped;
        }

        return {
            positions: newPositions.subarray(0, newIndexCounter * 3),
            indices: newIndices,
            normals: newNormals.subarray(0, newIndexCounter * 3),
            uvs: newUvs.subarray(0, newIndexCounter * 2)
        };
    }

    static lerp(a: number, b: number, t: number): number {
        return t * (b - a) + a;
    }

    static slerpNormal(A: THREE.Vector3, B: THREE.Vector3, t: number, targetVec: THREE.Vector3): THREE.Vector3 {
        let cosTheta = A.dot(B);
        cosTheta = Math.min(Math.max(cosTheta, -1), 1);
        const theta = Math.acos(cosTheta);
        const sinTheta = Math.sin(theta);

        if (sinTheta < 0.0001) {
            return targetVec.copy(A).lerp(B, t).normalize();
        }

        const w1 = Math.sin((1 - t) * theta) / sinTheta;
        const w2 = Math.sin(t * theta) / sinTheta;

        return targetVec.copy(A).multiplyScalar(w1).addScaledVector(B, w2).normalize();
    }

    static addTriangleNormal(
        x1: number, z1: number,
        x2: number, z2: number,
        x3: number, z3: number,
        getHeight: (x: number, z: number) => number,
        targetNormal: THREE.Vector3
    ) {
        const y1 = getHeight(x1, z1);
        const y2 = getHeight(x2, z2);
        const y3 = getHeight(x3, z3);

        const Ux = x2 - x1, Uy = y2 - y1, Uz = z2 - z1;
        const Vx = x3 - x1, Vy = y3 - y1, Vz = z3 - z1;

        const nx = Uy * Vz - Uz * Vy;
        const ny = Uz * Vx - Ux * Vz;
        const nz = Ux * Vy - Uy * Vx;

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (len > 0) {
            targetNormal.x += nx / len;
            targetNormal.y += ny / len;
            targetNormal.z += nz / len;
        }
    }
}

// ==========================================
// Chunk Generator with Seam Stitching
// ==========================================

export class ChunkGenerator {
    public maxLod: number;
    public chunkSize: number;
    public heightSampler: (worldX: number, worldZ: number) => number;

    constructor(
        maxLod = 4,
        chunkSize = 32,
        heightSampler: (worldX: number, worldZ: number) => number = () => 0
    ) {
        this.maxLod = maxLod;
        this.chunkSize = chunkSize;
        this.heightSampler = heightSampler;
    }

    /**
     * Builds a terrain chunk geometry at a specific LOD level.
     * lod: 0 = highest detail, maxLod = lowest detail.
     */
    build(lod: number, center: [number, number]): THREE.BufferGeometry {
        const meshSize = this.chunkSize + 3;
        const skipIncrement = Math.min(this.chunkSize, Math.max(1, 1 << lod));
        const vertexCount = meshSize * meshSize;

        const positions = new Float32Array(vertexCount * 3);
        const uvs = new Float32Array(vertexCount * 2);

        const maxIndices = (meshSize - 1) * (meshSize - 1) * 6;
        const indices = new Uint32Array(maxIndices);
        let idxCount = 0;

        const vertexIndex = (x: number, y: number) => y * meshSize + x;

        // Height Cache
        const cacheSize = meshSize + 2;
        const heightCache = new Float32Array(cacheSize * cacheSize).fill(NaN);

        const getCachedHeightXZ = (x: number, z: number): number => {
            const cacheX = x + 1;
            const cacheZ = z + 1;
            const cacheIdx = cacheZ * cacheSize + cacheX;

            if (!Number.isNaN(heightCache[cacheIdx])) {
                return heightCache[cacheIdx];
            }

            const halfW = (meshSize - 1) / 2;
            const px = center[0] + (x - halfW);
            const pz = center[1] + (z - halfW);

            const heightVal = this.heightSampler(px, pz);
            heightCache[cacheIdx] = heightVal;
            return heightVal;
        };

        // 1. Generate Base Grid (Skip Unused Vertices)
        for (let z = 0; z < meshSize; z++) {
            for (let x = 0; x < meshSize; x++) {
                const isEdgeInnerRingVerts =
                    (x === 1 && z > 0 && z < meshSize - 1) ||
                    (z === 1 && x > 0 && x < meshSize - 1) ||
                    (x === meshSize - 2 && z > 1 && z < meshSize - 1) ||
                    (z === meshSize - 2 && x > 1 && x < meshSize - 2);

                const isOuter = (x === 0 || z === 0 || x === meshSize - 1 || z === meshSize - 1);
                const isLodNode = (x - 1) % skipIncrement === 0 && (z - 1) % skipIncrement === 0;

                if (!isLodNode && !isEdgeInnerRingVerts && !isOuter) {
                    continue;
                }

                const vi = vertexIndex(x, z);
                const pIdx = vi * 3;
                const uIdx = vi * 2;

                positions[pIdx] = x;
                positions[pIdx + 1] = getCachedHeightXZ(x, z);
                positions[pIdx + 2] = z;

                uvs[uIdx] = x / (meshSize - 1);
                uvs[uIdx + 1] = z / (meshSize - 1);

                const isMainVerts = (z > 0 && z < meshSize - 1) && (x > 0 && x < meshSize - 1);
                const isEdgeVertsForTris =
                    (x === 1 && z > 0) ||
                    (z === 1 && x > 0) ||
                    (x === meshSize - 1 && z > 1) ||
                    (z === meshSize - 1 && x > 1);

                const isLodVertsForTri =
                    x > 1 && z > 1 &&
                    ((z - 1) % skipIncrement === 0 && (x - 1) % skipIncrement === 0);

                if (isEdgeVertsForTris) {
                    const a = vertexIndex(x - 1, z - 1);
                    const b = vertexIndex(x - 1, z);
                    const c = vertexIndex(x, z);
                    const d = vertexIndex(x, z - 1);

                    indices[idxCount++] = a; indices[idxCount++] = b; indices[idxCount++] = c;
                    indices[idxCount++] = a; indices[idxCount++] = c; indices[idxCount++] = d;
                }

                if (isMainVerts && isLodVertsForTri) {
                    const a = vertexIndex(x - skipIncrement, z - skipIncrement);
                    const b = vertexIndex(x - skipIncrement, z);
                    const c = vertexIndex(x, z);
                    const d = vertexIndex(x, z - skipIncrement);

                    indices[idxCount++] = a; indices[idxCount++] = b; indices[idxCount++] = c;
                    indices[idxCount++] = a; indices[idxCount++] = c; indices[idxCount++] = d;
                }
            }
        }

        // 2. Compute Base Normals
        const geoTemp = new THREE.BufferGeometry();
        geoTemp.setIndex(new THREE.BufferAttribute(indices.subarray(0, idxCount), 1));
        geoTemp.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geoTemp.computeVertexNormals();

        const normalAttr = geoTemp.getAttribute('normal') as THREE.BufferAttribute;

        // 3. LOD Edge Stitching & Normal Correction
        const interpolateEdgeVertex = (x: number, z: number, isHorizontal: boolean) => {
            const idx = vertexIndex(x, z) * 3;
            const t = ((isHorizontal ? x : z) - 1) % skipIncrement;
            if (t === 0) return;

            const pct = t / skipIncrement;
            const remaining = skipIncrement - t;

            const ax = isHorizontal ? x - t : x;
            const az = isHorizontal ? z : z - t;
            const bx = isHorizontal ? x + remaining : x;
            const bz = isHorizontal ? z : z + remaining;

            _vA.fromArray(positions, vertexIndex(ax, az) * 3);
            _vB.fromArray(positions, vertexIndex(bx, bz) * 3);

            positions[idx + 1] = TerrainUtils.lerp(_vA.y, _vB.y, pct);

            _nA.fromBufferAttribute(normalAttr, vertexIndex(ax, az));
            _nB.fromBufferAttribute(normalAttr, vertexIndex(bx, bz));

            TerrainUtils.slerpNormal(_nA, _nB, pct, _tempNormal);
            normalAttr.setXYZ(idx / 3, _tempNormal.x, _tempNormal.y, _tempNormal.z);
        };

        const calculateOuterRingNormal = (x: number, z: number) => {
            _tempNormal.set(0, 0, 0);

            TerrainUtils.addTriangleNormal(x, z, x - 1, z, x - 1, z - 1, getCachedHeightXZ, _tempNormal);
            TerrainUtils.addTriangleNormal(x, z, x - 1, z - 1, x, z - 1, getCachedHeightXZ, _tempNormal);
            TerrainUtils.addTriangleNormal(x, z, x, z - 1, x + 1, z - 1, getCachedHeightXZ, _tempNormal);
            TerrainUtils.addTriangleNormal(x, z, x + 1, z - 1, x + 1, z, getCachedHeightXZ, _tempNormal);
            TerrainUtils.addTriangleNormal(x, z, x + 1, z, x + 1, z + 1, getCachedHeightXZ, _tempNormal);
            TerrainUtils.addTriangleNormal(x, z, x + 1, z + 1, x, z + 1, getCachedHeightXZ, _tempNormal);

            return _tempNormal.normalize().negate();
        };

        for (let z = 0; z < meshSize; z++) {
            for (let x = 0; x < meshSize; x++) {
                const isLod = (x > 0 && z > 0) && ((x - 1) % skipIncrement === 0 && (z - 1) % skipIncrement === 0);
                const isEdgeInnerRingVerts =
                    (x === 1 && z > 0 && z < meshSize - 1) ||
                    (z === 1 && x > 0 && x < meshSize - 1) ||
                    (x === meshSize - 2 && z > 1 && z < meshSize - 1) ||
                    (z === meshSize - 2 && x > 1 && x < meshSize - 2);

                const isTopBottomEdge = isEdgeInnerRingVerts && (z === 1 || z === meshSize - 2);
                const isLeftRightEdge = isEdgeInnerRingVerts && (x === 1 || x === meshSize - 2);

                const isHorizontalStitch = isTopBottomEdge && !isLod;
                const isVerticalStitch = isLeftRightEdge && !isLod;

                if (isHorizontalStitch) {
                    interpolateEdgeVertex(x, z, true);
                    continue;
                }
                if (isVerticalStitch) {
                    interpolateEdgeVertex(x, z, false);
                    continue;
                }

                const isOuter = (x === 0 || z === 0 || x === meshSize - 1 || z === meshSize - 1);
                if (isOuter) {
                    const idx = vertexIndex(x, z);
                    const n = calculateOuterRingNormal(x, z);
                    normalAttr.setXYZ(idx, n.x, n.y, n.z);
                }
            }
        }

        // 4. Assemble Clean Geometry
        const remapped = TerrainUtils.remapAndClean(
            indices,
            idxCount,
            positions,
            normalAttr.array as Float32Array,
            uvs
        );

        geoTemp.dispose();

        const geo = new THREE.BufferGeometry();
        geo.setIndex(new THREE.BufferAttribute(remapped.indices, 1));
        geo.setAttribute('position', new THREE.BufferAttribute(remapped.positions, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(remapped.normals, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(remapped.uvs, 2));

        // Center chunk geometry at (0, 0, 0)
        geo.translate(-(meshSize - 1) / 2, 0, -(meshSize - 1) / 2);
        geo.computeBoundingBox();
        geo.computeBoundingSphere();

        return geo;
    }
}

// ==========================================
// Terrain Options & Manifest Interfaces
// ==========================================

export interface TerrainGenerationOptions {
    width: number;
    depth: number;
    chunkSize: number;
    minLod?: number;
    maxLod?: number;
    lodLevels?: number;
    maxDistance?: number;
    maxHeight: number;
    minHeight: number;
    roughness?: number;
    seed?: number;
    noiseOffsetX?: number;
    noiseOffsetZ?: number;
    heightMapType:
        | 'All Combined (Final Noise)'
        | 'Voronoi Noise'
        | 'Ridged Mountains'
        | 'Billow Noise'
        | 'Hydraulic Erosion'
        | 'Domain Warp'
        | 'Perlin Noise'
        | 'Simplex Noise'
        | 'Texture Map'
        | 'Flat'
        | string;
    heightMapData?: any;
    outputDir?: string;
    prefix?: string;
    onProgress?: (progress: number, message: string) => void;
}

export interface TerrainChunkInfo {
    cx: number;
    cz: number;
    center: [number, number];
    lods: Record<number, string> | string[];
}

export interface TerrainManifest {
    name: string;
    numChunksX: number;
    numChunksZ: number;
    chunkSize: number;
    minLod: number;
    maxLod: number;
    lodLevels: number;
    lodDistances: number[];
    maxDistance: number;
    width: number;
    depth: number;
    minHeight: number;
    maxHeight: number;
    noiseOffsetX?: number;
    noiseOffsetZ?: number;
    chunks: TerrainChunkInfo[];
}

export interface TerrainGenerationResult {
    manifest: TerrainManifest;
    geometries: Map<string, THREE.BufferGeometry>;
    outputDir: string;
}

// ==========================================
// Terrain Generation Service
// ==========================================

export class TerrainGenerationService {
    private static baxporter = new Baxporter();
    private static simplex = new SimplexNoise2D();

    /**
     * Creates a height sampling function based on user options.
     */
    public static createHeightSampler(options: TerrainGenerationOptions): (worldX: number, worldZ: number) => number {
        const {
            width,
            depth,
            maxHeight,
            minHeight,
            roughness = 0.8,
            seed = 12345,
            noiseOffsetX = 0,
            noiseOffsetZ = 0,
            heightMapType,
            heightMapData
        } = options;

        const heightRange = maxHeight - minHeight;
        const frequency = 0.02 * (roughness || 0.8);

        if (heightMapType === 'Flat') {
            return () => minHeight;
        }

        if (heightMapType === 'All Combined (Final Noise)' || heightMapType === 'Composite Noise') {
            const composite = new CompositeNoise({
                seed,
                baseFrequency: frequency * 0.45,
                baseOctaves: Math.min(6, Math.max(2, Math.round(roughness * 5))),
                warpStrength: 14.0 * (roughness || 0.8),
                ridgeWeight: 0.45,
                voronoiWeight: 0.25,
                billowWeight: 0.20,
                erosionStrength: 0.35
            });

            return (worldX: number, worldZ: number): number => {
                const sx = worldX + noiseOffsetX;
                const sz = worldZ + noiseOffsetZ;
                const n = composite.sample(sx, sz);
                return minHeight + n * heightRange;
            };
        }

        if (heightMapType === 'Voronoi Noise') {
            const voronoi = new VoronoiNoise(seed);
            const octaves = Math.min(5, Math.max(2, Math.round(roughness * 4)));

            return (worldX: number, worldZ: number): number => {
                const sx = (worldX + noiseOffsetX) * frequency * 0.7;
                const sz = (worldZ + noiseOffsetZ) * frequency * 0.7;
                const n = voronoi.fbm(sx, sz, octaves, 2.0, 0.5, 'ridge');
                return minHeight + n * heightRange;
            };
        }

        if (heightMapType === 'Ridged Mountains') {
            const ridged = new RidgedMultifractal(seed);
            const octaves = Math.min(6, Math.max(2, Math.round(roughness * 5)));

            return (worldX: number, worldZ: number): number => {
                const sx = (worldX + noiseOffsetX) * frequency * 0.7;
                const sz = (worldZ + noiseOffsetZ) * frequency * 0.7;
                const n = ridged.sample(sx, sz, octaves);
                return minHeight + n * heightRange;
            };
        }

        if (heightMapType === 'Billow Noise') {
            const billow = new BillowNoise(seed);
            const octaves = Math.min(5, Math.max(2, Math.round(roughness * 4)));

            return (worldX: number, worldZ: number): number => {
                const sx = (worldX + noiseOffsetX) * frequency * 0.7;
                const sz = (worldZ + noiseOffsetZ) * frequency * 0.7;
                const n = billow.sample(sx, sz, octaves);
                return minHeight + n * heightRange;
            };
        }

        if (heightMapType === 'Domain Warp') {
            const warp = new DomainWarp(seed);
            this.simplex.reseed(seed);
            const octaves = Math.min(5, Math.max(2, Math.round(roughness * 4)));

            return (worldX: number, worldZ: number): number => {
                const sx = worldX + noiseOffsetX;
                const sz = worldZ + noiseOffsetZ;
                const [wx, wz] = warp.warp(sx, sz, 18.0 * (roughness || 0.8), frequency * 0.8, true);

                let total = 0;
                let amp = 1.0;
                let maxAmp = 0;
                let freq = frequency;
                for (let o = 0; o < octaves; o++) {
                    total += this.simplex.noise2D(wx * freq, wz * freq) * amp;
                    maxAmp += amp;
                    amp *= 0.5;
                    freq *= 2.0;
                }
                const n = (total / maxAmp) * 0.5 + 0.5;
                return minHeight + n * heightRange;
            };
        }

        if (heightMapType === 'Hydraulic Erosion') {
            this.simplex.reseed(seed);
            const voronoi = new VoronoiNoise(seed + 101);
            const octaves = Math.min(5, Math.max(2, Math.round(roughness * 4)));

            return (worldX: number, worldZ: number): number => {
                const sx = worldX + noiseOffsetX;
                const sz = worldZ + noiseOffsetZ;

                let base = 0;
                let amp = 1.0;
                let maxAmp = 0;
                let freq = frequency;
                for (let o = 0; o < octaves; o++) {
                    base += this.simplex.noise2D(sx * freq, sz * freq) * amp;
                    maxAmp += amp;
                    amp *= 0.5;
                    freq *= 2.0;
                }
                base = (base / maxAmp) * 0.5 + 0.5;

                const eps = 1.5;
                const hRight = this.simplex.noise2D((sx + eps) * frequency, sz * frequency) * 0.5 + 0.5;
                const hUp = this.simplex.noise2D(sx * frequency, (sz + eps) * frequency) * 0.5 + 0.5;
                const slope = Math.min(1.0, Math.sqrt((hRight - base) ** 2 + (hUp - base) ** 2) * 8.0);

                const drainageNoise = voronoi.sample(sx * frequency * 1.5, sz * frequency * 1.5).f1;
                const gullyNoise = Math.abs(this.simplex.noise2D(sx * frequency * 8.0, sz * frequency * 8.0));

                const n = HydraulicErosion.proceduralDrainage(sx, sz, base, slope, drainageNoise, gullyNoise);
                return minHeight + n * heightRange;
            };
        }

        if (heightMapType === 'Perlin Noise') {
            NoiseSeed(seed);
            const octaves = Math.min(8, Math.max(1, Math.round(roughness * 4)));
            NoiseDetail(octaves, 0.5);

            return (worldX: number, worldZ: number): number => {
                const nx = (worldX + noiseOffsetX) * frequency;
                const nz = (worldZ + noiseOffsetZ) * frequency;
                const n = Noise(nx, 0, nz); // returns ~[0, 1]
                return minHeight + n * heightRange;
            };
        }

        if (heightMapType === 'Simplex Noise') {
            this.simplex.reseed(seed);
            const octaves = Math.min(6, Math.max(1, Math.round(roughness * 4)));

            return (worldX: number, worldZ: number): number => {
                let total = 0;
                let amplitude = 1.0;
                let maxAmp = 0;
                let freq = frequency;
                const sx = worldX + noiseOffsetX;
                const sz = worldZ + noiseOffsetZ;

                for (let o = 0; o < octaves; o++) {
                    total += this.simplex.noise2D(sx * freq, sz * freq) * amplitude;
                    maxAmp += amplitude;
                    amplitude *= 0.5;
                    freq *= 2.0;
                }

                const normalized = (total / maxAmp) * 0.5 + 0.5; // map from [-1, 1] to [0, 1]
                return minHeight + normalized * heightRange;
            };
        }

        if (heightMapType === 'Texture Map') {
            if (heightMapData && heightMapData.data && heightMapData.width && heightMapData.height) {
                const imgW = heightMapData.width;
                const imgH = heightMapData.height;
                const data = heightMapData.data;

                return (worldX: number, worldZ: number): number => {
                    const sx = worldX + noiseOffsetX;
                    const sz = worldZ + noiseOffsetZ;
                    const u = Math.min(Math.max((sx + width / 2) / width, 0), 1);
                    const v = Math.min(Math.max((sz + depth / 2) / depth, 0), 1);

                    const px = Math.min(Math.floor(u * (imgW - 1)), imgW - 1);
                    const py = Math.min(Math.floor(v * (imgH - 1)), imgH - 1);
                    const idx = (py * imgW + px) * 4;

                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;

                    return minHeight + lum * heightRange;
                };
            }

            // Fallback if texture data is not provided: gentle undulating terrain
            return (worldX: number, worldZ: number): number => {
                const sx = worldX + noiseOffsetX;
                const sz = worldZ + noiseOffsetZ;
                const n = (Math.sin(sx * 0.05) * Math.cos(sz * 0.05) + 1) * 0.5;
                return minHeight + n * heightRange;
            };
        }

        return () => 0;
    }

    /**
     * Generates all chunk LOD geometries, exports each to .geo.bin,
     * writes the manifest, and refreshes the Asset Browser.
     */
    public static async generate(options: TerrainGenerationOptions): Promise<TerrainGenerationResult> {
        const {
            width = 128,
            depth = 128,
            chunkSize = 32,
            maxDistance = 1000,
            outputDir = '/Game/files/Terrain',
            prefix = 'Terrain',
            onProgress
        } = options;

        const minLod = Math.max(0, options.minLod !== undefined ? options.minLod : 0);
        const maxLod = Math.max(
            minLod,
            options.maxLod !== undefined
                ? options.maxLod
                : (options.lodLevels !== undefined ? Math.max(minLod, options.lodLevels - 1) : 4)
        );
        const lodLevels = maxLod - minLod + 1;

        const numChunksX = Math.max(1, Math.ceil(width / chunkSize));
        const numChunksZ = Math.max(1, Math.ceil(depth / chunkSize));

        onProgress?.(0.05, `Creating output directory ${outputDir}...`);
        if (!await fs.exists(outputDir)) {
            await fs.mkdir(outputDir, { recursive: true });
        }

        const heightSampler = this.createHeightSampler(options);
        const chunkGenerator = new ChunkGenerator(maxLod, chunkSize, heightSampler);

        const chunks: TerrainChunkInfo[] = [];
        const geometriesMap = new Map<string, THREE.BufferGeometry>();

        const totalTasks = numChunksX * numChunksZ * lodLevels;
        let completedTasks = 0;

        // Calculate LOD transition distances
        const lodDistances: number[] = [];
        let baseDist = chunkSize * 2;
        for (let l = 0; l < lodLevels - 1; l++) {
            lodDistances.push(baseDist);
            baseDist *= 2;
        }

        // Generate and bake each chunk within [minLod, maxLod]
        for (let cz = 0; cz < numChunksZ; cz++) {
            for (let cx = 0; cx < numChunksX; cx++) {
                const centerX = (cx - (numChunksX - 1) / 2) * chunkSize;
                const centerZ = (cz - (numChunksZ - 1) / 2) * chunkSize;

                const lodFilePaths: Record<number, string> = {};

                for (let lod = minLod; lod <= maxLod; lod++) {
                    const filenameBase = `${prefix}_X${cx}_Z${cz}_LOD${lod}`;
                    const geo = chunkGenerator.build(lod, [centerX, centerZ]);
                    geo.name = filenameBase;

                    // Cache in memory
                    geometriesMap.set(`${cx}_${cz}_${lod}`, geo);

                    // Export binary format: outputDir/filenameBase.geo.bin
                    await this.baxporter.export(geo, outputDir, filenameBase);

                    const finalFilePath = `${outputDir}/${filenameBase}.geo.bin`;
                    lodFilePaths[lod] = finalFilePath;

                    completedTasks++;
                    const progress = 0.05 + 0.85 * (completedTasks / totalTasks);
                    onProgress?.(
                        progress,
                        `Baking Chunk [${cx}, ${cz}] LOD ${lod} (${minLod}-${maxLod})... (${Math.round(progress * 100)}%)`
                    );
                }

                chunks.push({
                    cx,
                    cz,
                    center: [centerX, centerZ],
                    lods: lodFilePaths
                });
            }
        }

        // Create Manifest
        const manifest: TerrainManifest = {
            name: prefix,
            numChunksX,
            numChunksZ,
            chunkSize,
            minLod,
            maxLod,
            lodLevels,
            lodDistances,
            maxDistance,
            width,
            depth,
            minHeight: options.minHeight,
            maxHeight: options.maxHeight,
            noiseOffsetX: options.noiseOffsetX || 0,
            noiseOffsetZ: options.noiseOffsetZ || 0,
            chunks
        };

        const manifestPath = `${outputDir}/${prefix}_manifest.json`;
        onProgress?.(0.95, `Writing manifest ${manifestPath}...`);
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

        // Refresh Asset Browser
        try {
            if (Editor?.assetBrowser?.reload) {
                await Editor.assetBrowser.reload();
            }
        } catch (err) {
            console.warn('[TerrainGenerationService] AssetBrowser reload warning:', err);
        }

        onProgress?.(1.0, `Terrain generation complete! (${numChunksX * numChunksZ} chunks, LOD ${minLod}-${maxLod})`);

        return {
            manifest,
            geometries: geometriesMap,
            outputDir
        };
    }
}
