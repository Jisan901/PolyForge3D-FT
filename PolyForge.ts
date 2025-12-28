import { OrbitControls } from 'three/examples/jsm/Addons.js';
import * as THREE from 'three';
import { ObjectLoader } from 'three';

import fs from "@/lib/fs";
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { FileAPI } from "./PolyModule/FilesApi";
import { AssetBrowserManager } from "./PolyModule/AssetBrowser";
import { ComponentManager } from "./PolyModule/ComponentManager";
import { Commander, commands } from "./PolyModule/Commander";
import { ThreeAPI, EditorRenderer, SceneManager, TransformControlHistoryHandler, threeRegistry, ThreeRegistry } from "./PolyModule/ThreeApi";
import { ImportManager } from './PolyModule/Importer'
import { BehaviorRegistry } from './PolyModule/Runtime/Behavior'
import { DLOD } from './PolyModule/DLOD.js'
import { ObjectType } from './types'

interface DirInfo {
    name: string;        // "index.js"
    id: string;
    fullPath: string;    // "./index.js"
    type: string;
    size: string;        // "1.42" (MB)
}

class Bus<T = any> {
    private listeners: Set<((e: T) => void)>
    constructor() {
        this.listeners = new Set();
    }

    subscribe(fn: ((e: T) => void)) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    emit(v: T) {
        for (const fn of this.listeners) fn(v);
    }
}
export const BusHub = {
    fsUpdate: new Bus<void>(),
    sceneUpdate: new Bus<any>(),
    selectionUpdate: new Bus<any>(),
    mutationBus: new Bus<{ target: any, path: string }>(),
    messageBus: new Bus<any>(),
} as const;
export type BusHub = typeof BusHub;




// BusHub.mutationBus.subscribe(({target,path})=>{
//     console.log(target,path)
// })

export type Path = string;

export function mutate<T extends object>(
    obj: T,
    path: Path,
    value: unknown
): void {
    const keys = path.split(".");
    let ref: any = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        ref = ref[keys[i]];
        if (ref == null) return;
    }

    ref[keys[keys.length - 1]] = value;
    BusHub.mutationBus.emit({ target: obj, path });
}
export function mutationCall<T extends object>(
    obj: T,
    path: Path
): void {
    BusHub.mutationBus.emit({ target: obj, path });
}
export function toast(message: string) {
    BusHub.messageBus.emit(message)
}



class MemoLoader {
    private cache = new Map<string, Promise<THREE.Object3D>>();
    private maxSize: number;

    constructor(maxSize = 20) {
        this.maxSize = maxSize;
    }

    async load(assetId: string): Promise<THREE.Object3D> {
        // LRU refresh
        if (this.cache.has(assetId)) {
            const entry = this.cache.get(assetId)!;
            this.cache.delete(assetId);
            this.cache.set(assetId, entry);

            const base = await entry;
            return base.clone(true);
        }

        const promise = this._loadBase(assetId);
        this.cache.set(assetId, promise);

        // Evict if needed
        if (this.cache.size > this.maxSize) {
            this.evictOldest();
        }

        const base = await promise;
        return base.clone(true);
    }

    private async _loadBase(assetId: string): Promise<THREE.Object3D> {
        const data = await fs.readFile(assetId, 'utf8');
        const json = JSON.parse(data);

        const loader = new ObjectLoader();
        const object = loader.parse(json);

        return object
    }

    private evictOldest() {
        const oldestKey = this.cache.keys().next().value;
        const promise = this.cache.get(oldestKey)!;

        promise.then(obj => this.disposeObject(obj));
        this.cache.delete(oldestKey);
    }

    private disposeObject(object: THREE.Object3D) {
        object.traverse((child: any) => {
            if (child.geometry) {
                child.geometry.dispose();
            }

            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((m: any) => m.dispose?.());
                } else {
                    child.material.dispose?.();
                }
            }
        });
    }

    clear() {
        for (const [, promise] of this.cache) {
            promise.then(obj => this.disposeObject(obj));
        }
        this.cache.clear();
    }
}

export const memoLoader = new MemoLoader()

/* ---------------------------
   BridgeLayer facade (composes FileAPI + ThreeAPI)
   --------------------------- */
class BridgeLayer {
    public file: FileAPI;
    public three: ThreeAPI;
    public component: ComponentManager;
    public sceneManager: SceneManager;
    public buses: BusHub;
    private renderer?: EditorRenderer;
    public loader: MemoLoader;

    constructor(
        buses: BusHub,
        fileApi?: FileAPI,
        threeApi?: ThreeAPI,
        componentApi?: ComponentManager,
        sceneManager?: SceneManager
    ) {
        this.buses = buses;
        this.file = fileApi ?? new FileAPI();
        this.three = threeApi ?? new ThreeAPI(this.buses);
        this.component = componentApi ?? new ComponentManager('/components.cti', '/Game/components.ci');
        this.sceneManager = sceneManager ?? new SceneManager();
        this.loader = memoLoader;
    }
    async loadObjectFile(url, clone = true) {
        return await this.loader.load(url);
    }
    async saveObjectFile(object, path) {
        let json = JSON.stringify(object, null, 2);
        let fileUrl = path + '/' + (object.name || object.type) + '.object'
        const data = await fs.writeFile(fileUrl,new Blob([json],{type: 'application/json' }));
        //this.emitFsUpdate()
    }

