/**
 * Fast, deterministic 2D Voronoi / Worley Cellular Noise Generator
 * Supports F1 (distance to closest point), F2, F2 - F1 (cellular borders/ridges),
 * and stepped terracing.
 */
export class VoronoiNoise {
    private seed: number;

    constructor(seed: number = 1337) {
        this.seed = seed;
    }

    public reseed(seed: number): void {
        this.seed = seed;
    }

    /**
     * Fast pseudo-random 2D hash returning [0, 1] for cell coordinates.
     */
    private hash2(x: number, y: number): [number, number] {
        let n = Math.sin(x * 127.1 + y * 311.7 + this.seed * 0.1031) * 43758.5453123;
        const rx = n - Math.floor(n);
        n = Math.sin(x * 269.5 + y * 183.3 + this.seed * 0.1031) * 43758.5453123;
        const ry = n - Math.floor(n);
        return [rx, ry];
    }

    /**
     * Samples Voronoi noise at (x, y).
     * @returns { f1: closest distance, f2: 2nd closest, ridge: f2 - f1, cellId: pseudo-random cell value }
     */
    public sample(x: number, y: number): { f1: number; f2: number; ridge: number; cellVal: number } {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;

        let f1 = 999.0;
        let f2 = 999.0;
        let bestCellVal = 0.0;

        // Check 3x3 neighborhood
        for (let j = -1; j <= 1; j++) {
            for (let i = -1; i <= 1; i++) {
                const cellX = ix + i;
                const cellY = iy + j;
                const [rx, ry] = this.hash2(cellX, cellY);

                // Feature point in cell
                const dx = (i + rx) - fx;
                const dy = (j + ry) - fy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < f1) {
                    f2 = f1;
                    f1 = dist;
                    bestCellVal = rx; // Unique cell height
                } else if (dist < f2) {
                    f2 = dist;
                }
            }
        }

        return {
            f1: Math.min(1.0, f1),
            f2: Math.min(1.0, f2),
            ridge: Math.max(0.0, Math.min(1.0, f2 - f1)),
            cellVal: bestCellVal
        };
    }

    /**
     * Multi-octave Fractal Voronoi Noise.
     * @param mode 'f1' (blobs/peaks), 'ridge' (sharp crags/borders), 'terraced' (flat mesas)
     */
    public fbm(
        x: number,
        y: number,
        octaves: number = 3,
        lacunarity: number = 2.0,
        gain: number = 0.5,
        mode: 'f1' | 'ridge' | 'terraced' = 'ridge'
    ): number {
        let total = 0;
        let amplitude = 1.0;
        let maxAmp = 0;
        let freq = 1.0;

        for (let o = 0; o < octaves; o++) {
            const v = this.sample(x * freq, y * freq);
            let val = 0;
            if (mode === 'f1') {
                val = 1.0 - v.f1;
            } else if (mode === 'ridge') {
                val = v.ridge;
            } else {
                val = v.cellVal;
            }

            total += val * amplitude;
            maxAmp += amplitude;
            amplitude *= gain;
            freq *= lacunarity;
        }

        return maxAmp > 0 ? total / maxAmp : 0;
    }
}
