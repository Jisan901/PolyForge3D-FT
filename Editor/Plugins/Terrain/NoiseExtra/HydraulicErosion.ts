/**
 * Hydraulic Erosion Simulation & Procedural River Carving.
 *
 * Implements:
 * 1. Droplet Particle Simulation on 2D heightfields:
 *    Simulates thousands of water droplets flowing downhill, eroding slopes,
 *    and depositing sediment in valleys to form realistic riverbeds and ravines.
 * 2. Continuous Procedural Drainage Carving:
 *    Applies analytical flow-accumulation carving and talus scree deposition
 *    for infinite point-by-point height sampling.
 */
export interface DropletErosionOptions {
    iterations?: number;
    inertia?: number;
    sedimentCapacityFactor?: number;
    minSedimentCapacity?: number;
    erodeSpeed?: number;
    depositSpeed?: number;
    evaporateSpeed?: number;
    gravity?: number;
    maxDropletLifetime?: number;
    initialWater?: number;
    initialSpeed?: number;
    erosionRadius?: number;
}

export class HydraulicErosion {
    /**
     * Simulates physical particle droplet erosion on a 2D heightmap array.
     * @param heightmap Flattened Float32Array of size width * depth
     * @param width Grid width in vertices
     * @param depth Grid depth in vertices
     * @param options Droplet simulation parameters
     */
    public static applyGridErosion(
        heightmap: Float32Array,
        width: number,
        depth: number,
        options: DropletErosionOptions = {}
    ): void {
        const iterations = options.iterations ?? Math.min(60000, width * depth * 3);
        const inertia = options.inertia ?? 0.05;
        const sedimentCapacityFactor = options.sedimentCapacityFactor ?? 4.0;
        const minSedimentCapacity = options.minSedimentCapacity ?? 0.01;
        const erodeSpeed = options.erodeSpeed ?? 0.3;
        const depositSpeed = options.depositSpeed ?? 0.3;
        const evaporateSpeed = options.evaporateSpeed ?? 0.02;
        const gravity = options.gravity ?? 4.0;
        const maxLifetime = options.maxDropletLifetime ?? 35;
        const initialWater = options.initialWater ?? 1.0;
        const initialSpeed = options.initialSpeed ?? 1.0;

        const getIndex = (x: number, y: number) => y * width + x;

        for (let iter = 0; iter < iterations; iter++) {
            // Random start position within boundaries
            let posX = Math.random() * (width - 2) + 1;
            let posZ = Math.random() * (depth - 2) + 1;
            let dirX = 0;
            let dirZ = 0;
            let speed = initialSpeed;
            let water = initialWater;
            let sediment = 0;

            for (let lifetime = 0; lifetime < maxLifetime; lifetime++) {
                const nodeX = Math.floor(posX);
                const nodeZ = Math.floor(posZ);
                const fx = posX - nodeX;
                const fz = posZ - nodeZ;

                if (nodeX < 0 || nodeX >= width - 1 || nodeZ < 0 || nodeZ >= depth - 1) break;

                // Bilinear height & gradient calculation
                const h00 = heightmap[getIndex(nodeX, nodeZ)];
                const h10 = heightmap[getIndex(nodeX + 1, nodeZ)];
                const h01 = heightmap[getIndex(nodeX, nodeZ + 1)];
                const h11 = heightmap[getIndex(nodeX + 1, nodeZ + 1)];

                const gradX = (h10 - h00) * (1 - fz) + (h11 - h01) * fz;
                const gradZ = (h01 - h00) * (1 - fx) + (h11 - h10) * fx;
                const currentHeight = (h00 * (1 - fx) + h10 * fx) * (1 - fz) + (h01 * (1 - fx) + h11 * fx) * fz;

                // Update droplet direction with inertia
                dirX = dirX * inertia - gradX * (1 - inertia);
                dirZ = dirZ * inertia - gradZ * (1 - inertia);

                const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
                if (len < 1e-6) break;
                dirX /= len;
                dirZ /= len;

                const newPosX = posX + dirX;
                const newPosZ = posZ + dirZ;

                const nextNodeX = Math.floor(newPosX);
                const nextNodeZ = Math.floor(newPosZ);
                if (nextNodeX < 0 || nextNodeX >= width - 1 || nextNodeZ < 0 || nextNodeZ >= depth - 1) break;

                const nh00 = heightmap[getIndex(nextNodeX, nextNodeZ)];
                const nh10 = heightmap[getIndex(nextNodeX + 1, nextNodeZ)];
                const nh01 = heightmap[getIndex(nextNodeX, nextNodeZ + 1)];
                const nh11 = heightmap[getIndex(nextNodeX + 1, nextNodeZ + 1)];
                const nfx = newPosX - nextNodeX;
                const nfz = newPosZ - nextNodeZ;
                const newHeight = (nh00 * (1 - nfx) + nh10 * nfx) * (1 - nfz) + (nh01 * (1 - nfx) + nh11 * nfx) * nfz;

                const deltaHeight = newHeight - currentHeight;

                // Sediment capacity calculation
                const capacity = Math.max(-deltaHeight, minSedimentCapacity) * speed * water * sedimentCapacityFactor;

                if (sediment > capacity || deltaHeight > 0) {
                    // Deposit sediment in depressions or uphill stalls
                    const depositAmount = deltaHeight > 0
                        ? Math.min(deltaHeight, sediment)
                        : (sediment - capacity) * depositSpeed;

                    sediment -= depositAmount;
                    heightmap[getIndex(nodeX, nodeZ)] += depositAmount * (1 - fx) * (1 - fz);
                    heightmap[getIndex(nodeX + 1, nodeZ)] += depositAmount * fx * (1 - fz);
                    heightmap[getIndex(nodeX, nodeZ + 1)] += depositAmount * (1 - fx) * fz;
                    heightmap[getIndex(nodeX + 1, nodeZ + 1)] += depositAmount * fx * fz;
                } else {
                    // Erode terrain on steep slopes
                    const erodeAmount = Math.min((capacity - sediment) * erodeSpeed, -deltaHeight);
                    sediment += erodeAmount;
                    heightmap[getIndex(nodeX, nodeZ)] -= erodeAmount * (1 - fx) * (1 - fz);
                    heightmap[getIndex(nodeX + 1, nodeZ)] -= erodeAmount * fx * (1 - fz);
                    heightmap[getIndex(nodeX, nodeZ + 1)] -= erodeAmount * (1 - fx) * fz;
                    heightmap[getIndex(nodeX + 1, nodeZ + 1)] -= erodeAmount * fx * fz;
                }

                speed = Math.sqrt(Math.max(0, speed * speed + deltaHeight * gravity));
                water *= (1 - evaporateSpeed);
                posX = newPosX;
                posZ = newPosZ;
            }
        }
    }