    setRenderer(renderer: EditorRenderer) {
        this.renderer = renderer;
        this.three.setRenderer(renderer);
        renderer.scene = this.three.scene;
    }

    emitFsUpdate() {
        this.buses.fsUpdate.emit();
    }

    emitSceneUpdate(scene = this.renderer?.scene) {
        this.buses.sceneUpdate.emit(scene);
    }


    getActiveCamera() {
        let activeCamera = null;

        this.sceneManager.activeScene.traverse(obj => {
            if (obj.isCamera && !activeCamera) {
                activeCamera = obj;
            }
        });
        return activeCamera
    }


    // for redo undo tfc change
    addTo(parent, child) {
        parent.add(child)
        this.three.addHelper(child)
        mutationCall(parent)
    }
    removeFrom(parent, child) {
        parent.remove(child);
        this.three.removeHelper(child)
        this.three.setTransformTarget(null);
        mutationCall(parent)
    }

}

/* ---------------------------
   EditorBackend (uses BridgeLayer)
   --------------------------- */
class EditorBackend {
    public api: BridgeLayer;
    public commander: Commander;


    public assetBrowser: AssetBrowserManager;
    public projectInfo: { files: DirInfo[] } | {};

    constructor(api: BridgeLayer, public renderer: EditorRenderer) {
        this.api = api;
        this.commander = new Commander();
        this.api.setRenderer(renderer)

        new TransformControlHistoryHandler(this.api.three.transformControls, this);
        // NEW: asset browser created here
        this.assetBrowser = new AssetBrowserManager(
            this.api.file,
            this.api.buses
        );

        this.projectInfo = {};

    }

    /* ---------------- Project Load ---------------- */

    async openProject() {
        await this.loadProjectFile();
        this.api.buses.fsUpdate.emit();

        await this.api.sceneManager.loadScene('/Game/files/Scenes/Primary.json');
        this.api.three.addToScene(this.api.sceneManager.activeScene);

        this.api.buses.sceneUpdate.emit(this.api.sceneManager.activeScene);
    }

    async loadProjectFile() {
        const project = { gameDir: "/Game/files" };

        try {
            const files = await this.api.file.readDir(project.gameDir);

            this.projectInfo = { files };

            // INITIAL directory activation
            await this.assetBrowser.openDirectory(project.gameDir, false);

        } catch {
            this.projectInfo = { files: [] };
            this.assetBrowser.reset();
        }
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
}





/* ---------------------------
   ECS bridge
   --------------------------- */





export class MeshBuilder {
    constructor() { }

    create(type) {
        switch (type) {
            case ObjectType.CUBE: return threeRegistry.register(this.cube());
            case ObjectType.SPHERE: return threeRegistry.register(this.sphere());
            case ObjectType.CYLINDER: return threeRegistry.register(this.cylinder());
            case ObjectType.PLANE: return threeRegistry.register(this.plane());
            case ObjectType.CAPSULE: return threeRegistry.register(this.capsule());
            case ObjectType.LIGHT: return threeRegistry.register(this.light());
            case ObjectType.CAMERA: return threeRegistry.register(this.camera());
            case ObjectType.FOLDER: return threeRegistry.register(this.folder());

            default:
                console.warn("MeshBuilder: unknown type", type);
                return null;
        }
    }

    cube() {
        return new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
        );
    }

    sphere() {
        return new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 32, 32),
            new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
        );
    }

    cylinder() {
        return new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
            new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
        );
    }

    plane() {
        return new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshStandardMaterial({
                color: 0xaaaaaa,
                side: THREE.DoubleSide
            })
        );
    }

    capsule() {
        return new THREE.Mesh(
            new THREE.CapsuleGeometry(0.4, 1, 4, 8),
            new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
        );
    }

    light() {
        const l = new THREE.DirectionalLight(0xffffff, 2, 200);
        return l;
    }

    camera() {
        const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        cam.position.set(0, 1, 3);
        return cam;
    }

    folder() {
        return new THREE.Group();
    }
}



/* ---------------------------
   PolyForge root
   --------------------------- */
type EditorMode = 'edit' | 'play' | 'paused';

class PolyForge3D {
    public buses: BusHub;
    public editor: EditorBackend;
    public api: BridgeLayer; // facade containing file + three apis
    public importer: ImportManager;
    public meshBuilder: MeshBuilder;
    public threeRegistry: ThreeRegistry;
    public behaviorRegistry: BehaviorRegistry;
    private editorRenderer!: EditorRenderer;
    private rafId: number | null = null;
    private mode: EditorMode = 'edit';
    private deltaTime = 0;
    private lastTime = 0;

    constructor() {
    }

