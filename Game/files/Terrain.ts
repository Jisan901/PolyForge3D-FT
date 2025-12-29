// game/scripts/Rotate.ts
import { Behavior } from '@/PolyModule/Runtime/Behavior';
import { INumber, IObject3D } from '@/PolyModule/Runtime/ITypes';
import * as THREE from 'three';


import { Noise,NoiseDetail } from "./Utils/perlin.js"
NoiseDetail(10)


export class TerrainUtils {

    /** Remove unused vertices and remap indices */
    static remapAndClean(oldIndices, oldPositions, oldNormals, oldUvs) {
        const newPositions = [];
        const newIndices = [];
        const newNormals = [];
        const newUvs = [];
        const indexMap = new Map();
        let newIndexCounter = 0;

        function mapIndex(oldIndex) {
            if (indexMap.has(oldIndex)) {
                return indexMap.get(oldIndex);
            }

            const i3 = oldIndex * 3;
            const i2 = oldIndex * 2;

            newPositions.push(
                oldPositions[i3],
                oldPositions[i3 + 1],
                oldPositions[i3 + 2]
            );
            newNormals.push(
                oldNormals[i3],
                oldNormals[i3 + 1],
                oldNormals[i3 + 2]
            );
            newUvs.push(
                oldUvs[i2],
                oldUvs[i2 + 1],
            );

            indexMap.set(oldIndex, newIndexCounter);
            return newIndexCounter++;
        }

        for (let i = 0; i < oldIndices.length; i++) {
            const remapped = mapIndex(oldIndices[i]);
            newIndices.push(remapped);
        }

        return {
            positions: newPositions,
            indices: newIndices,
            normals: newNormals,
            uvs: newUvs
        };
    }

    static lerp(a, b, t) {
        return t * (b - a) + a;
    }

    static slerpNormal(A, B, t) {
        let cosTheta = A.dot(B);
        cosTheta = Math.min(Math.max(cosTheta, -1), 1);
        const theta = Math.acos(cosTheta);
        const sinTheta = Math.sin(theta);

        if (sinTheta < 0.0001) {
            return A.clone().lerp(B, t).normalize();
        }

        const w1 = Math.sin((1 - t) * theta) / sinTheta;
        const w2 = Math.sin(t * theta) / sinTheta;

        return new THREE.Vector3()
            .copy(A).multiplyScalar(w1)
            .addScaledVector(B, w2)
            .normalize();
    }

    static computeTriangleNormal(x1, z1, x2, z2, x3, z3, getHeight) {
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
            nx /= len; ny /= len; nz /= len;
        }

        return new THREE.Vector3(nx, ny, nz);
    }
}

function falloffSmooth(x, y, w, h, a = 3, b = 2.2) {
    const nx = (x / w) * 2 - 1;
    const ny = (y / h) * 2 - 1;

    const d = Math.max(Math.abs(nx), Math.abs(ny));
    return smoothstep(a, b, d);
}

function smoothstep(edge0, edge1, x) {
    x = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
    return x * x * (3 - 2 * x);
}
function distance (x1,y1,x2,y2){
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}
function csdf( x,y, r, h,w){
	return (distance(x,y,w/2,h/2) - r)/h;
}


export class ChunkGenerator {
    private maxSegment: number;

    private noiseGen = { noise: Noise };

    constructor(private maxLod = 4, private chunkSize = 16) {
        this.maxSegment = Math.pow(2, maxLod);
    }

