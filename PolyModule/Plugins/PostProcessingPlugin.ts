import { Plugin } from './Plugin';
import { pass, uniform, renderOutput } from 'three/tsl';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { dotScreen } from 'three/addons/tsl/display/DotScreenNode.js';
import * as THREE from 'three/webgpu';

export class PostProcessingPlugin extends Plugin {
    private renderer!: any; // EditorRenderer instance

    async init() {
        // Get renderer from core
        this.renderer = this.app.editorRenderer;

        // Register built-in post-processing effects
        this.registerDefaultPasses();

        // What this plugin provides to others
        this.provided.postProcessing = {
            register: this.registerPass.bind(this),
            enable: this.enablePass.bind(this),
            disable: this.disablePass.bind(this),
            toggle: this.togglePass.bind(this),
            updateData: this.updatePassData.bind(this),
            setOrder: this.setPassOrder.bind(this),
            getRegistry: this.getRegistry.bind(this),
        };
    }

    private registerDefaultPasses() {
        // FXAA Pass
        this.registerPass(
            'fxaa',
            (prevPass, renderer, scene, camera, data) => {
                return prevPass ? fxaa((prevPass)) : renderOutput(pass(scene, camera));
            },
            false,
            10,
            { enabled: true }
        );

        // Bloom Pass
        this.registerPass(
            'bloom',
            (prevPass, renderer, scene, camera, data, pass) => {
                const { strength = 1.0, threshold = 0.8, radius = 0.5 } = data || {};
                
				const scenePassColor = prevPass;
				const bloomPass = bloom( scenePassColor , strength, radius, threshold);
				pass.node = bloomPass;
				return scenePassColor.add(bloomPass)
            },
            false,
            20,
            { strength: 1.0, threshold: 0.8, radius: 0.5 },
            (current , renderer, scene, camera, data) => {
                const { strength = 1.0, threshold = 0.8, radius = 0.5 } = data || {};
                current.strength.value = strength
                current.threshold.value = threshold
                current.radius.value = radius
            },
        );

        // SSAO Pass (Screen Space Ambient Occlusion)
        this.registerPass(
            'ssao',
            (prevPass, renderer, scene, camera, data) => {
                const { 
                    intensity = 0.5, 
                    radius = 0.5, 
                    bias = 0.025,
                    samples = 16 
                } = data || {};
                
                const scenePass = pass(scene, camera);
                const scenePassColor = scenePass.getTextureNode();
                const scenePassDepth = scenePass.getTextureNode('depth');
                
                // SSAO implementation
                const ssaoPass = scenePassColor.ao(
                    scenePassDepth,
                    camera,
                    uniform(intensity),
                    uniform(radius),
                    uniform(bias)
                );
                
                return prevPass ? prevPass.mul(ssaoPass) : ssaoPass;
            },
            false,
            30,
            { intensity: 0.5, radius: 0.5, bias: 0.025, samples: 16 }
        );

        // Depth of Field Pass
        this.registerPass(
            'dof',
            (prevPass, renderer, scene, camera, data) => {
                const { 
                    focus = 10.0, 
                    aperture = 0.025, 
                    maxblur = 0.01 
                } = data || {};
                
                const scenePass = pass(scene, camera);
                const scenePassColor = scenePass.getTextureNode();
                const scenePassDepth = scenePass.getTextureNode('depth');
                
                const dofPass = scenePassColor.dof(
                    scenePassDepth,
                    camera,
                    uniform(focus),
                    uniform(aperture),
                    uniform(maxblur)
                );
                
                return prevPass ? prevPass.add(dofPass) : dofPass;
            },
            false,
            40,
            { focus: 10.0, aperture: 0.025, maxblur: 0.01 }
        );

        // Color Correction / LUT Pass
        this.registerPass(
            'colorCorrection',
            (prevPass, renderer, scene, camera, data) => {
                const { 
                    brightness = 0.0, 
                    contrast = 1.0, 
                    saturation = 1.0,
                    exposure = 1.0 
                } = data || {};
                
                const scenePass = pass(scene, camera);
                const scenePassColor = scenePass.getTextureNode();
                
                // Apply color adjustments
                let colorPass = scenePassColor;
                
                // Exposure
                if (exposure !== 1.0) {
                    colorPass = colorPass.mul(uniform(exposure));
                }
                
                // Brightness
                if (brightness !== 0.0) {
                    colorPass = colorPass.add(uniform(brightness));
                }
                
                // Contrast
                if (contrast !== 1.0) {
                    colorPass = colorPass.sub(0.5).mul(uniform(contrast)).add(0.5);
                }
                
                // Saturation
                if (saturation !== 1.0) {
                    const gray = colorPass.dot(THREE.vec3(0.299, 0.587, 0.114));
                    colorPass = gray.mix(colorPass, uniform(saturation));
                }
                
                return prevPass ? prevPass.add(colorPass) : colorPass;
            },
            false,
            50,
            { brightness: 0.0, contrast: 1.0, saturation: 1.0, exposure: 1.0 }
        );

        // Vignette Pass
        this.registerPass(
            'vignette',
            (prevPass, renderer, scene, camera, data) => {
                const { 
                    intensity = 0.5, 
                    smoothness = 0.5 
                } = data || {};
                
                const scenePass = pass(scene, camera);
                const scenePassColor = scenePass.getTextureNode();
                
                // Simple vignette effect
                const vignettePass = scenePassColor.vignette(
                    uniform(intensity),
                    uniform(smoothness)
                );
                
                return prevPass ? prevPass.mul(vignettePass) : vignettePass;
            },
            false,
            60,
            { intensity: 0.5, smoothness: 0.5 }
        );

        // Chromatic Aberration Pass
        this.registerPass(
            'chromaticAberration',
            (prevPass, renderer, scene, camera, data) => {
                const { offset = 0.005 } = data || {};
                
                const scenePass = pass(scene, camera);
                const scenePassColor = scenePass.getTextureNode();
                
                const aberrationPass = scenePassColor.chromaticAberration(
                    uniform(offset)
                );
                
                return prevPass ? prevPass.add(aberrationPass) : aberrationPass;
            },
            false,
            70,
            { offset: 0.005 }
        );

        // Film Grain Pass
        this.registerPass(
            'filmGrain',
            (prevPass, renderer, scene, camera, data) => {
                const { intensity = 0.5, time = 0.0 } = data || {};
                
                const scenePass = pass(scene, camera);
                const scenePassColor = scenePass.getTextureNode();
                
                const grainPass = scenePassColor.noise(
                    uniform(intensity),
                    uniform(time)
                );
                
                return prevPass ? prevPass.add(grainPass) : grainPass;
            },
            false,
            80,
            { intensity: 0.5, time: 0.0 }
        );

        // Default processing order
        this.setPassOrder([
            'defaultPass',
            'ssao',
            'dof',
            'bloom',
            'colorCorrection',
            'chromaticAberration',
            'vignette',
            'filmGrain',
            'fxaa'
        ]);
    }

    // only for default passes 
    private registerPass(
        name: string,
        callback: (prevPass: any, renderer: any, scene: any, camera: any, data?: any, pass?:any) => any,
        active: boolean = false,
        order: number = 0,
        data?: any,
        update?: (current: any, renderer: any, scene: any, camera: any, data?: any) => any,
    ) {
        this.renderer.registerPostProcess(name, callback, active, order, data, update );
    }

    enablePass(name: string) {
        this.renderer.enablePostProcess(name);
    }

    disablePass(name: string) {
        this.renderer.disablePostProcess(name);
    }

    togglePass(name: string): boolean {
        return this.renderer.togglePostProcess(name);
    }

    updatePassData(name: string, data: any) {
        this.renderer.updatePostProcessData(name, data);
    }

    setPassOrder(order: string[]) {
        this.renderer.setPostProcessingOrder(order);
    }

    getRegistry() {
        return this.renderer.getPostProcessingRegistry();
    }

    isPassActive(name: string): boolean {
        return this.renderer.isPostProcessActive(name);
    }

    getPassData(name: string): any {
        return this.renderer.getPostProcessData(name);
    }
}