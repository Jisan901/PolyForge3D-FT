import { SimplexNoise2D } from './SimplexHelper';

/**
 * Domain Warping Generator.
 * Distorts coordinate space using vector noise fields, creating organic
 * swirls, tectonic shifts, meandering rivers, and fluid-like geological folds.
 */
export class DomainWarp {
    private simplexX: SimplexNoise2D;
    private simplexZ: SimplexNoise2D;

    constructor(seed: number = 9999) {
        this.simplexX = new SimplexNoise2D(seed);
        this.simplexZ = new SimplexNoise2D(seed + 1013);
    }

    public reseed(seed: number): void {
        this.simplexX.reseed(seed);
        this.simplexZ.reseed(seed + 1013);
    }

    /**
     * Warps a 2D coordinate (x, z) using single-pass or multi-pass domain warping.
     * @param x Input X coordinate
     * @param z Input Z coordinate
     * @param warpStrength Maximum offset distance in world units
     * @param warpFrequency Scale of the warping distortion field
     * @param recursive If true, applies 2-stage recursive warping for deep twisting
     * @returns Warped [warpedX, warpedZ]
     */
    public warp(
        x: number,
        z: number,
        warpStrength: number = 12.0,
        warpFrequency: number = 0.015,
        recursive: boolean = true
    ): [number, number] {
        const qx = this.simplexX.noise2D(x * warpFrequency, z * warpFrequency);
        const qz = this.simplexZ.noise2D(x * warpFrequency + 5.2, z * warpFrequency + 1.3);

        if (!recursive) {
            return [x + qx * warpStrength, z + qz * warpStrength];
        }

        // Second stage recursive warp
        const rx = this.simplexX.noise2D((x + qx * 4.0) * warpFrequency + 1.7, (z + qz * 4.0) * warpFrequency + 9.2);
        const rz = this.simplexZ.noise2D((x + qx * 4.0) * warpFrequency + 8.3, (z + qz * 4.0) * warpFrequency + 2.8);

        return [x + rx * warpStrength, z + rz * warpStrength];
    }
}
