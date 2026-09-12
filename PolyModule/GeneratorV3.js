import * as THREE from 'three/webgpu';
import { Noise } from "./perlin.js";

// ==========================================
// GLOBALS FOR MEMORY OPTIMIZATION (Object Pooling)
// Re-using these vectors prevents the garbage collector 
// from freezing the frame during chunk generation.
// ==========================================
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _nA = new THREE.Vector3();
const _nB = new THREE.Vector3();
const _tempNormal = new THREE.Vector3();

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Smoothstep interpolation function.
 * @param {number} edge0 - Lower edge.
 * @param {number} edge1 - Upper edge.
 * @param {number} x - Value to interpolate.
 * @returns {number} Interpolated value between 0 and 1.
 */
function smoothstep(edge0, edge1, x) {
    x = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
    return x * x * (3 - 2 * x);
}

/**
 * Circular Signed Distance Field (CSDF) with inlined distance calculation.
 * @param {number} x - Current X coordinate.
 * @param {number} y - Current Y (Z) coordinate.
 * @param {number} r - Radius.
 * @param {number} h - Height bounds.
 * @param {number} w - Width bounds.
 * @returns {number} Distance ratio.
 */
function csdf(x, y, r, h, w) {
    const dx = x - (w / 2);
    const dy = y - (h / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    return (dist - r) / h;
}

export class TerrainUtils {

    /**
     * Removes unused vertices from the grid arrays and remaps the indices.
     * OPTIMIZED: Uses TypedArrays and an Int32Array instead of a Map for O(1) lookups.
     * * @param {Uint32Array|Uint16Array} oldIndices 
     * @param {number} indexCount - The actual number of indices pushed
     * @param {Float32Array} oldPositions 
     * @param {Float32Array} oldNormals 
     * @param {Float32Array} oldUvs 
     * @returns {Object} Cleaned and tightly packed typed arrays.
     */
    static remapAndClean(oldIndices, indexCount, oldPositions, oldNormals, oldUvs) {
        const numOldVertices = oldPositions.length / 3;

        // Pre-allocate new typed arrays based on max possible size
        const newPositions = new Float32Array(oldPositions.length);
        const newNormals = new Float32Array(oldNormals.length);
        const newUvs = new Float32Array(oldUvs.length);
        const newIndices = new Uint32Array(indexCount);

        // Fast flat array instead of new Map()
        const indexMap = new Int32Array(numOldVertices).fill(-1);
        let newIndexCounter = 0;

        for (let i = 0; i < indexCount; i++) {
            const oldIndex = oldIndices[i];
            let mapped = indexMap[oldIndex];

            // If we haven't seen this vertex yet, add it to our new arrays
            if (mapped === -1) {
                mapped = newIndexCounter++;
                indexMap[oldIndex] = mapped;

                const i3 = oldIndex * 3;
                const i2 = oldIndex * 2;
                const ni3 = mapped * 3;
                const ni2 = mapped * 2;

                // Copy data
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

        // Slice the arrays down to their exact final size
        return {
            positions: newPositions.subarray(0, newIndexCounter * 3),
            indices: newIndices,
            normals: newNormals.subarray(0, newIndexCounter * 3),
            uvs: newUvs.subarray(0, newIndexCounter * 2)
        };
    }

    /** Simple Linear Interpolation */
    static lerp(a, b, t) {
        return t * (b - a) + a;
    }

    /** * Spherical Linear Interpolation for Normals.
     * OPTIMIZED: Uses an external target vector to prevent instantiation.
     */
    static slerpNormal(A, B, t, targetVec) {
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

    /** Computes a triangle normal and adds it to a target vector */
    static addTriangleNormal(x1, z1, x2, z2, x3, z3, getHeight, targetNormal) {
        const y1 = getHeight(x1, z1);
        const y2 = getHeight(x2, z2);
        const y3 = getHeight(x3, z3);

        const Ux = x2 - x1, Uy = y2 - y1, Uz = z2 - z1;
        const Vx = x3 - x1, Vy = y3 - y1, Vz = z3 - z1;

        let nx = Uy * Vz - Uz * Vy;
        let ny = Uz * Vx - Ux * Vz;
        let nz = Ux * Vy - Uy * Vx;

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (len > 0) {
            targetNormal.x += nx / len;
            targetNormal.y += ny / len;
            targetNormal.z += nz / len;
        }
    }
}

export class ChunkGenerator {
    noiseGen = { noise: Noise };

    /**
     * @param {number} maxLod - Maximum level of detail.
     * @param {number} chunkSize - Number of segments per chunk.
     */
    constructor(maxLod = 4, chunkSize = 16) {
        this.chunkSize = chunkSize;
        this.maxLod = maxLod;
        this.maxSegment = Math.pow(2, maxLod);
    }

    /**
     * Builds a terrain chunk at a specific LOD.
     * @param {number} lod - Current Level of Detail.
     * @param {Array<number>} center - [x, z] world coordinates of the chunk center.
     * @returns {THREE.BufferGeometry}
     */
    build(lod, center) {
        const meshSize = this.chunkSize + 3;
        // FAST MATH: Bitwise shift instead of Math.pow
        const sub = 1 << (this.maxLod - lod);
        const skipIncrement = this.chunkSize / sub;
        const vertexCount = meshSize * meshSize;

        const positions = new Float32Array(vertexCount * 3);
        const uvs = new Float32Array(vertexCount * 2);

        const maxIndices = (meshSize - 1) * (meshSize - 1) * 6;
        const indices = new Uint32Array(maxIndices);
        let idxCount = 0;

        const vertexIndex = (x, y) => y * meshSize + x;

        // ==========================================
        // OPTIMIZATION 1: THE HEIGHT CACHE
        // ==========================================
        // We need a cache slightly larger than meshSize to account for 
        // the outer ring normal calculation checking x-1 and z-1
        const cacheSize = meshSize + 2;
        const heightCache = new Float32Array(cacheSize * cacheSize).fill(NaN);

        const getCachedHeightXZ = (x, z) => {
            // Shift coordinates by +1 so -1 becomes index 0
            const cacheX = x + 1;
            const cacheZ = z + 1;
            const cacheIdx = cacheZ * cacheSize + cacheX;

            // If it's already calculated, skip the noise math!
            if (!Number.isNaN(heightCache[cacheIdx])) {
                return heightCache[cacheIdx];
            }

            const halfW = (meshSize - 1) / 2;
            const px = center[0] + (x - halfW);
            const pz = center[1] + (z - halfW);

            let noiseVal = this.noiseGen.noise(px * 0.02, 0, pz * 0.02) * 20;
            noiseVal *= smoothstep(0.5, 0.01, csdf(px, pz, 10, 180, 180));

            // Save to cache before returning
            heightCache[cacheIdx] = noiseVal;
            return noiseVal;
        };

        // ==========================================
        // 1. GENERATE BASE GRID (With Skip Logic)
        // ==========================================
        for (let z = 0; z < meshSize; z++) {
            for (let x = 0; x < meshSize; x++) {

                // OPTIMIZATION 2: SKIP UNUSED VERTICES
                const isEdgeInnerRingVerts = (x === 1 && z > 0 && z < meshSize - 1) ||
                    (z === 1 && x > 0 && x < meshSize - 1) ||
                    (x === meshSize - 2 && z > 1 && z < meshSize - 1) ||
                    (z === meshSize - 2 && x > 1 && x < meshSize - 2);
                const isOuter = (x === 0 || z === 0 || x === meshSize - 1 || z === meshSize - 1);
                const isLodNode = (x - 1) % skipIncrement === 0 && (z - 1) % skipIncrement === 0;

                // If this vertex isn't part of the LOD grid, an inner stitch ring, or an outer ring, skip it entirely!
                if (!isLodNode && !isEdgeInnerRingVerts && !isOuter) {
                    continue;
                }

                const vi = vertexIndex(x, z);
                const pIdx = vi * 3;
                const uIdx = vi * 2;

                // We now use the cached height function
                positions[pIdx] = x;
                positions[pIdx + 1] = getCachedHeightXZ(x, z);
                positions[pIdx + 2] = z;


                // Populate UVs
                uvs[uIdx] = x / (meshSize - 1);
                uvs[uIdx + 1] = z / (meshSize - 1);

                // LOD Logic flags
                const isMainVerts = (z > 0 && z < meshSize - 1) && (x > 0 && x < meshSize - 1);
                const isEdgeVertsForTris = (x === 1 && z > 0) || (z === 1 && x > 0) ||
                    (x === meshSize - 1 && z > 1) || (z === meshSize - 1 && x > 1);
                const isLodVertsForTri = x > 1 && z > 1 &&
                    ((z - 1) % skipIncrement === 0 && (x - 1) % skipIncrement === 0);

                // Generate Triangles
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

        // ==========================================
        // 2. COMPUTE BASE NORMALS
        // ==========================================
        // We use Three.js to compute initial flat normals, then adjust the edges manually
        const geoTemp = new THREE.BufferGeometry();
        // Pass subarray because we likely over-allocated `indices`
        geoTemp.setIndex(new THREE.BufferAttribute(indices.subarray(0, idxCount), 1));
        geoTemp.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geoTemp.computeVertexNormals();

        const normalAttr = geoTemp.getAttribute('normal');

        // ==========================================
        // 3. LOD EDGE STITCHING & NORMAL CORRECTION
        // ==========================================

        /** Helper to interpolate a vertex positioned between two active LOD vertices */
        function interpolateEdgeVertex(x, z, isHorizontal) {
            const idx = vertexIndex(x, z) * 3;

            const t = ((isHorizontal ? x : z) - 1) % skipIncrement;
            const pct = t / skipIncrement;
            const remaining = skipIncrement - t;

            const ax = isHorizontal ? x - t : x;
            const az = isHorizontal ? z : z - t;
            const bx = isHorizontal ? x + remaining : x;
            const bz = isHorizontal ? z : z + remaining;

            _vA.fromArray(positions, vertexIndex(ax, az) * 3);
            _vB.fromArray(positions, vertexIndex(bx, bz) * 3);

            // Lerp Height directly into the array
            positions[idx + 1] = TerrainUtils.lerp(_vA.y, _vB.y, pct);

            // Lerp Normal
            _nA.fromBufferAttribute(normalAttr, vertexIndex(ax, az));
            _nB.fromBufferAttribute(normalAttr, vertexIndex(bx, bz));

            TerrainUtils.slerpNormal(_nA, _nB, pct, _tempNormal);
            normalAttr.setXYZ(idx / 3, _tempNormal.x, _tempNormal.y, _tempNormal.z);
        }

        /** Helper to calculate averaged normals for the outer chunk boundary */
        function calculateOuterRingNormal(x, z) {
            _tempNormal.set(0, 0, 0); // Reset pooled vector

            TerrainUtils.addTriangleNormal(x, z, x - 1, z, x - 1, z - 1, getCachedHeightXZ, _tempNormal);
            TerrainUtils.addTriangleNormal(x, z, x - 1, z - 1, x, z - 1, getCachedHeightXZ, _tempNormal);
            TerrainUtils.addTriangleNormal(x, z, x, z - 1, x + 1, z - 1, getCachedHeightXZ, _tempNormal);
            TerrainUtils.addTriangleNormal(x, z, x + 1, z - 1, x + 1, z, getCachedHeightXZ, _tempNormal);
            TerrainUtils.addTriangleNormal(x, z, x + 1, z, x + 1, z + 1, getCachedHeightXZ, _tempNormal);
            TerrainUtils.addTriangleNormal(x, z, x + 1, z + 1, x, z + 1, getCachedHeightXZ, _tempNormal);

            return _tempNormal.normalize().negate();
        }

        for (let z = 0; z < meshSize; z++) {
            for (let x = 0; x < meshSize; x++) {

                const isLod = (x > 0 && z > 0) && ((x - 1) % skipIncrement === 0 && (z - 1) % skipIncrement === 0);
                const isEdgeInnerRingVerts = (x === 1 && z > 0 && z < meshSize - 1) ||
                    (z === 1 && x > 0 && x < meshSize - 1) ||
                    (x === meshSize - 2 && z > 1 && z < meshSize - 1) ||
                    (z === meshSize - 2 && x > 1 && x < meshSize - 2);

                const isTopBottomeEdge = isEdgeInnerRingVerts && (z === 1 || z === meshSize - 2);
                const isLeftRightEdge = isEdgeInnerRingVerts && (x === 1 || x === meshSize - 2);

                const isHorizontalStitch = isTopBottomeEdge && !isLod;
                const isVerticalStitch = isLeftRightEdge && !isLod;

                // Stitched Strip Adjustments
                if (isHorizontalStitch) {
                    interpolateEdgeVertex(x, z, true);
                    continue;
                }
                if (isVerticalStitch) {
                    interpolateEdgeVertex(x, z, false);
                    continue;
                }

                // Outer Ring Adjustments
                const isOuter = (x === 0 || z === 0 || x === meshSize - 1 || z === meshSize - 1);
                if (isOuter) {
                    const idx = vertexIndex(x, z);
                    const n = calculateOuterRingNormal(x, z);
                    normalAttr.setXYZ(idx, n.x, n.y, n.z);
                }
            }
        }

        // ==========================================
        // 4. CLEANUP AND FINAL GEOMETRY ASSEMBLY
        // ==========================================

        // Pass the raw typed arrays to the cleaner
        const remapped = TerrainUtils.remapAndClean(indices, idxCount, positions, normalAttr.array, uvs);

        geoTemp.dispose(); // Free up memory

        const geo = new THREE.BufferGeometry();
        geo.setIndex(new THREE.BufferAttribute(remapped.indices, 1));
        geo.setAttribute('position', new THREE.BufferAttribute(remapped.positions, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(remapped.normals, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(remapped.uvs, 2));

        geo.translate(-(meshSize - 1) / 2, 0, -(meshSize - 1) / 2);
        geo.computeBoundingBox();
        geo.computeBoundingSphere();

        return geo;
    }
}

export default ChunkGenerator;