/**
 * 2D Simplex Noise Implementation (deterministic, high-performance)
 */
export class SimplexNoise2D {
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

    public reseed(seed: number): void {
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