    build(lod: number, center: [number, number]) {
        let positions = [];
        let indices = [];
        let uvs = [];

        const meshSize = this.chunkSize + 3;
        const sub = Math.pow(2, this.maxLod - lod);
        const skipIncrement = this.chunkSize / sub;
        const vertexIndex = (x, y) => y * meshSize + x;

        const getHeightXZ = (x, z) => {
            let halfW = (meshSize - 1) / 2;
            let px = center[0] + (x - halfW);
            let pz = center[1] + (z - halfW);
            let noiseVal = this.noiseGen.noise(px * 0.02, 0, pz * 0.02) * 20 ;
            noiseVal = noiseVal * smoothstep(0.5,0.01,csdf(px,pz,10,180,180))
            return noiseVal
        };

        // === Generate grid vertices and triangles
        for (let z = 0; z < meshSize; z++) {
            for (let x = 0; x < meshSize; x++) {
                positions.push(x, getHeightXZ(x, z), z);

                uvs.push(x / (meshSize - 1), z / (meshSize - 1));

                const isMainVerts = (z > 0 && z < meshSize - 1) &&
                    (x > 0 && x < meshSize - 1);

                const isEdgeVertsForTris =
                    (x === 1 && z > 0) ||
                    (z === 1 && x > 0) ||
                    (x === meshSize - 1 && z > 1) ||
                    (z === meshSize - 1 && x > 1);

                const isLodVertsForTri = x > 1 && z > 1 &&
                    ((z - 1) % skipIncrement === 0 && (x - 1) % skipIncrement === 0);

                if (isEdgeVertsForTris) {
                    const a = vertexIndex(x - 1, z - 1);
                    const b = vertexIndex(x - 1, z);
                    const c = vertexIndex(x, z);
                    const d = vertexIndex(x, z - 1);
                    indices.push(a, b, c, a, c, d);
                }

                if (isMainVerts && isLodVertsForTri) {
                    const a = vertexIndex(x - skipIncrement, z - skipIncrement);
                    const b = vertexIndex(x - skipIncrement, z);
                    const c = vertexIndex(x, z);
                    const d = vertexIndex(x, z - skipIncrement);
                    indices.push(a, b, c, a, c, d);
                }
            }
        }

        // === Compute temp normals
        const geoTemp = new THREE.BufferGeometry();
        geoTemp.setIndex(indices);
        geoTemp.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geoTemp.computeVertexNormals();

        const normalAttr = geoTemp.getAttribute('normal');
        const getVertx = (x, z) => {
            let i = vertexIndex(x, z) * 3
            return new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
        }
        const setVertx = (i, vert) => {
            positions[i] = vert.x
            positions[i + 1] = vert.y
            positions[i + 2] = vert.z
        }

        function interpolateEdgeVertex(x, z, isHorizontal) {
            const idx = vertexIndex(x, z) * 3;
            const current = getVertx(x, z);

            const t = ((isHorizontal ? x : z) - 1) % skipIncrement;
            const pct = t / skipIncrement;
            const remaining = skipIncrement - t;

            const ax = isHorizontal ? x - t : x;
            const az = isHorizontal ? z : z - t;
            const bx = isHorizontal ? x + remaining : x;
            const bz = isHorizontal ? z : z + remaining;

            const vA = getVertx(ax, az);
            const vB = getVertx(bx, bz);

            current.y = TerrainUtils.lerp(vA.y, vB.y, pct);
            setVertx(idx, current);

            // Normal interpolation
            const nA = new THREE.Vector3().fromBufferAttribute(normalAttr, vertexIndex(ax, az));
            const nB = new THREE.Vector3().fromBufferAttribute(normalAttr, vertexIndex(bx, bz));
            const nLerp = TerrainUtils.slerpNormal(nA, nB, pct);

            normalAttr.setXYZ(idx / 3, nLerp.x, nLerp.y, nLerp.z);
        }



        function calculateOuterRingNormal(x, z) {
            const normal = new THREE.Vector3();

            const tris = [
                [x, z, x - 1, z, x - 1, z - 1],
                [x, z, x - 1, z - 1, x, z - 1],
                [x, z, x, z - 1, x + 1, z - 1],
                [x, z, x + 1, z - 1, x + 1, z],
                [x, z, x + 1, z, x + 1, z + 1],
                [x, z, x + 1, z + 1, x, z + 1],
            ];

            for (let t of tris) {
                const [x1, z1, x2, z2, x3, z3] = t;
                const n = TerrainUtils.computeTriangleNormal(x1, z1, x2, z2, x3, z3, getHeightXZ);

                if (isFinite(n.x)) normal.add(n);
            }

            return normal.normalize().negate(); // match your convention
        }

        for (let z = 0; z < meshSize; z++) {
            for (let x = 0; x < meshSize; x++) {

                const isLod = (x > 0 && z > 0) &&
                    ((x - 1) % skipIncrement === 0 &&
                        (z - 1) % skipIncrement === 0);
                const isEdgeInnerRingVerts = (x === 1 && z > 0 && z < meshSize - 1) || (z === 1 && x > 0 && x < meshSize - 1) || (x === meshSize - 2 && z > 1 && z < meshSize - 1) || (z === meshSize - 2 && x > 1 && x < meshSize - 2);
                const isTopBottomeEdge = isEdgeInnerRingVerts && (z === 1 || z === meshSize - 2)
                const isLeftRightEdge = isEdgeInnerRingVerts && (x === 1 || x === meshSize - 2)

                const isHorizontalStitch = isTopBottomeEdge && !isLod;
                const isVerticalStitch = isLeftRightEdge && !isLod;

                // === 1. Handle inner ring stitched strip ===
                if (isHorizontalStitch) {
                    interpolateEdgeVertex(x, z, true);
                    continue;
                }
                if (isVerticalStitch) {
                    interpolateEdgeVertex(x, z, false);
                    continue;
                }

                // === 2. Handle outer ring ===
                const isOuter = (x === 0 || z === 0 ||
                    x === meshSize - 1 || z === meshSize - 1);

                if (isOuter) {
                    const idx = vertexIndex(x, z) * 3;
                    const n = calculateOuterRingNormal(x, z);

                    normalAttr.setXYZ(idx / 3, n.x, n.y, n.z);
                }
            }
        }



        const remapped = TerrainUtils.remapAndClean(indices, positions, normalAttr.array, uvs);

        geoTemp.dispose();

        let geo = new THREE.BufferGeometry();
        geo.setIndex(remapped.indices);
        geo.setAttribute('position', new THREE.Float32BufferAttribute(remapped.positions, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(remapped.normals, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(remapped.uvs, 2));

        geo.translate(-(meshSize - 1) / 2, 0, -(meshSize - 1) / 2);
        geo.computeBoundingBox();
        geo.computeBoundingSphere();

        return geo;
    }
}




function getChunkRange(center, radius, chunkSize) {
  const minX = Math.floor((center.x - radius) / chunkSize);
  const maxX = Math.floor((center.x + radius) / chunkSize);
  const minZ = Math.floor((center.z - radius) / chunkSize);
  const maxZ = Math.floor((center.z + radius) / chunkSize);

  const keys = [];
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      keys.push(`${x},${z}`);
    }
  }
  return keys;
}


