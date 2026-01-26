import { Instance } from "@/Core/PolyForge";
import { DEFINITION } from '@/Core/DEFINITION';
import { Api } from "@/Editor/Api";
import { AssetBrowserManager } from "@/Editor/AssetBrowser"
import { Commander, commands } from "@/Editor/Commander";
import { THREE } from '@/Core/lib/THREE';
import { toast } from "@/Editor/Mutation";


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
        this.commander = new Commander();
    }
    /**
    * init
    */
    public async init() {
        await this.core.init();
        this.api = new Api(this.core.engine, this.core.loaders.objectLoader);
        this.assetBrowser = new AssetBrowserManager(
            this.api.file,
            this.api.buses
        );
        await this.assetBrowser.openDirectory(DEFINITION.resourcesFolder, false)
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
        this.api.three.update();
        // Update game logic if in play mode (not paused)
        if (this.mode === 'play') {
            this.core.update(this.deltaTime);
            this.update();
            return;
        }


        // // minimal update
        this.core.time.update(this.deltaTime);
        this.core.engine.update(this.deltaTime);
    };

    // ----------------------------------------------------------
    // MODE MANAGEMENT
    // ----------------------------------------------------------
    async enterPlayMode() {
        if (this.mode === 'play') return;

        // await this.refreshRegistry();

        // await this.api.sceneManager.saveActive();
        toast('Saved Editor')

        this.api.three.selectObject(null);
        this.api.three.helpers.setTool('select');

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

        // await this.behaviorRegistry.runOnDestroyCall()
        // this.systemExecutor.destroy()
        // await this.editor.mountScene(this.api.sceneManager.activeUrl, true, false)

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
    }
}


export const Editor = new EditorClass();
window.editor = Editor;