    /**
     * Analytical procedural drainage and gully erosion modifier.
     * Carves dendritic valleys and deposits alluvial silt along drainage paths.
     * @param x World X coordinate
     * @param z World Z coordinate
     * @param baseHeight Underlying un-eroded height value
     * @param slope Local slope gradient [0, 1]
     * @param noiseFunc Detail noise sampler
     * @returns Modified eroded height
     */
    public static proceduralDrainage(
        x: number,
        z: number,
        baseHeight: number,
        slope: number,
        drainageNoise: number,
        gullyNoise: number
    ): number {
        // Stream / drainage channel carving:
        // Drainage occurs along valleys (lower elevation) and creates V-shaped ravines
        const channelMask = Math.pow(Math.max(0.0, 1.0 - drainageNoise), 3.0);
        const carveDepth = channelMask * (0.2 + slope * 0.4);

        // Alluvial fan sediment deposition at the base of slopes
        const depositionMask = Math.max(0.0, 0.4 - slope) * (1.0 - channelMask) * 0.15;

        // Gully micro-erosion along steep slopes
        const gullyErosion = slope > 0.5 ? gullyNoise * 0.08 * slope : 0.0;

        return Math.max(0.0, Math.min(1.0, baseHeight - carveDepth + depositionMask - gullyErosion));
    }
}
