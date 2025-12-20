import * as THREE from 'three';
import {ObjectLoader} from 'three';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';


import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';


import { TransformControls } from 'three/addons/controls/TransformControls.js';
import fs from "vite-plugin-fs/browser";
import { BusHub } from '../PolyForge'
/* ---------------------------
   Rendering / EditorRenderer
   --------------------------- */
type Rendering = {
    renderer: THREE.WebGPURenderer;
    camera: THREE.PerspectiveCamera;
    render: (scene: THREE.Scene) => void;
    config: object;
    controls?: any;
};


class InteractiveViewHelper{
    constructor(private camera, private renderer){
        this.helper = new ViewHelper(camera, renderer.domElement);
        const div = document.createElement( 'div' );
        this.div = div
        div.id = 'viewHelperXYZ';
        div.style.zIndex = '12' //10 in editor
        div.style.position = 'absolute';
        div.style.height = '128px';
        div.style.width = '128px';
        document.body.appendChild( div );
        div.addEventListener( 'pointerup', (event) => {
            this.helper.handleClick( event )
        } );
        
    }
    setControll(controls){
        this.helper.controls = controls;
        this.helper.controls.center = controls.target;
    }
    update(dt=1/50){
        if ( this.helper.animating ) this.helper.update( dt );
        this.helper.render(this.renderer);
    }
    handleResize(){
        const dim = 128;
        const domElement = this.renderer.domElement;
        const rect = domElement.getBoundingClientRect();
		const offsetX = rect.left + ( domElement.offsetWidth - dim );
		const offsetY = rect.top + ( domElement.offsetHeight - dim );
		
		this.div.style.top = offsetY+'px'
		this.div.style.left = offsetX+'px'
    }
}





export class EditorRenderer {
    public three!: Rendering;
    public scene!: THREE.Scene;
    public gizmoHelper?: InteractiveViewHelper;

    private isPlaying = false;
    private rafId: number | null = null;
    private isPerspective = true;

    constructor() {
        //this.init();
    }

    // ----------------------------------------------------------
    // INIT
    // ----------------------------------------------------------
    private async init() {
        this.scene = new THREE.Scene();
        this.three = await this.setupThree();
        this.play(this.scene);
    }

    // ----------------------------------------------------------
    // THREE SETUP
    // ----------------------------------------------------------
    private async setupThree(): Promise<Rendering> {
        const config = { screenScalingFactor: 1 };

        const width = window.innerWidth * config.screenScalingFactor;
        const height = window.innerHeight * config.screenScalingFactor;

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        //await renderer.init()
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        renderer.setClearColor("#2b343a");
        renderer.shadowMap.enabled = true;
        renderer.autoClear = false;
        

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 5000);
        camera.position.set(0, 10, -10);
        camera.lookAt(0, 0, 0);

        const controls = new OrbitControls(camera, renderer.domElement);

        const gizmo = new InteractiveViewHelper(camera, renderer);
        gizmo.setControll(controls);
        this.gizmoHelper = gizmo;

        const render =  (scene: THREE.Scene) => {
            renderer.clear()
            renderer.render(scene, camera);
            gizmo.update();
        };

        return {
            renderer,
            
            camera,
            controls,
            render,
            config,
        };
    }



    // ----------------------------------------------------------
    // PLAY / PAUSE
    // ----------------------------------------------------------
    play(scene: THREE.Scene) {
        this.scene = scene;
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.loop();
    }

    pause() {
        this.isPlaying = false;

        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private loop = () => {
        if (!this.isPlaying || !this.scene) return;

        this.rafId = requestAnimationFrame(this.loop);
        this.three.render(this.scene);
    };

    // ----------------------------------------------------------
    // UTILITIES
    // ----------------------------------------------------------
    getCanvas() {
        return this.three.renderer.domElement;
    }

    setSize(width: number, height: number) {
        this.three.renderer.setSize(width, height);

        this.three.camera.aspect = width / height;
        this.three.camera.updateProjectionMatrix();

        this.gizmoHelper?.handleResize?.();
    }

    toggleCameraType() {
        this.isPerspective = !this.isPerspective;
    }

    // injected by addPasses
    updatePassSize?: (w: number, h: number) => void;
    selectObject?: (obj?: THREE.Object3D) => void;
}







/* ---------------------------
   Three API - scene / helpers
   --------------------------- */
export class ThreeAPI {
    private renderer?: EditorRenderer;
    public scene: THREE.Scene;
    public grid?: THREE.GridHelper;
    public axes?: THREE.AxesHelper;
    public transformControls?: THREE.TransformControls;
    public activeTool: string;
    public activeGizmo: boolean;
    public selectedObject?: THREE.Object3D;
    public raycastingScene?: THREE.Scene
    constructor(private bus: BusHub) {
        this.scene = new THREE.Scene();
        this.activeTool = ''
        this.activeGizmo = false;
        this.raycastingScene = null;
    }

