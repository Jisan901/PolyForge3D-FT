import { SimplexNoise2D } from './SimplexHelper';

/**
 * Ridged Multifractal Noise (Musgrave style).
 * Produces sharp mountain ridges, alpine crests, and canyon walls.
 */
export class RidgedMultifractal {
    private simplex: SimplexNoise2D;

    constructor(seed: number = 42) {
        this.simplex = new SimplexNoise2D(seed);
    }

    public reseed(seed: number): void {
        this.simplex.reseed(seed);
    }

    /**
     * Samples ridged multifractal noise at (x, y).
     * @param octaves Number of detail octaves (default: 5)
     * @param lacunarity Frequency multiplier per octave (default: 2.1)
     * @param gain Amplitude dampening factor (default: 0.5)
     * @param sharpness Exponent applied to ridge peaks (default: 2.0)
     * @returns Normalized value in [0, 1]
     */
    public sample(
        x: number,
        y: number,
        octaves: number = 5,
        lacunarity: number = 2.1,
        gain: number = 0.5,
        sharpness: number = 2.0
    ): number {
        let total = 0;
        let frequency = 1.0;
        let amplitude = 1.0;
        let weight = 1.0;
        let maxPossible = 0;

        for (let i = 0; i < octaves; i++) {
            // Raw noise [-1, 1]
            let n = this.simplex.noise2D(x * frequency, y * frequency);

            // Invert and sharpen: sharp crease at 0
            n = 1.0 - Math.abs(n);
            n = Math.pow(n, sharpness);

            // Weight by previous octave so ridges are continuous
            n *= weight;
            weight = Math.min(1.0, Math.max(0.0, n * 2.0));

            total += n * amplitude;
            maxPossible += amplitude;

            frequency *= lacunarity;
            amplitude *= gain;
        }

        return maxPossible > 0 ? Math.min(1.0, Math.max(0.0, total / maxPossible)) : 0;
    }
}
