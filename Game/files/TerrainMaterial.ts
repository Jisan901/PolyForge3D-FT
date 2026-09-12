import {
    Fn,
    color,
    float,
    vec2,
    vec3,
    vec4,
    mix,
    smoothstep,
    clamp,
    sin,
    cos,
    dot,
    normalize,
    positionWorld,
    normalWorld,
    mx_noise_float,
    uniform
} from 'three/tsl';
import { MeshStandardNodeMaterial } from 'three/webgpu';

export interface TerrainMaterialOptions {
    sandColor?: string;
    grassColor?: string;
    forestColor?: string;
    rockColor?: string;
    rockDarkColor?: string;
    snowColor?: string;
    sandHeight?: number;
    snowHeight?: number;
    slopeThreshold?: number;
    slopeBlend?: number;
    noiseScale?: number;
    roughness?: number;
    metalness?: number;
}

/**
 * Creates a next-generation procedural PBR terrain material using Three.js Shading Language (TSL).
 *
 * Features:
 * - Slope-aware cliff / rock blending with triplanar-style strata layers.
 * - Altitude / height-based biomes: Sand/Shoreline -> Lush Grassland -> High Rock -> Mountain Snow.
 * - Slope-dependent snow coverage: snow settles on flat summits & ledges, sliding off vertical cliffs.
 * - Procedural noise perturbation preventing flat gradient banding and repeating tile patterns.
 * - Dynamic PBR roughness & metalness response per biome layer.
 * - Fully configurable TSL uniforms for real-time adjustments without shader recompilation.
 */