    async init() {
        // inject FileAPI + ThreeAPI so they can be swapped in tests or extended later
        this.buses = BusHub;
        this.editorRenderer = new EditorRenderer();
        await this.editorRenderer.init();

        this.api = new BridgeLayer(
            this.buses,
            new FileAPI(),
            new ThreeAPI(this.buses),
            new ComponentManager('/components.cti', '/Game/components.ci'),
            new SceneManager()
        );

        await this.api.component.loadTemplates();
        this.threeRegistry = threeRegistry;
        this.behaviorRegistry = new BehaviorRegistry();
        this.importer = new ImportManager();
        this.meshBuilder = new MeshBuilder();
        this.editor = new EditorBackend(this.api, this.editorRenderer);
        await this.editor.openProject();
        this.listenScriptAdd();

        // Start the render loop
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

        // Update game logic if in play mode (not paused)
        if (this.mode === 'play') {
            this.update();
        }

        // Always render
        this.editorRenderer.update();
    };

    // ----------------------------------------------------------
    // MODE MANAGEMENT
    // ----------------------------------------------------------
    async enterPlayMode() {
        if (this.mode === 'play') return;

        await this.api.sceneManager.saveScene('/Game/files/Scenes/Primary.json');
        toast('Saved Editor')

        try {
            await this.refreshRegistry()
            await this.behaviorRegistry.runOnStartCall()
        } catch (err) {
            console.log(err)
        }


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
        
        await this.behaviorRegistry.runOnDestroyCall()
        
        this.api.sceneManager.activeScene.removeFromParent()
        this.api.sceneManager.activeScene.clear()

        await this.api.sceneManager.loadScene('/Game/files/Scenes/Primary.json');
        this.api.three.addToScene(this.api.sceneManager.activeScene);

        this.api.buses.sceneUpdate.emit(this.api.sceneManager.activeScene);
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
        Array.from(this.behaviorRegistry.instances.values()).forEach(e => {
            e?.onUpdate?.(this.deltaTime)
        })
    }

    // ----------------------------------------------------------
    // ORIGINAL METHODS
    // ----------------------------------------------------------
    listenScriptAdd() {
        const scope = this;
        this.buses.mutationBus.subscribe(({ target, path }) => {
            if (path === ('userData.components.7')) { // 7 is script 
                try {
                    scope.refreshRegistry()
                } catch (err) {
                    console.log(err)
                }
            }
        });
    }

    async prepareRegistry() {
        const scope = this;
        this.behaviorRegistry.instances.clear();
        threeRegistry.register(this.api.sceneManager.activeScene, true);

        const specialObjects = Array.from(threeRegistry.specialObjects.values());

        // Process all objects in parallel
        await Promise.all(
            specialObjects.map(async (e) => {
                const script = e.userData?.components?.['7'];
                if (!script) return;

                const path = script.data.path.value;
                if (!path) return;

                await scope.behaviorRegistry.instantiate(
                    path,
                    `${path}_${e.uuid}`,
                    {
                        scene: scope.api.sceneManager.activeScene,
                        object: e,
                        getActiveCamera:()=>scope.editorRenderer.getActiveCamera(),
                        loader: memoLoader
                    },
                    script.data.variables
                );
            })
        );
    }

    async refreshRegistry() {
        const scope = this;
        this.behaviorRegistry.behaviors.clear();
        threeRegistry.register(this.api.sceneManager.activeScene, true);

        const specialObjects = Array.from(threeRegistry.specialObjects.values());

        // Process all objects in parallel
        await Promise.all(
            specialObjects.map(async (e) => {
                const script = e.userData?.components?.['7'];
                if (!script) return;

                const path = script.data.path.value;
                if (!path) return;

                const scriptClass = await scope.behaviorRegistry.register(path, path, '{}');
                if (!scriptClass.cls.propMap) return;

                const tempInstance = new scriptClass.cls({});
                const newVars = {};

                Object.keys(scriptClass.cls.propMap).forEach((key) => {
                    if (!script.data.variables[key]) {
                        if (scriptClass.cls.propMap[key].type === 'value') {
                            newVars[key] = tempInstance[key];
                        }
                        if (scriptClass.cls.propMap[key].type === 'ref') {
                            newVars[key] = { isRef: true, ref: tempInstance[key] };
                        }
                    }
                });

                script.data.variables = { ...script.data.variables, ...newVars };
                mutationCall(e as object, 'userData.components.7.data.variables');
            })
        );
        await scope.prepareRegistry()
    }


    async syncLoads() {
        try {
            await this.refreshRegistry()
        } catch (err) {
            console.log(err)
        }
        this.buses.sceneUpdate.emit(this.api.sceneManager.activeScene);
        this.buses.fsUpdate.emit();
    }

    // ----------------------------------------------------------
    // UTILITIES
    // ----------------------------------------------------------
    getRenderer(): EditorRenderer {
        return this.editorRenderer;
    }

    getDeltaTime(): number {
        return this.deltaTime;
    }
}



/* singleton instance exported */
export const PolyForge = new PolyForge3D();
window.plfg = PolyForge;
/* optional default export */
// export default PolyForge;

// global script asset adding removing will reload registry