function scatter(
  target,
  camera,
  mouseEvent,
  radius,
  density,
  chunkSize,
  clear = false
) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const touchedChunks = new Set();

  // Mouse → NDC
  mouse.x = (mouseEvent.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(mouseEvent.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObject(target, false);
  if (!hits.length) return [];

  const hitPoint = hits[0].point;

  // ---------------- CLEAR MODE ----------------
  if (clear) {
    const keys = getChunkRange(hitPoint, radius, chunkSize);
    const r2 = radius * radius;

    for (const key of keys) {
      const points = chunkMap.get(key);
      if (!points || points.length === 0) continue;

      const filtered = points.filter(([pos]) => {
        const dx = pos.x - hitPoint.x;
        const dz = pos.z - hitPoint.z;
        return (dx * dx + dz * dz) > r2;
      });

      if (filtered.length !== points.length) {
        chunkMap.set(key, filtered);
        touchedChunks.add(key);
      }
    }

    return [...touchedChunks];
  }

  // ---------------- PLACE MODE ----------------
  const area = Math.PI * radius * radius;
  const count = Math.floor(area * density);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;

    const x = hitPoint.x + Math.cos(angle) * r;
    const z = hitPoint.z + Math.sin(angle) * r;

    // Project top → down
    raycaster.set(
      new THREE.Vector3(x, hitPoint.y + 100, z),
      new THREE.Vector3(0, -1, 0)
    );

    const projected = raycaster.intersectObject(target, false);
    if (!projected.length) continue;

    const hit = projected[0];

    const position = hit.point.clone();
    const normal = hit.face.normal.clone();
    normal.transformDirection(target.matrixWorld);

    const cx = Math.floor(position.x / chunkSize);
    const cz = Math.floor(position.z / chunkSize);
    const key = `${cx},${cz}`;

    if (!chunkMap.has(key)) {
      chunkMap.set(key, []);
    }

    chunkMap.get(key).push([position, normal]);
    touchedChunks.add(key);
  }

  return [...touchedChunks];
}




export default class Terrain extends Behavior{
  @INumber
  speed: number = 50;
  @IObject3D
  target: THREE.Object3D = null; 

  onStart() {
    console.log('Terrain started', this.speed, this.target);
    let chunkSize = 32;
    let geoBuilder = new ChunkGenerator(4, chunkSize)
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: false })
    for (let z = 0; z < 6; z++) {
        for (let x = 0; x < 6; x++) {
            let chunk = new THREE.Mesh(
                geoBuilder.build(1, [x*(chunkSize+2), z*(chunkSize+2)]),
                material
            )
            chunk.position.set(x*(chunkSize+2),0,z*(chunkSize+2))
            this.object.add(chunk)
        }
    }
  }

  onUpdate(dt: number) {
    //if (this.target) this.target.rotation.y += dt * this.speed||0.002;
    //if (this.object) this.object.rotation.y += dt * this.speed||0.002;
  }
}