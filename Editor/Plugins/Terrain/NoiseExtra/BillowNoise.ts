import { SimplexNoise2D } from './SimplexHelper';

/**
 * Billow Noise Generator.
 * Produces puffy, cloud-like rolling mounds, foothills, and sand dunes.
 */
export class BillowNoise {
    private simplex: SimplexNoise2D;

    constructor(seed: number = 777) {
        this.simplex = new SimplexNoise2D(seed);
    }

    public reseed(seed: number): void {
        this.simplex.reseed(seed);
    }

    /**
     * Samples billow noise at (x, y).
     * @param octaves Number of detail octaves (default: 4)
     * @param lacunarity Frequency multiplier per octave (default: 2.0)
     * @param gain Amplitude multiplier per octave (default: 0.5)
     * @returns Normalized value in [0, 1]
     */
    public sample(
        x: number,
        y: number,
        octaves: number = 4,
        lacunarity: number = 2.0,
        gain: number = 0.5
    ): number {
        let total = 0;
        let frequency = 1.0;
        let amplitude = 1.0;
        let maxAmp = 0;

        for (let i = 0; i < octaves; i++) {
            const n = this.simplex.noise2D(x * frequency, y * frequency);
            // Billow transformation: absolute value creates rounded billows
            const billow = 2.0 * Math.abs(n) - 1.0;
            total += billow * amplitude;
            maxAmp += amplitude;

            frequency *= lacunarity;
            amplitude *= gain;
        }

        const normalized = (total / maxAmp) * 0.5 + 0.5;
        return Math.min(1.0, Math.max(0.0, normalized));
    }
}
