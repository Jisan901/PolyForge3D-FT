
import * as THREE from 'three/webgpu'
import { PolyForge, mutationCall } from "../PolyForge";
const editor = PolyForge.editor;


/* ============================================================================
   SCENE DATA COPY HELPER
============================================================================ */

/**
 * Copies background, environment, and fog properties from one scene to another
 * @param sceneFrom - Source scene to copy from
 * @param sceneTo - Target scene to copy to
 * @param options - Optional configuration for what to copy
 */
export const copySceneData = (
    sceneFrom: THREE.Scene, 
    sceneTo: THREE.Scene,
    options?: {
        copyBackground?: boolean;
        copyEnvironment?: boolean;
        copyFog?: boolean;
        copyBackgroundProperties?: boolean;
        copyOverrideMaterial?: boolean;
    }
) => {
    const {
        copyBackground = true,
        copyEnvironment = true,
        copyFog = true,
        copyBackgroundProperties = true,
        copyOverrideMaterial = false
    } = options || {};

    // Copy background (Color or Texture)
    if (copyBackground && sceneFrom.background) {
        if (sceneFrom.background instanceof THREE.Color) {
            sceneTo.background = sceneFrom.background;
        } else if (sceneFrom.background instanceof THREE.Texture) {
            sceneTo.background = sceneFrom.background;
        } else {
            sceneTo.background = sceneFrom.background;
        }
        editor.setProperty(sceneTo, 'background', sceneTo.background);
        mutationCall(sceneTo, 'background');
    }

    // Copy background properties
    if (copyBackgroundProperties) {
        if (sceneFrom.backgroundBlurriness !== undefined) {
            sceneTo.backgroundBlurriness = sceneFrom.backgroundBlurriness;
            editor.setProperty(sceneTo, 'backgroundBlurriness', sceneTo.backgroundBlurriness);
            mutationCall(sceneTo, 'backgroundBlurriness');
        }
        if (sceneFrom.backgroundIntensity !== undefined) {
            sceneTo.backgroundIntensity = sceneFrom.backgroundIntensity;
            editor.setProperty(sceneTo, 'backgroundIntensity', sceneTo.backgroundIntensity);
            mutationCall(sceneTo, 'backgroundIntensity');
        }
        if (sceneFrom.environmentIntensity !== undefined) {
            sceneTo.environmentIntensity = sceneFrom.environmentIntensity;
            editor.setProperty(sceneTo, 'environmentIntensity', sceneTo.environmentIntensity);
            mutationCall(sceneTo, 'environmentIntensity');
        }
    }

    // Copy environment map
    if (copyEnvironment && sceneFrom.environment) {
        sceneTo.environment = sceneFrom.environment;
        editor.setProperty(sceneTo, 'environment', sceneTo.environment);
        mutationCall(sceneTo, 'environment');
    }

    // Copy fog
    if (copyFog && sceneFrom.fog) {
        if (sceneFrom.fog instanceof THREE.Fog) {
            sceneTo.fog = new THREE.Fog(
                sceneFrom.fog.color,
                sceneFrom.fog.near,
                sceneFrom.fog.far
            );
        } else if (sceneFrom.fog instanceof THREE.FogExp2) {
            sceneTo.fog = new THREE.FogExp2(
                sceneFrom.fog.color,
                sceneFrom.fog.density
            );
        }
        editor.setProperty(sceneTo, 'fog', sceneTo.fog);
        mutationCall(sceneTo, 'fog');
    }

    // Copy override material (optional, usually not needed)
    if (copyOverrideMaterial && sceneFrom.overrideMaterial) {
        sceneTo.overrideMaterial = sceneFrom.overrideMaterial;
        editor.setProperty(sceneTo, 'overrideMaterial', sceneTo.overrideMaterial);
        mutationCall(sceneTo, 'overrideMaterial');
    }
};

/**
 * Simplified version that copies all scene visual properties
 */
export const copyAllSceneData = (sceneFrom: THREE.Scene, sceneTo: THREE.Scene) => {
    copySceneData(sceneFrom, sceneTo, {
        copyBackground: true,
        copyEnvironment: true,
        copyFog: true,
        copyBackgroundProperties: true,
        copyOverrideMaterial: false
    });
};

/**
 * Copy only background-related properties
 */
export const copySceneBackground = (sceneFrom: THREE.Scene, sceneTo: THREE.Scene) => {
    copySceneData(sceneFrom, sceneTo, {
        copyBackground: true,
        copyEnvironment: false,
        copyFog: false,
        copyBackgroundProperties: true,
        copyOverrideMaterial: false
    });
};

/**
 * Copy only environment map
 */
export const copySceneEnvironment = (sceneFrom: THREE.Scene, sceneTo: THREE.Scene) => {
    copySceneData(sceneFrom, sceneTo, {
        copyBackground: false,
        copyEnvironment: true,
        copyFog: false,
        copyBackgroundProperties: false,
        copyOverrideMaterial: false
    });
};