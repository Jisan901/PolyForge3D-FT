import { Instance } from "@/Core/PolyForge";
import { DEFINITION } from '@/Core/DEFINITION';
import { THREE } from '@/Core/lib/THREE';


import { LightGamePad } from "@/Core/Utils/GamePad";

import { Api } from "@/Editor/Api";
import { AssetBrowserManager } from "@/Editor/AssetBrowser"
import { ActionRegistry } from "@/Editor/ActionRegistry";
import { Commander, commands } from "@/Editor/Commander";
import { TransformControlHistoryHandler } from "@/Editor/Three/TransformControlHistoryHandler";
import { toast } from "@/Editor/Mutation";

import { ImportManager } from '@/Editor/Importer';

import { refreshScriptVariables } from "@/Editor/Utils";




type EditorMode = 'edit' | 'play' | 'paused';
class EditorClass {
    public core: typeof Instance = Instance;
    public api: Api;
    public assetBrowser: AssetBrowserManager;
    public commander: Commander;
    
    // animation
    private rafId: number | null = null;
    private mode: EditorMode = 'edit';
    private deltaTime = 0;
    private lastTime = 0;
    
    constructor() {
        this.actionRegistry = new ActionRegistry();
        this.commander = new Commander();
        this.importer = new ImportManager();
        this.gamePad = new LightGamePad();
        this.gamePad.addToGlobal();
        this.gamePad.setVisibility(false);
    }
    /**
    * init
    */
    public async init() {
        
        await this.core.init(false);
        
        this.api = new Api(this.core.engine, this.core.loaders.objectLoader);
        this.assetBrowser = new AssetBrowserManager(
            this.api.file,
            this.api.buses
        );
        new TransformControlHistoryHandler(this.api.three.helpers.transformControls,this)
        await this.assetBrowser.openDirectory(DEFINITION.resourcesFolder, false)
        
        
        
         // --------------------------
        // Eager editor scripts: plugins/systems
        // --------------------------
        const eagerModules = import.meta.glob(['@/Editor/**/*.{plugin,system}.{ts,js}'], {
            eager: true
        });

        for (const path in eagerModules) {
            const mod = eagerModules[path] as { default: new (context: any, ...args: any[]) => any } ;
            this.core.loaders.scriptLoader.eagerScripts[path] = mod.default;
            this.core.loaders.scriptLoader.cache[path] = mod.default;
        }
        
        
        
        
        await this.core.initScripting()
        this.core.settings.applySettings(this.core);
    }
    
    
    
    
    /* ---------------- Command exposing ---------------- */

    // --------------------------
    // Object manipulation
    // --------------------------
    addObject(parent: any, object3d: any) {
        this.commander.execute(new commands.AddObjectCommand(this.api, parent, object3d));
    }

    removeObject(object3d: any) {
        this.commander.execute(new commands.RemoveObjectCommand(this.api, object3d));
    }

    // --------------------------
    // Transform
    // --------------------------
    setRotation(object3d: any, value: THREE.Euler, mode: "gimbal" | "local" | "world" = "gimbal") {
        this.commander.execute(new commands.RotationObjectCommand(object3d, value, mode));
    }

    setPosition(object3d: any, value: THREE.Vector3) {
        this.commander.execute(new commands.TranslateObjectCommand(object3d, value));
    }

    setScale(object3d: any, value: THREE.Vector3) {
        this.commander.execute(new commands.ScaleObjectCommand(object3d, value));
    }

    setProperty(object3d: any, keyPath: string, value: any) {
        this.commander.execute(new commands.SetPropertyCommand(object3d, keyPath, value));
    }

    // --------------------------
    // Undo / Redo
    // --------------------------
    undo() {
        this.commander.undo();
    }

    redo() {
        this.commander.redo();
    }

    clearHistory() {
        this.commander.clear();
    }
    
    /**
     * scene 
     */
    
    async unmountScene(save = true) {
        let api = this.core;
        if (api.sceneManager.activeScene) {
            save && (await api.sceneManager.saveActive())
            api.sceneManager.clear()
        }
    }
    
    async mountScene(url, unmount = true, save = true) {
        let api = this.core;
        unmount && await this.unmountScene(save)
        await api.sceneManager.loadScene(url)
        this.api.three.setScene(api.sceneManager.activeScene);
        this.api.buses.sceneUpdate.emit(api.sceneManager.activeScene);
    }
    