     setRenderer(renderer: EditorRenderer) {
        
        this.bus.sceneUpdate.subscribe((scene)=>{
            this.raycastingScene = scene
        })
        
        
        this.renderer = renderer;
        // set the internal scene reference to the renderer's scene if desired
        // but we keep a dedicated scene owned by ThreeAPI and set to renderer when playing.
        if (this.renderer.scene) {
            // make sure renderer uses this scene
            this.renderer.scene = this.scene;
        }
        
        
        this.loadInitials();
        this.initRaycaster();
    }
    initRaycaster() {
        
        // Raycaster and mouse vector
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Pointer move updates mouse coords
        this.onPointerMove = (event) => {
            const rect = this.renderer.three.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        };

        // Click selects object
        this.onClick = (event) => {
           
            // Intersect with all objects in scene
            const intersects = this.getHitFromMouse(event)?.hits

            if (intersects && intersects?.length > 0) {
                for (let i = 0; i < intersects.length; i++) {
                    if (intersects[i].object?.isMesh && !intersects[i].object.object) {
                        this.selectObject(intersects[i].object, true);
                        break;
                    }
                }
            }
            else{
                this.selectObject(null, true)
            }
        };
    }
    
    
    
    getHitFromMouse(event: MouseEvent) {
  this.onPointerMove(event);

  this.raycaster.setFromCamera(
    this.mouse,
    this.renderer.three.camera
  );

  const hits = this.raycaster.intersectObjects(
    this.raycastingScene?.children || [],
    true
  );

  if (hits.length === 0) return null;

  const hit = hits[0];

  /* -------- Convert normal to WORLD space -------- */
  let normal = new THREE.Vector3();

  if (hit.face) {
    normal.copy(hit.face.normal).applyMatrix3(
      new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)
    ).normalize();
  } else {
    // Fallback (rare, but safe)
    normal.set(0, 1, 0);
  }

  return {
    point: hit.point.clone(),   // world space
    normal,                     // world space
    object: hit.object,
    distance: hit.distance,
    hits
  };
}
    
    // @{internal} selection caster
    // Enable raycasting listeners  internal
    enableRaycasting() {
        this.renderer.three.renderer.domElement.addEventListener('dblclick', this.onClick);
    }

    // Disable raycasting listeners
    disableRaycasting() {
        this.renderer.three.renderer.domElement.removeEventListener('dblclick', this.onClick);
    }
    loadInitials() {
        // Add default helpers
        this.grid = new THREE.GridHelper(10, 10);
        this.axes = new THREE.AxesHelper(10);
        this.transformControls = new TransformControls(this.renderer.three.camera, this.renderer.three.renderer.domElement);

        this.transformControls.addEventListener("dragging-changed", (event) => {
            if (this.renderer.three.controls) this.renderer.three.controls.enabled = !event.value;
        });

        const transformHelper = this.transformControls.getHelper();
        // this.axes.layers.set(2)
        // this.grid.layers.set(2)
        // transformHelper.layers.set(2)
        this.addToScene(this.grid);
        this.addToScene(this.axes);
        this.addToScene(transformHelper)
    }

    addToScene(object3d: THREE.Object3D) {
        this.scene.add(object3d);

        // Make sure renderer's internal scene is kept in sync
        if (this.renderer) {
            this.renderer.scene = this.scene;
        }
    }

    removeFromScene(object3d: THREE.Object3D) {
        this.scene.remove(object3d);
    }

    toggleGrid() {
        if (this.grid) this.grid.visible = !this.grid.visible;
    }

    toggleAxes() {
        if (this.axes) this.axes.visible = !this.axes.visible;
    }

    setTool(tool) {
        this.activeGizmo = tool === 'translate' || tool === 'rotate' || tool === 'scale'
        if (this.activeGizmo) this.transformControls.setMode(tool)
        else this.transformControls.detach()
        this.activeTool = tool
        this.setTransformTarget(this.selectedObject) //connect with gizmo

        if (tool === 'select') {
            this.enableRaycasting();
        } else {
            this.disableRaycasting();
        }
    }
    selectObject(target, notify = false) {
        this.selectedObject = target;
        if (notify) {
            this.bus.selectionUpdate.emit(target)
        }
    }
    setTransformTarget(target) {
        this.selectObject(target, true);
        if ((!target || target?.isScene) || !this.activeGizmo) return this.transformControls.detach()
        //this.selectedObject=target;
        this.transformControls.attach(target)
    }
    toggleCameraViewMode() {
        this.renderer.toggleCameraType()
        //console.log(this.renderer)
    }
    setBackground(color: string | number) {
        if (this.renderer) {
            this.renderer.three.renderer.setClearColor(color);
        } else {
            // fallback: store in scene.userData or apply once renderer exists
            this.scene.userData.background = color;
        }
    }

    // Expose a simple render helper
    renderOnce() {
        if (!this.renderer) return;
        this.renderer.three.render(this.scene);
    }
}



export interface LightSceneNode {
    uuid: string;
    name: string;
    type: string;
    parentUuid?: string;
    children: LightSceneNode[];
    expanded: boolean;
}





