import { SimplexNoise2D } from './SimplexHelper';
import { VoronoiNoise } from './VoronoiNoise';
import { RidgedMultifractal } from './RidgedMultifractal';
import { BillowNoise } from './BillowNoise';
import { DomainWarp } from './DomainWarp';
import { HydraulicErosion } from './HydraulicErosion';

export interface CompositeNoiseOptions {
    seed?: number;
    baseFrequency?: number;
    baseOctaves?: number;
    warpStrength?: number;
    ridgeWeight?: number;
    voronoiWeight?: number;
    billowWeight?: number;
    erosionStrength?: number;
    mountainThreshold?: number;
}

/**
 * Composite Terrain Synthesizer ("Final Noise Made from All").
 *
 * Blends:
 * 1. Continental FBM Base (Simplex/Perlin macro topology)
 * 2. 2-Stage Domain Warping (tectonic distortion & natural meandering)
 * 3. Ridged Multifractal (sharp alpine crests and razor mountain ridges)
 * 4. Cellular Voronoi (craggy rock faces and terraced plateaus)
 * 5. Billow Noise (rolling foothills and rounded mounds)
 * 6. Hydraulic Erosion (carving drainage networks, gullies, and alluvial fans)
 */
export class CompositeNoise {
    private simplex: SimplexNoise2D;
    private voronoi: VoronoiNoise;
    private ridged: RidgedMultifractal;
    private billow: BillowNoise;
    private warp: DomainWarp;

    public options: Required<CompositeNoiseOptions>;

    constructor(options: CompositeNoiseOptions = {}) {
        const seed = options.seed ?? 12345;
        this.simplex = new SimplexNoise2D(seed);
        this.voronoi = new VoronoiNoise(seed + 101);
        this.ridged = new RidgedMultifractal(seed + 202);
        this.billow = new BillowNoise(seed + 303);
        this.warp = new DomainWarp(seed + 404);

        this.options = {
            seed,
            baseFrequency: options.baseFrequency ?? 0.008,
            baseOctaves: options.baseOctaves ?? 4,
            warpStrength: options.warpStrength ?? 14.0,
            ridgeWeight: options.ridgeWeight ?? 0.45,
            voronoiWeight: options.voronoiWeight ?? 0.25,
            billowWeight: options.billowWeight ?? 0.20,
            erosionStrength: options.erosionStrength ?? 0.35,
            mountainThreshold: options.mountainThreshold ?? 0.40
        };
    }

    public reseed(seed: number): void {
        this.options.seed = seed;
        this.simplex.reseed(seed);
        this.voronoi.reseed(seed + 101);
        this.ridged.reseed(seed + 202);
        this.billow.reseed(seed + 303);
        this.warp.reseed(seed + 404);
    }

    /**
     * Evaluates the final composite noise at world position (worldX, worldZ).
     * @returns Normalized height value in [0, 1]
     */
    public sample(worldX: number, worldZ: number): number {
        const {
            baseFrequency,
            baseOctaves,
            warpStrength,
            ridgeWeight,
            voronoiWeight,
            billowWeight,
            erosionStrength,
            mountainThreshold
        } = this.options;

        // 1. Apply Domain Warping to coordinates
        const [wx, wz] = this.warp.warp(worldX, worldZ, warpStrength, baseFrequency * 1.5, true);

        // 2. Base Continental FBM
        let baseHeight = 0;
        let amp = 1.0;
        let maxAmp = 0;
        let freq = baseFrequency;
        for (let i = 0; i < baseOctaves; i++) {
            baseHeight += this.simplex.noise2D(wx * freq, wz * freq) * amp;
            maxAmp += amp;
            amp *= 0.5;
            freq *= 2.0;
        }
        baseHeight = (baseHeight / maxAmp) * 0.5 + 0.5; // Map to [0, 1]

        // 3. Mountain Elevation Mask (mountains emerge at higher base elevations)
        const mountainMask = Math.max(0.0, Math.min(1.0, (baseHeight - mountainThreshold) / (1.0 - mountainThreshold)));

        // 4. Sharp Alpine Ridges (Ridged Multifractal)
        const ridgeSample = this.ridged.sample(wx * baseFrequency * 2.2, wz * baseFrequency * 2.2, 4);
        const mountainElevation = ridgeSample * ridgeWeight * mountainMask;

        // 5. Voronoi Crags & Terraces
        const voronoiSample = this.voronoi.fbm(wx * baseFrequency * 4.0, wz * baseFrequency * 4.0, 3, 2.0, 0.5, 'ridge');
        const cragElevation = voronoiSample * voronoiWeight * (mountainMask * 0.7 + (1.0 - mountainMask) * 0.3);

        // 6. Billow Foothills (Smooth rolling mounds in valleys / lowlands)
        const billowSample = this.billow.sample(wx * baseFrequency * 1.8, wz * baseFrequency * 1.8, 3);
        const foothillElevation = billowSample * billowWeight * (1.0 - mountainMask);

        // Combine layers
        let combined = baseHeight * 0.5 + mountainElevation + cragElevation + foothillElevation;

        // 7. Hydraulic Erosion & Drainage Network Carving
        if (erosionStrength > 0) {
            // Local slope approximation using directional finite differences
            const eps = 1.5;
            const hRight = this.simplex.noise2D((wx + eps) * baseFrequency, wz * baseFrequency) * 0.5 + 0.5;
            const hUp = this.simplex.noise2D(wx * baseFrequency, (wz + eps) * baseFrequency) * 0.5 + 0.5;
            const slope = Math.min(1.0, Math.sqrt((hRight - baseHeight) ** 2 + (hUp - baseHeight) ** 2) * 8.0);

            // Drainage stream noise and gully micro-structure
            const drainageNoise = this.voronoi.sample(wx * baseFrequency * 1.5, wz * baseFrequency * 1.5).f1;
            const gullyNoise = Math.abs(this.simplex.noise2D(wx * baseFrequency * 8.0, wz * baseFrequency * 8.0));

            const eroded = HydraulicErosion.proceduralDrainage(wx, wz, combined, slope, drainageNoise, gullyNoise);
            combined = combined * (1.0 - erosionStrength) + eroded * erosionStrength;
        }

        // Clamp cleanly to [0, 1]
        return Math.min(1.0, Math.max(0.0, combined));
    }
}
