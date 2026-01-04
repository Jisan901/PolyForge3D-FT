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

import { Plugin } from "./PolyModule/Plugin";
import { plugins } from "./PolyModule/Plugins";
import { SystemExecutor } from "./PolyModule/Runtime/Systems/System"
import { Systems } from "./PolyModule/Runtime/Systems"


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

    async load(assetId: string, clone = true): Promise<THREE.Object3D> {
        // LRU refresh
        if (this.cache.has(assetId)) {
            const entry = this.cache.get(assetId)!;
            this.cache.delete(assetId);
            this.cache.set(assetId, entry);

            const base = await entry;
            return clone ? base.clone(true) : base;
        }

        const promise = this._loadBase(assetId);
        this.cache.set(assetId, promise);

        // Evict if needed
        if (this.cache.size > this.maxSize) {
            this.evictOldest();
        }

        const base = await promise;
        return clone ? base.clone(true) : base;
    }

    private async _loadBase(assetId: string): Promise<THREE.Object3D> {
        const data = await fs.readFile(assetId, 'utf8');
        const json = JSON.parse(data);

        const loader = new ObjectLoader();
        const object = loader.parse(json);

        object.userData.templateFile = assetId; // templates 

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
        const data = await fs.writeFile(fileUrl, new Blob([json], { type: 'application/json' }));
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
    async unmountScene(save = true) {
        let api = this.api;
        if (api.sceneManager.activeScene) {
            save && (await api.sceneManager.saveActive())
            api.sceneManager.activeScene.removeFromParent()
            api.sceneManager.activeScene.clear()
        }
    }
    async mountScene(url, unmount = true, save = true) {
        let api = this.api;
        unmount && await this.unmountScene(save)
        await api.sceneManager.loadScene(url)
        api.three.addToScene(api.sceneManager.activeScene);
        api.buses.sceneUpdate.emit(api.sceneManager.activeScene);
    }
    async newScene(unmount = true, save = true) {
        let api = this.api;
        unmount && await this.unmountScene(save)
        const newScene = new THREE.Scene();
        api.sceneManager.setScene(newScene)
        api.three.addToScene(api.sceneManager.activeScene);
        api.buses.sceneUpdate.emit(api.sceneManager.activeScene);
        return newScene;
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

  create(type: ObjectType): THREE.Object3D | null {
    switch (type) {
      // Basic Geometries
      case ObjectType.CUBE: return threeRegistry.register(this.cube());
      case ObjectType.SPHERE: return threeRegistry.register(this.sphere());
      case ObjectType.CYLINDER: return threeRegistry.register(this.cylinder());
      case ObjectType.PLANE: return threeRegistry.register(this.plane());
      case ObjectType.CAPSULE: return threeRegistry.register(this.capsule());
      
      // Additional Geometries
      case ObjectType.CONE: return threeRegistry.register(this.cone());
      case ObjectType.TORUS: return threeRegistry.register(this.torus());
      case ObjectType.TORUS_KNOT: return threeRegistry.register(this.torusKnot());
      case ObjectType.DODECAHEDRON: return threeRegistry.register(this.dodecahedron());
      case ObjectType.ICOSAHEDRON: return threeRegistry.register(this.icosahedron());
      case ObjectType.OCTAHEDRON: return threeRegistry.register(this.octahedron());
      case ObjectType.TETRAHEDRON: return threeRegistry.register(this.tetrahedron());
      case ObjectType.RING: return threeRegistry.register(this.ring());
      case ObjectType.CIRCLE: return threeRegistry.register(this.circle());
      
      // Advanced Geometries
      case ObjectType.LATHE: return threeRegistry.register(this.lathe());
      case ObjectType.TUBE: return threeRegistry.register(this.tube());
      
      // Lights
      case ObjectType.POINTLIGHT: return threeRegistry.register(this.pointLight());
      case ObjectType.DIRECTIONAL_LIGHT: return threeRegistry.register(this.directionalLight());
      case ObjectType.SPOT_LIGHT: return threeRegistry.register(this.spotLight());
      case ObjectType.AMBIENT_LIGHT: return threeRegistry.register(this.ambientLight());
      case ObjectType.HEMISPHERE_LIGHT: return threeRegistry.register(this.hemisphereLight());
      case ObjectType.RECT_AREA_LIGHT: return threeRegistry.register(this.rectAreaLight());
      
      // Cameras
      case ObjectType.CAMERA: return threeRegistry.register(this.camera());
      case ObjectType.ORTHOGRAPHIC_CAMERA: return threeRegistry.register(this.orthographicCamera());
      
      // Helpers
      case ObjectType.GRID_HELPER: return threeRegistry.register(this.gridHelper());
      case ObjectType.AXES_HELPER: return threeRegistry.register(this.axesHelper());
      case ObjectType.ARROW_HELPER: return threeRegistry.register(this.arrowHelper());
      
      // Special Objects
      case ObjectType.SPRITE: return threeRegistry.register(this.sprite());
      case ObjectType.LINE: return threeRegistry.register(this.line());
      case ObjectType.LINE_SEGMENTS: return threeRegistry.register(this.lineSegments());
      case ObjectType.POINTS: return threeRegistry.register(this.points());
      
      // Organization
      case ObjectType.FOLDER: return threeRegistry.register(this.folder());
      
      default:
        console.warn("MeshBuilder: unknown type", type);
        return null;
    }
  }

  // Basic Geometries
  cube(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
  }

  sphere(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
  }

  cylinder(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
  }

  plane(): THREE.Mesh {
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

  // Additional Geometries
  cone(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1, 32),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
  }

  torus(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.2, 16, 100),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
  }

  torusKnot(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.4, 0.15, 100, 16),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
  }

  dodecahedron(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.5),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
  }

  icosahedron(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.5),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
  }

  octahedron(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
  }

  tetrahedron(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.5),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
  }

  ring(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.5, 32),
      new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        side: THREE.DoubleSide
      })
    );
  }

  circle(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 32),
      new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        side: THREE.DoubleSide
      })
    );
  }

  // Advanced Geometries
  lathe(): THREE.Mesh {
    const points = [];
    for (let i = 0; i < 10; i++) {
      points.push(new THREE.Vector2(Math.sin(i * 0.2) * 0.3 + 0.3, (i - 5) * 0.1));
    }
    return new THREE.Mesh(
      new THREE.LatheGeometry(points, 32),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
  }

  tube(): THREE.Mesh {
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(-0.25, 0.5, 0),
      new THREE.Vector3(0.25, -0.5, 0),
      new THREE.Vector3(0.5, 0, 0)
    ]);
    return new THREE.Mesh(
      new THREE.TubeGeometry(path, 64, 0.1, 8, false),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
  }

  // Lights
  pointLight(): THREE.PointLight {
    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(0, 2, 0);
    return light;
  }

  directionalLight(): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.add(light.target)
    light.target.position.set(0, -5, 0)
    light.position.set(5, 5, 5);
    return light;
  }

  spotLight(): THREE.SpotLight {
    const light = new THREE.SpotLight(0xffffff, 1, 100, Math.PI / 6);
    light.add(light.target)
    light.target.position.set(0, -5, 0)
    light.position.set(0, 5, 0);
    return light;
  }

  ambientLight(): THREE.AmbientLight {
    return new THREE.AmbientLight(0xffffff, 0.5);
  }

  hemisphereLight(): THREE.HemisphereLight {
    return new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
  }

  rectAreaLight(): THREE.RectAreaLight {
    const light = new THREE.RectAreaLight(0xffffff, 5, 2, 2);
    light.position.set(0, 2, 0);
    return light;
  }

  // Cameras
  camera(): THREE.PerspectiveCamera {
    const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    cam.position.set(0, 1, 3);
    return cam;
  }

  orthographicCamera(): THREE.OrthographicCamera {
    const cam = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
    cam.position.set(0, 1, 3);
    return cam;
  }

  // Helpers
  gridHelper(): THREE.GridHelper {
    return new THREE.GridHelper(10, 10);
  }

  axesHelper(): THREE.AxesHelper {
    return new THREE.AxesHelper(1);
  }

  arrowHelper(): THREE.ArrowHelper {
    return new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      1,
      0xff0000
    );
  }

  // Special Objects
  sprite(): THREE.Sprite {
    const map = new THREE.CanvasTexture(this.generateSpriteTexture());
    const material = new THREE.SpriteMaterial({ map });
    return new THREE.Sprite(material);
  }

  line(): THREE.Line {
    const points = [
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0.5, 0, 0)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xaaaaaa });
    return new THREE.Line(geometry, material);
  }

  lineSegments(): THREE.LineSegments {
    const points = [
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0.5, 0, 0)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xaaaaaa });
    return new THREE.LineSegments(geometry, material);
  }

  points(): THREE.Points {
    const vertices = [];
    for (let i = 0; i < 100; i++) {
      vertices.push(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.05 });
    return new THREE.Points(geometry, material);
  }

  // Organization
  folder(): THREE.Group {
    return new THREE.Group();
  }

  // Helper method for sprite texture
  private generateSpriteTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#aaaaaa';
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
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
    // plugins 
    private plugins: Plugin[] = [];
    private systemExecutor: SystemExecutor; 


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
        await this.preloadPlugins();
        this.listenScriptAdd();

        // Start the render loop
        this.startRenderer();
        this.systemExecutor = new SystemExecutor();
        this.systemExecutor.systems = Systems.map(S=>new S(this));
    }
    async preloadPlugins() {
        this.plugins = plugins.map(P => new P(this));
        this.pluginData = {};

        await Promise.all(
            this.plugins.map(async (plugin) => {
                await plugin.init?.();

                this.pluginData = {
                    ...this.pluginData,
                    ...(plugin.provided ?? {})
                };
            })
        );
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

        await this.refreshRegistry();

        await this.api.sceneManager.saveActive();
        toast('Saved Editor')

        this.api.three.transformControls.detach()
        this.api.three.setTool('select');

        try {
            this.systemExecutor.init();
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
        this.systemExecutor.destroy()
        await this.editor.mountScene(this.api.sceneManager.activeUrl, true, false)

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
        this.systemExecutor.update()
        for (const plugin of this.plugins){
            plugin.update?.(this.deltaTime);
        }
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
        this.buses.sceneUpdate.subscribe(async () => {
            try {
                memoLoader.clear()
                await this.refreshRegistry()
            } catch (err) {
                console.log(err)
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
                        getActiveCamera: () => scope.editorRenderer.getActiveCamera(),
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
        threeRegistry.specialObjects.clear()
        threeRegistry.objects.clear()
        threeRegistry.geometries.clear()
        threeRegistry.materials.clear()
        threeRegistry.register(this.api.sceneManager.activeScene, true);

        const templeteObjects = Array.from(threeRegistry.objects.values())

        await Promise.all(
            templeteObjects.map(async (Tobject) => {
                if (Tobject.userData.templateFile) {
                    Tobject.userData.components = structuredClone((await memoLoader.load(Tobject.userData.templateFile, false)).userData.components)
                    Tobject.userData.special = Tobject.userData.components ? true : false;
                }
            })
        )

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