export function buildLightScene(root: THREE.Object3D): LightSceneNode {

    const buildNode = (obj: THREE.Object3D, parent?: THREE.Object3D): LightSceneNode => ({
        uuid: obj.uuid,
        name: obj.name || obj.type,
        type: obj.type,
        parentUuid: parent?.uuid,
        children: obj.children.map(child => buildNode(child, obj)),
        expanded: false
    });

    return buildNode(root);
}


/* ---------------------------
   Scene manager 
   --------------------------- */



export interface SceneIndexItem {
    name: string;
    type: string;
    uuid: string;
    path: string;
}

export class SceneManager {
    public activeScene: THREE.Scene;
    public indexingDepth: number;
    public ignoreIndexTypes: Array<new (...args: any[]) => THREE.Object3D>;
    public sceneIndex: SceneIndexItem[];
    public lightScene?: LightSceneNode;

    constructor() {
        this.activeScene = new THREE.Scene();       // Main scene under editor
        this.indexingDepth = 3;                     // optional depth limit
        this.ignoreIndexTypes = [THREE.Bone];       // filter bones from index
        this.sceneIndex = [];                       // flat hierarchy index
        //this.lightScene = buildLightScene(this.activeScene);
    }

    rebuildLightScene() {
        this.lightScene = buildLightScene(this.activeScene);
        return this.lightScene;
    }

    // --------------------------------------------------------
    // Convert scene → JSON
    // --------------------------------------------------------
    public toJson(): THREE.Object3D {
        return this.activeScene.toJSON();
    }

    // --------------------------------------------------------
    // Load scene from JSON
    // --------------------------------------------------------
    public fromJson(json: any): void {
        const loader = new ObjectLoader();
        this.activeScene = loader.parse(json) as THREE.Scene;
        //this.rebuildLightScene()
        //this._buildIndex();
    }

    // --------------------------------------------------------
    // Save to file
    // --------------------------------------------------------
    public async saveScene(filePath: string): Promise<void> {
        // const json = this.toJson();
        //this.rebuildLightScene()
        //this.activeScene.userData.lightScene = this.lightScene;
        await fs.writeFile(filePath, JSON.stringify(this.activeScene, null, 2));
    }

    // --------------------------------------------------------
    // Load from file
    // --------------------------------------------------------
    public async loadScene(filePath: string): Promise<void> {
        const text = await fs.readFile(filePath);
        const json = JSON.parse(text);
        this.fromJson(json);
    }

    // --------------------------------------------------------
    // Build scene index
    // --------------------------------------------------------
    private _buildIndex(): void {
        this.sceneIndex = [];

        const traverse = (obj: THREE.Object3D, path: string[] = [], depth = 0) => {
            if (depth > this.indexingDepth) return;
            if (this.ignoreIndexTypes.some(type => obj instanceof type)) return;

            const newPath = [...path, obj.name || obj.type];

            // push entry
            this.sceneIndex.push({
                name: obj.name,
                type: obj.type,
                uuid: obj.uuid,
                path: newPath.join("¿")
            });

            // children
            obj.children.forEach((child) => traverse(child, newPath, depth + 1));
        };

        traverse(this.activeScene);

        // optional embed index in scene
        // (this.activeScene.userData as any).sceneIndex = this.sceneIndex;
    }

    // --------------------------------------------------------
    // Find by path
    // --------------------------------------------------------
    public findByPath(path: string): THREE.Object3D | null {
        return this.sceneIndex.find(e => e.path === path)?.object || null;
    }

    // --------------------------------------------------------
    // Find by name
    // --------------------------------------------------------
    public findByName(name: string): THREE.Object3D[] {
        return this.sceneIndex
            .filter(e => e.name === name)
            .map(e => e.object);
    }
}



export class TransformControlHistoryHandler {
    private startPosition: THREE.Vector3;
    private startRotation: THREE.Euler;
    private startScale: THREE.Vector3;

    constructor(
        private controls: TransformControls,
        private commanderAPI: any
    ) {
        this.controls.addEventListener("mouseDown", this.onMouseDown.bind(this));
        this.controls.addEventListener("mouseUp", this.onMouseUp.bind(this));
    }

    private onMouseDown() {
        if (!this.controls.object) return;

        const obj = this.controls.object;

        // Save start transform
        this.startPosition = obj.position.clone();
        this.startRotation = obj.rotation.clone();
        this.startScale = obj.scale.clone();
    }

    private onMouseUp() {
        const obj = this.controls.object;
        if (!obj) return;

        // -------------------------
        // Position change
        // -------------------------
        if (!this.startPosition.equals(obj.position)) {
            const val = obj.position.clone()
            obj.position.copy(this.startPosition)
            this.commanderAPI.setPosition(obj, val);
        }

        // -------------------------
        // Rotation change
        // -------------------------
        if (!this.startRotation.equals(obj.rotation)) {
            const val = obj.rotation.clone();
            obj.rotation.copy(this.startRotation)
            this.commanderAPI.setRotation(obj, val, "gimbal");
        }

        // -------------------------
        // Scale change
        // -------------------------
        if (!this.startScale.equals(obj.scale)) {
            const val = obj.scale.clone();
            obj.scale.copy(this.startScale)
            this.commanderAPI.setScale(obj, val);
        }
    }
}