export function createTerrainMaterial(options: TerrainMaterialOptions = {}): MeshStandardNodeMaterial & { terrainUniforms: any } {
    // Dynamic TSL Uniforms for real-time artist & gameplay control
    const uSandColor = uniform(color(options.sandColor ?? '#c4b487'));
    const uGrassColor = uniform(color(options.grassColor ?? '#4d7c34'));
    const uForestColor = uniform(color(options.forestColor ?? '#274b1e'));
    const uRockColor = uniform(color(options.rockColor ?? '#5a5550'));
    const uRockDarkColor = uniform(color(options.rockDarkColor ?? '#383532'));
    const uSnowColor = uniform(color(options.snowColor ?? '#f0f5f8'));

    const uSandHeight = uniform(float(options.sandHeight ?? 2.0));
    const uSnowHeight = uniform(float(options.snowHeight ?? 28.0));
    const uSlopeThreshold = uniform(float(options.slopeThreshold ?? 0.65));
    const uSlopeBlend = uniform(float(options.slopeBlend ?? 0.15));
    const uNoiseScale = uniform(float(options.noiseScale ?? 0.04));

    // Procedural Color Node Graph
    const terrainColorGraph = Fn(() => {
        const pos = positionWorld;
        const norm = normalWorld;
        const slope = norm.y;
        const height = pos.y;

        // Multi-frequency organic procedural noise
        const macroNoise = mx_noise_float(pos.xz.mul(uNoiseScale));
        const microNoise = mx_noise_float(pos.xz.mul(uNoiseScale.mul(float(6.0))));
        const combinedNoise = macroNoise.mul(float(0.7)).add(microNoise.mul(float(0.3)));

        // Perturb height and slope to produce natural jagged cliffs and organic transitions
        const perturbedHeight = height.add(combinedNoise.mul(float(3.5)));
        const perturbedSlope = slope.add(combinedNoise.mul(float(0.12)));

        // 1. Grassland Color Variation: blend lush meadow green with rich forest tones
        const grassMix = clamp(combinedNoise.mul(float(0.5)).add(float(0.5)), float(0.0), float(1.0));
        const grassColor = mix(uGrassColor, uForestColor, grassMix);

        // 2. Cliff Strata Banding: horizontal geological layers across steep faces
        const strata = sin(pos.y.mul(float(1.2)).add(macroNoise.mul(float(2.0)))).mul(float(0.5)).add(float(0.5));
        const rockColor = mix(uRockDarkColor, uRockColor, strata);

        // 3. Slope Blending: Flat terrain receives grass, steep angles receive cliff rock
        const slopeMin = uSlopeThreshold.sub(uSlopeBlend);
        const slopeMax = uSlopeThreshold.add(uSlopeBlend);
        const grassFactor = smoothstep(slopeMin, slopeMax, perturbedSlope);
        let surfaceColor = mix(rockColor, grassColor, grassFactor);

        // 4. Shoreline / Lowland Sand Blending
        const sandFactor = smoothstep(uSandHeight.add(float(1.5)), uSandHeight.sub(float(1.5)), perturbedHeight);
        surfaceColor = mix(surfaceColor, uSandColor, sandFactor.mul(grassFactor));

        // 5. Mountain Snow Peak Blending (high elevation + gentle slope retention)
        const snowAltFactor = smoothstep(uSnowHeight.sub(float(4.0)), uSnowHeight.add(float(4.0)), perturbedHeight);
        const snowSlopeFactor = smoothstep(float(0.4), float(0.75), slope);
        const snowFactor = snowAltFactor.mul(snowSlopeFactor);
        surfaceColor = mix(surfaceColor, uSnowColor, snowFactor);

        return surfaceColor;
    });

    // Procedural PBR Roughness Node Graph
    const terrainRoughnessGraph = Fn(() => {
        const pos = positionWorld;
        const norm = normalWorld;
        const slope = norm.y;
        const height = pos.y;

        const macroNoise = mx_noise_float(pos.xz.mul(uNoiseScale));
        const perturbedHeight = height.add(macroNoise.mul(float(2.5)));
        const perturbedSlope = slope.add(macroNoise.mul(float(0.1)));

        const slopeMin = uSlopeThreshold.sub(uSlopeBlend);
        const slopeMax = uSlopeThreshold.add(uSlopeBlend);
        const grassFactor = smoothstep(slopeMin, slopeMax, perturbedSlope);

        // Base roughness: Rock is weathered (~0.72), Grass is matte (~0.88)
        let roughnessVal = mix(float(0.72), float(0.88), grassFactor);

        // Sand has dusty, dry roughness (~0.92)
        const sandFactor = smoothstep(uSandHeight.add(float(1.5)), uSandHeight.sub(float(1.5)), perturbedHeight);
        roughnessVal = mix(roughnessVal, float(0.92), sandFactor.mul(grassFactor));

        // Snow has crisp specular sheen (~0.38)
        const snowAltFactor = smoothstep(uSnowHeight.sub(float(4.0)), uSnowHeight.add(float(4.0)), perturbedHeight);
        const snowSlopeFactor = smoothstep(float(0.4), float(0.75), slope);
        const snowFactor = snowAltFactor.mul(snowSlopeFactor);
        roughnessVal = mix(roughnessVal, float(0.38), snowFactor);

        return roughnessVal;
    });

    // Procedural PBR Metalness Node Graph
    const terrainMetalnessGraph = Fn(() => {
        const pos = positionWorld;
        const norm = normalWorld;
        const slope = norm.y;

        const slopeMin = uSlopeThreshold.sub(uSlopeBlend);
        const slopeMax = uSlopeThreshold.add(uSlopeBlend);
        const grassFactor = smoothstep(slopeMin, slopeMax, slope);

        // Slight mineral sheen on exposed rock faces (~0.05), pure dielectric elsewhere (~0.0)
        return mix(float(0.05), float(0.0), grassFactor);
    });

    const material = new MeshStandardNodeMaterial({
        roughness: options.roughness ?? 0.85,
        metalness: options.metalness ?? 0.05
    }) as MeshStandardNodeMaterial & { terrainUniforms: any };

    material.name = 'TSL_TerrainMaterial';
    material.colorNode = terrainColorGraph();
    material.roughnessNode = terrainRoughnessGraph();
    material.metalnessNode = terrainMetalnessGraph();

    material.terrainUniforms = {
        sandColor: uSandColor,
        grassColor: uGrassColor,
        forestColor: uForestColor,
        rockColor: uRockColor,
        rockDarkColor: uRockDarkColor,
        snowColor: uSnowColor,
        sandHeight: uSandHeight,
        snowHeight: uSnowHeight,
        slopeThreshold: uSlopeThreshold,
        slopeBlend: uSlopeBlend,
        noiseScale: uNoiseScale
    };

    return material;
}

// Default preconfigured instance ready for immediate use
const terrainMaterial = createTerrainMaterial();

export { terrainMaterial };
export default terrainMaterial;
