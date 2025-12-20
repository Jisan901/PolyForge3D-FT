import { OrbitControls } from 'three/examples/jsm/Addons.js';
import * as THREE from 'three';

import {ObjectLoader} from 'three';

import fs from "vite-plugin-fs/browser";
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { FileAPI } from "./PolyModule/FilesApi";
import { AssetBrowserManager } from "./PolyModule/AssetBrowser";
import { ComponentManager } from "./PolyModule/ComponentManager";
import { Commander, commands } from "./PolyModule/Commander";
import { ThreeAPI, EditorRenderer, SceneManager, TransformControlHistoryHandler } from "./PolyModule/ThreeApi";
import {ImportManager} from './PolyModule/Importer'
import {DLOD} from './PolyModule/DLOD.js'
import {ObjectType} from './types'

interface DirInfo {
    name: string;        // "index.js"
    id: string;
    fullPath: string;    // "./index.js"
    type: string;
    size: string;        // "1.42" (MB)
}

class Bus<T = any> {
    private listeners:Set<((e:T)=>void)>
  constructor() {
    this.listeners = new Set();
  }

  subscribe(fn:((e:T)=>void)) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(v:T) {
    for (const fn of this.listeners) fn(v);
  }
}
export const BusHub = {
    fsUpdate: new Bus<void>(),
    sceneUpdate: new Bus<any>(),
    selectionUpdate: new Bus<any>(),
    mutationBus: new Bus<{target:any, path:string}>(),
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
    BusHub.mutationBus.emit({target:obj,path});
}
export function mutationCall<T extends object>(
    obj: T,
    path: Path
): void {
    BusHub.mutationBus.emit({target:obj,path});
}
export function toast(message:string){
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
    public buses:  BusHub;
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
    async loadObjectFile(url, clone=true){
        return await this.loader.load(url);
    }
    async saveObjectFile(object,path){
        let json = JSON.stringify(object,null, 2);
        let fileUrl = path+'/'+(object.name||object.type)+'.object'
        const data = await fs.writeFile(fileUrl, json);
        this.emitFsUpdate()
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
    
    
    
    // for redo undo tfc change
    addTo(parent, child){
        parent.add(child)
        mutationCall(parent)
    }
    removeFrom(parent, child){
        parent.remove(child);
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

        this.openProject();
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
        this.commander.execute(new commands.AddObjectCommand(this.api,parent, object3d));
    }

    removeObject(object3d: any) {
        this.commander.execute(new commands.RemoveObjectCommand(this.api,object3d));
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





export class BusV1<T = any> {
    private listeners: ((v: T) => void)[]; // dense packed (no nulls)
    private free: number[]; // stack of freed indices

    constructor(capacity = 8) {
        this.listeners = new Array(capacity);
        this.free = [];
    }

    subscribe(fn: (v: T) => void): number {
        // Reuse a free slot if available
        const freeIndex = this.free.pop();
        if (freeIndex !== undefined) {
            this.listeners[freeIndex] = fn;
            return freeIndex;
        }

        // Add to dense end
        const idx = this.listeners.length;
        this.listeners.push(fn);
        return idx;
    }

    unsubscribe(id: number) {
        this.listeners[id] = undefined as any; // cheaper than null
        this.free.push(id);
    }

    emit(data: T) {
        const arr = this.listeners;
        for (let i = 0, l = arr.length; i < l; i++) {
            const fn = arr[i];
            if (fn !== undefined) fn(data);
        }
    }
}



/* ---------------------------
   ECS bridge
   --------------------------- */





export class MeshBuilder {
    constructor() { }

    create(type) {
        switch (type) {
            case ObjectType.CUBE: return this.cube();
            case ObjectType.SPHERE: return this.sphere();
            case ObjectType.CYLINDER: return this.cylinder();
            case ObjectType.PLANE: return this.plane();
            case ObjectType.CAPSULE: return this.capsule();
            case ObjectType.LIGHT: return this.light();
            case ObjectType.CAMERA: return this.camera();
            case ObjectType.FOLDER: return this.folder();
            case ObjectType.LOD: return this.lod();
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
        const l = new THREE.PointLight(0xffffff, 2, 200);
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
    
    lod() {
        return new THREE.LOD();
    }
}



/* ---------------------------
   PolyForge root
   --------------------------- */
class PolyForge3D {
    public buses: BusHub;
    public editor: EditorBackend;
    public api: BridgeLayer; // facade containing file + three apis
    public importer:ImportManager;
    public meshBuilder: MeshBuilder;
    constructor() {
        
    }

     async init() {
        // inject FileAPI + ThreeAPI so they can be swapped in tests or extended later
        this.buses =  BusHub;
        const editorRenderer = new EditorRenderer()
        await editorRenderer.init()
        this.api = new BridgeLayer(
            this.buses,
            new FileAPI(),
            new ThreeAPI(this.buses),
            new ComponentManager('/components.cti', '/Game/components.ci'),
            new SceneManager()
        );
        this.importer = new ImportManager();
        this.meshBuilder = new MeshBuilder()

        this.editor = new EditorBackend(this.api, editorRenderer);
        
    }
    syncLoads(){
        this.buses.sceneUpdate.emit(this.api.sceneManager.activeScene)
        this.buses.fsUpdate.emit()
    }
}

/* singleton instance exported */
export const PolyForge = new PolyForge3D();

/* optional default export */
// export default PolyForge;