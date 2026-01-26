import fs from '@/Core/lib/fs';

interface GraphicsSettings {
  antialiasing: string;
  resolutionScale: number;
  realtimeShadows: boolean;
  ambientLight: string;
  textureQuality: string;
  // Post-processing
  bloom: boolean;
  bloomStrength: number;
  bloomThreshold: number;
  bloomRadius: number;
  fxaa: boolean;
  ssao: boolean;
  ssaoIntensity: number;
  dof: boolean;
  dofFocus: number;
  vignette: boolean;
  vignetteIntensity: number;
}

interface PhysicsSettings {
  gravity: number;
  timeStep: number;
  maxIterations: number;
  continuousCollision: boolean;
}



const defaultSettings = {
    general: {
        theme: 'Dark (Standard)',
        language: 'English',
        autoSave: true,
        autoSaveInterval: 5,
        showFPS: false,
    },
    graphics: {
        antialiasing: 'FXAA',
        resolutionScale: 1.0,
        realtimeShadows: true,
        ambientLight: '#1a1a1a',
        textureQuality: 'High',
        bloom: false,
        bloomStrength: 1.0,
        bloomThreshold: 0.8,
        bloomRadius: 0.5,
        fxaa: true,
        ssao: false,
        ssaoIntensity: 0.5,
        dof: false,
        dofFocus: 10.0,
        vignette: false,
        vignetteIntensity: 0.5,
    },
    physics: {
        gravity: -9.81,
        timeStep: 0.02,
        maxIterations: 10,
        continuousCollision: true,
    },
    input: {
        moveTool: 'W',
        rotateTool: 'E',
        scaleTool: 'R',
        playPause: 'Ctrl + P',
    },
};

type SettingsType = typeof defaultSettings;

export class Settings {
    private static instance: Settings;
    private settings: SettingsType;
    private initialized: boolean = false;
    private saveTimeout: any | null = null;

    private constructor(private fileUrl: string) {
        this.settings = { ...defaultSettings };
    }

    static getInstance(fileUrl: string = 'settings.json'): Settings {
        if (!Settings.instance) {
            Settings.instance = new Settings(fileUrl);
        }
        return Settings.instance;
    }

    async init(): Promise<void> {
        if (this.initialized) return;

        try {
            const data = await fs.readFile(this.fileUrl, { encoding: 'utf8' });
            const loadedSettings = JSON.parse(data);

            // Deep merge with defaults to handle missing keys
            this.settings = this.mergeWithDefaults(loadedSettings);

            console.log('Settings loaded successfully');
        } catch (error) {
            console.warn('Settings file not found, using defaults:', error);
            // Save defaults to create the file
            await this.save();
        }

        this.initialized = true;
    }

    private mergeWithDefaults(loaded: any): SettingsType {
        const merged = { ...defaultSettings };

        for (const category in merged) {
            if (loaded[category]) {
                merged[category as keyof SettingsType] = {
                    ...merged[category as keyof SettingsType],
                    ...loaded[category],
                };
            }
        }

        return merged;
    }

    get<T extends keyof SettingsType>(category: T): SettingsType[T];
    get<T extends keyof SettingsType, K extends keyof SettingsType[T]>(
        category: T,
        key: K
    ): SettingsType[T][K];
    get<T extends keyof SettingsType, K extends keyof SettingsType[T]>(
        category: T,
        key?: K
    ): SettingsType[T] | SettingsType[T][K] {
        if (key !== undefined) {
            return this.settings[category][key];
        }
        return this.settings[category];
    }

    set<T extends keyof SettingsType, K extends keyof SettingsType[T]>(
        category: T,
        key: K,
        value: SettingsType[T][K]
    ): void {
        this.settings[category][key] = value;
        this.debouncedSave();
    }

    setCategory<T extends keyof SettingsType>(
        category: T,
        values: Partial<SettingsType[T]>
    ): void {
        this.settings[category] = {
            ...this.settings[category],
            ...values,
        };
        this.debouncedSave();
    }

    getAll(): SettingsType {
        return { ...this.settings };
    }

    async reset(): Promise<void> {
        this.settings = { ...defaultSettings };
        await this.save();
    }

    private debouncedSave(): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.save();
        }, 500); // Save 500ms after last change
    }

    async save(): Promise<void> {
        try {
            const data = JSON.stringify(this.settings, null, 2);
            await fs.writeFile(this.fileUrl, data);
            console.log('Settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    // For auto-save feature
    async dispose(): Promise<void> {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        await this.save();
    }




    applyGraphicsSettings(settings: GraphicsSettings, PolyForge) {

        const renderer = PolyForge.engine;
        if (!renderer || !PolyForge.pluginData?.postProcessing) return;

        // Resolution scale
        if (settings.resolutionScale) {
            if (settings.resolutionScale > window.devicePixelRatio) toast('pixel ratio higher then device')
            settings.resolutionScale = Math.min(settings.resolutionScale, window.devicePixelRatio)
            renderer.three.renderer.setPixelRatio(settings.resolutionScale);
            if (settings.resolutionScale < 0.6) {
                renderer.three.renderer.domElement.style.imageRendering = "pixelated";
            } else renderer.three.renderer.domElement.style.imageRendering = "auto";

        }

        // Shadows
        const rendererInstance = renderer.getRenderer();
        if (rendererInstance) {
            rendererInstance.shadowMap.enabled = settings.realtimeShadows;
        }

        // Ambient light
        const scene = renderer.getActiveScene();
        const ambientLight = scene.children.find((child: any) => child.isAmbientLight);
        if (ambientLight) {
            (ambientLight as any).color.setStyle(settings.ambientLight);
        }

        // Post-processing
        const pp = PolyForge.pluginData.postProcessing;

        // Bloom
        if (settings.bloom) {
            pp.enable('bloom');
            pp.updateData('bloom', {
                strength: settings.bloomStrength,
                threshold: settings.bloomThreshold,
                radius: settings.bloomRadius,
            });
        } else {
            pp.disable('bloom');
        }

        // FXAA
        settings.fxaa ? pp.enable('fxaa') : pp.disable('fxaa');

        // SSAO
        if (settings.ssao) {
            pp.enable('ssao');
            pp.updateData('ssao', {
                intensity: settings.ssaoIntensity,
                radius: 0.5,
                bias: 0.025,
                samples: 16,
            });
        } else {
            pp.disable('ssao');
        }

        // DOF
        if (settings.dof) {
            pp.enable('dof');
            pp.updateData('dof', {
                focus: settings.dofFocus,
                aperture: 0.025,
                maxblur: 0.01,
            });
        } else {
            pp.disable('dof');
        }

        // Vignette
        if (settings.vignette) {
            pp.enable('vignette');
            pp.updateData('vignette', {
                intensity: settings.vignetteIntensity,
                smoothness: 0.5,
            });
        } else {
            pp.disable('vignette');
        }
    }

    applyPhysicsSettings(settings: PhysicsSettings, PolyForge) {
        const physicsPlugin = PolyForge.pluginData?.physics;
        if (!physicsPlugin) return;

        // Update gravity
        physicsPlugin.world.gravity.y = settings.gravity;
    }

    applySettings(PolyForge){
        this.applyGraphicsSettings(this.settings.graphics, PolyForge)
        this.applyPhysicsSettings(this.settings.physics, PolyForge)
    }
}