    async newScene(unmount = true, save = true) {
        let core = this.core;
        unmount && await this.unmountScene(save)
        const newScene = new THREE.Scene();
        core.sceneManager.setScene(newScene)
        this.api.three.setScene(core.sceneManager.activeScene);
        this.api.buses.sceneUpdate.emit(core.sceneManager.activeScene);
        return newScene;
    }
    
    
    
    
    
    
    
    
    /**
    * boot
    */
    public boot() {
        this.startRenderer();
    }
    
    // ----------------------------------------------------------
    // RENDERER CONTROL
    // ----------------------------------------------------------
    startRenderer() {
        if (this.rafId !== null) return;
        this.lastTime = performance.now();
        this.loop();
    }

    pauseRenderer() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private loop = () => {
        this.rafId = requestAnimationFrame(this.loop);

        // Calculate delta time
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        // Always api update //#endregion
        this.api.three.update(this.deltaTime);
        // Update game logic if in play mode (not paused)
        if (this.mode === 'play') {
            this.core.update(this.deltaTime);
            this.update();
            return;
        }


        // // minimal update
        this.core.scriptExecutor.invokeLifecycleAll('onEditorUpdate', this.deltaTime);
        this.core.alwaysUpdate(this.deltaTime)
    };

    // ----------------------------------------------------------
    // MODE MANAGEMENT
    // ----------------------------------------------------------
    async enterPlayMode() {
        if (this.mode === 'play') return;

        // await this.refreshRegistry();
        try{
        await this.core.sceneManager.saveActive();
        toast('Saved Editor')
        }
        catch(e){
            console.warn(e)
        }
        this.api.three.selectObject(null);
        this.api.three.helpers.setTool('select');
        
        this.core.scriptExecutor.init()
        
        // try {
        //     this.systemExecutor.init();
        //     await this.behaviorRegistry.runOnStartCall()
        // } catch (err) {
        //     console.log(err)
        // }


        this.mode = 'play';
    }

    pausePlayMode() {
        if (this.mode !== 'play') return;
        this.mode = 'paused';
    }

    resumePlayMode() {
        if (this.mode !== 'paused') return;
        this.mode = 'play';
    }

    async exitPlayMode() {
        if (this.mode === 'edit') return;
        this.mode = 'edit';

        
        this.core.scriptExecutor.destroy(false)// destroy all scripts! don't clear systems
        
        await this.mountScene(this.core.sceneManager.activeUrl, true, false)

    }

    togglePlayMode() {
        if (this.mode === 'edit') {
            this.enterPlayMode();
        } else {
            this.exitPlayMode();
        }
    }

    togglePause() {
        if (this.mode === 'play') {
            this.pausePlayMode();
        } else if (this.mode === 'paused') {
            this.resumePlayMode();
        }
    }

    getMode(): EditorMode {
        return this.mode;
    }

    isPlaying(): boolean {
        return this.mode === 'play';
    }

    isPaused(): boolean {
        return this.mode === 'paused';
    }

    // ----------------------------------------------------------
    // GAME LOGIC UPDATE (called only in play mode)
    // ----------------------------------------------------------
    private update() {
        // this.systemExecutor.update()
        // for (const plugin of this.plugins){
        //     plugin.update?.(this.deltaTime);
        // }
        // Array.from(this.behaviorRegistry.instances.values()).forEach(e => {
        //     e?.onUpdate?.(this.deltaTime)
        // })
    }
    
    /**
    * setSize
    */
    public setSize(w:number, h:number) {
        this.core.engine.setSize(w,h)
        this.api.three.resize(w,h)
        this.gamePad.syncWith(this.core.engine.getCanvas());
    }
    
    /**
    * prepareForPlayMode
    */
    public prepareForPlayMode(value: boolean) {
        console.log('switching' )
        const cam = value ? this.core.sceneManager.activeScene.getObjectByProperty('isCamera', true)||this.core.engine.activeCamera as THREE.Camera: this.api.three.editorCamera;
        Instance.engine.setActiveCamera(cam);
        
        this.api.three.toggleHelpers(!value)
        this.api.three.toggleLights(!value)
        
        this.gamePad.setVisibility(value);
    }
    
    
    private refreshRegistry(){
        refreshScriptVariables();
        this.core.threeRegistry.clear()
        this.core.threeRegistry.register(this.core.sceneManager.activeScene,true)
        this.core.threeRegistry.unregisterTree(this.api.three.editorGroup);
        
    }
    
}


export const Editor = new EditorClass();
window.editor = Editor;