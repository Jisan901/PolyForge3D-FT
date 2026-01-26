import * as THREEGL from 'three';
import { ObjectLoader } from 'three';
import {pass,renderOutput, vec4} from 'three/tsl'
import fs from "@/lib/fs";
import { BusHub, mutationCall } from '../PolyForge'
/* ---------------------------
   Rendering / EditorRenderer
   --------------------------- */
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { TransformControls } from 'three/examples/jsm/Addons.js';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';


/* ---------------------------
   Types
   --------------------------- */
type RenderingConfig = {
    screenScalingFactor: number;
};

type Rendering = {
    renderer: THREE.WebGPURenderer;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    render: (scene: THREE.Scene) => void;
    config: RenderingConfig;
    postProcessing?: THREE.PostProcessing;
    scenePass: any
};

type EngineType = 'webgpu' | 'webgl';

type PostProcessPass = {
    active: boolean;
    order: number;
    data?: any;
    callback: (
        previousPass: any,
        renderer: THREE.WebGPURenderer,
        scene: THREE.Scene,
        camera: THREE.Camera,
        data?: any,
        pass?:PostProcessPass
    ) => any;
    update?: (
        currentPass: any,
        renderer: THREE.WebGPURenderer,
        scene: THREE.Scene,
        camera: THREE.Camera,
        data?: any
    ) => any;
    node?:any;
};

type PostProcessingRegistry = {
    [key: string]: PostProcessPass;
};

/* ---------------------------
   EditorRenderer
   --------------------------- */
export class EditorRenderer {
    public three!: Rendering;
    public scene!: THREE.Scene;
    public gizmoHelper?: InteractiveViewHelper;
    
    private isPerspective = true;
    private previewCamera: THREE.Camera | null = null;
    private editorCamera!: THREE.Camera;
    private isPreviewMode = false;
    private engineType: EngineType;
    private postProcessingRegistry: PostProcessingRegistry = {
        
    };
    private postProcessingOrder: string[] = ['defaultPass'];

    // Optional injected methods (set by external systems)
    public updatePassSize?: (width: number, height: number) => void;
    public selectObject?: (obj?: THREE.Object3D) => void;

    constructor(engineType: EngineType = 'webgl') {
        this.engineType = engineType;
        this.initializeDefaultPasses();
        // Note: init() should be called externally after construction
    }

    // ----------------------------------------------------------
    // INITIALIZATION
    // ----------------------------------------------------------
    private initializeDefaultPasses(): void {
        // Register default pass
        this.postProcessingRegistry['defaultPass'] = {
            active: true,
            order: 0,
            data: {},
            callback: (previousPass, renderer, scene, camera, data) => {
                // Default pass just returns the scene render
                
                return this.three.scenePass || pass(scene, camera);
            }
        };
    }
    public async init(): Promise<void> {
        this.scene = new THREE.Scene();
        this.three = await this.setupThree();
        this.editorCamera = this.three.camera;
    }
    
    // ----------------------------------------------------------
    // THREE.JS SETUP
    // ----------------------------------------------------------
    private async setupThree(): Promise<Rendering> {
        const config: RenderingConfig = { screenScalingFactor: 1 };
        const width = window.innerWidth * config.screenScalingFactor;
        const height = window.innerHeight * config.screenScalingFactor;
        
        // Initialize renderer
        const renderer = new THREE.WebGPURenderer({
            antialias: true,
            alpha: true,
            forceWebGL: this.engineType === 'webgl'
        });
        
        await renderer.init();
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        renderer.setClearColor('#2b343a');
        renderer.shadowMap.enabled = true;

        // Setup post-processing
        const postProcessing = new THREE.PostProcessing(renderer);

        // Setup camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 5000);
        camera.position.set(0, 10, -10);
        camera.lookAt(0, 0, 0);

        // Setup controls
        const controls = new OrbitControls(camera, renderer.domElement);
        
        // Setup gizmo helper
        const gizmo = new InteractiveViewHelper(camera, renderer);
        gizmo.setControll(controls);
        this.gizmoHelper = gizmo;

        // Helper function to set output node
        const scenePass = pass(this.scene, camera);
        postProcessing.outputNode = renderOutput(scenePass)
        // Render function
        const render = (scene: THREE.Scene) => {
            renderer.render(scene, camera);
            gizmo.update();
        };

        return {
            renderer,
            camera,
            controls,
            render,
            config,
            postProcessing,
            scenePass,
        };
    }

    // ----------------------------------------------------------
    // UPDATE & RENDERING
    // ----------------------------------------------------------
    public update(): void {
        if (!this.scene) return;

        const activeCamera = this.getActiveCamera();
        if (this.three.postProcessing && this.three.scenePass) {
            if (this.three.scenePass?.camera.uuid !== activeCamera.uuid) this.three.scenePass.camera = activeCamera;
            this.three.postProcessing.render();
            //this.applyPostProcessing()
        }
        else {
            this.three.renderer.render(this.scene, activeCamera);
        }


        // Only update gizmo in editor mode
        if (!this.isPreviewMode) {
            this.gizmoHelper?.update();
        }
    }

    // ----------------------------------------------------------
    // POST-PROCESSING MANAGEMENT
    // ----------------------------------------------------------
    
    /**
     * Register a new post-processing pass
     */
    public registerPostProcess(
        name: string,
        callback: PostProcessPass['callback'],
        active: boolean = false,
        order: number = 0,
        data?: any,
        update?: PostProcessPass['update']
    ): void {
        this.postProcessingRegistry[name] = {
            active,
            order,
            data,
            callback,
            update
        };
    }

    /**
     * Enable a specific post-processing effect
     */
    public enablePostProcess(name: string): void {
        const pass = this.postProcessingRegistry[name];
        
        if (pass) {
            if (pass.active) return;
            pass.active = true;
            this.applyPostProcessing()
        } else {
            console.warn(`Post-process "${name}" not found in registry`);
        }
    }

    /**
     * Disable a specific post-processing effect
     */
    public disablePostProcess(name: string): void {
        const pass = this.postProcessingRegistry[name];
        if (pass) {
            if (!pass.active) return;
            pass.active = false;
            this.applyPostProcessing()
        } else {
            console.warn(`Post-process "${name}" not found in registry`);
        }
    }

    /**
     * Set the order of post-processing passes
     */
    public setPostProcessingOrder(order: string[]): void {
        // Validate that all passes exist
        const invalidPasses = order.filter(name => !this.postProcessingRegistry[name]);
        if (invalidPasses.length > 0) {
            console.warn(`Invalid post-process names: ${invalidPasses.join(', ')}`);
        }

        this.postProcessingOrder = order;

        // Update order property in registry
        order.forEach((name, index) => {
            if (this.postProcessingRegistry[name]) {
                this.postProcessingRegistry[name].order = index;
            }
        });
        this.applyPostProcessing()
    }

    /**
     * Get the current post-processing order
     */
    public getPostProcessingOrder(): string[] {
        return [...this.postProcessingOrder];
    }

    /**
     * Get the post-processing registry
     */
    public getPostProcessingRegistry(): PostProcessingRegistry {
        return { ...this.postProcessingRegistry };
    }

    /**
     * Toggle a post-processing effect on/off
     */
    public togglePostProcess(name: string): boolean {
        const pass = this.postProcessingRegistry[name];
        if (pass) {
            pass.active = !pass.active;
            this.applyPostProcessing()
            return pass.active;
        }
        console.warn(`Post-process "${name}" not found in registry`);
        return false;
    }

    /**
     * Check if a post-processing effect is active
     */
    public isPostProcessActive(name: string): boolean {
        return this.postProcessingRegistry[name]?.active ?? false;
    }

    /**
     * Update the data for a specific post-processing pass
     */
    public updatePostProcessData(name: string, data: any): void {
        const pass = this.postProcessingRegistry[name];
        if (pass) {
            const camera: THREE.Camera = this.getActiveCamera()
            pass.data = data;
            pass.update?.(
                pass.node,
                this.three.renderer,
                this.scene,
                camera,
                pass.data
                )
        } else {
            console.warn(`Post-process "${name}" not found in registry`);
        }
    }

    /**
     * Get the data for a specific post-processing pass
     */
    public getPostProcessData(name: string): any {
        return this.postProcessingRegistry[name]?.data;
    }

    /**
     * Apply the post-processing pipeline
     */
    private applyPostProcessing(): void {
        const camera: THREE.Camera = this.getActiveCamera()
        if (!this.three.postProcessing) {
            // Fallback to direct rendering if no post-processing
            this.three.postProcessing = new THREE.PostProcessing()
            
        }

        // Get active passes in order
        const activePasses = this.postProcessingOrder
            .filter(name => this.postProcessingRegistry[name]?.active)
            .map(name => ({
                name,
                pass: this.postProcessingRegistry[name]
            }))
            .sort((a, b) => a.pass.order - b.pass.order);
            
            
        let currentNode: any = null;
        
        if (activePasses.length === 0) {
            // No active passes, just render red
            this.three.postProcessing.outputNode = vec4(1,0,0,1);
            this.three.postProcessing.needsUpdate = true;
            return;
        }

        // Build the post-processing chain
        //let currentNode: any = null;

        for (const { name, pass } of activePasses) {
            currentNode = pass.callback(
                currentNode,
                this.three.renderer,
                this.scene,
                camera,
                pass.data,
                pass
            );
            
        }

        // Set the final output node
        if (currentNode && this.three.postProcessing) {
            this.three.postProcessing.outputNode = currentNode;
            this.three.postProcessing.needsUpdate = true;
        }

    
    }

    // ----------------------------------------------------------
    // CAMERA MANAGEMENT
    // ----------------------------------------------------------
    public toggleCameraType(): void {
        this.isPerspective = !this.isPerspective;
        // TODO: Implement orthographic/perspective switch if needed
    }

    /**
     * Toggle between editor camera and a preview camera
     * @param camera - The camera to preview, or null to return to editor camera
     * @returns boolean - true if now in preview mode, false if in editor mode
     */
    public togglePreviewCamera(camera?: THREE.Camera): boolean {
        if (camera) {
            // Switch to preview mode with provided camera
            this.previewCamera = camera;
            this.isPreviewMode = true;
            this.three.controls.enabled = false;

            // Update aspect ratio for perspective cameras
            if (this.isPerspectiveCamera(camera)) {
                const canvas = this.three.renderer.domElement;
                camera.aspect = canvas.width / canvas.height;
                camera.updateProjectionMatrix();
            }
        } else {
            // Toggle preview mode on/off
            this.isPreviewMode = !this.isPreviewMode;
            this.three.controls.enabled = !this.isPreviewMode;
        }

        return this.isPreviewMode;
    }

    /**
     * Check if currently in preview mode
     */
    public isInPreviewMode(): boolean {
        return this.isPreviewMode;
    }

    /**
     * Exit preview mode and return to editor camera
     */
    public exitPreviewMode(): void {
        this.isPreviewMode = false;
        this.previewCamera = null;
        this.three.controls.enabled = true;
    }

    /**
     * Get the currently active camera (preview or editor)
     */
    public getActiveCamera(): THREE.Camera {
        return this.isPreviewMode && this.previewCamera
            ? this.previewCamera
            : this.three.camera;
    }

    // ----------------------------------------------------------
    // UTILITIES
    // ----------------------------------------------------------
    public getCanvas(): HTMLCanvasElement {
        return this.three.renderer.domElement;
    }

    public setSize(width: number, height: number): void {
        this.three.renderer.setSize(width, height);
        this.three.camera.aspect = width / height;
        this.three.camera.updateProjectionMatrix();

        // Update preview camera aspect if it's a perspective camera
        if (this.previewCamera && this.isPerspectiveCamera(this.previewCamera)) {
            this.previewCamera.aspect = width / height;
            this.previewCamera.updateProjectionMatrix();
        }

        this.gizmoHelper?.handleResize?.();
        this.updatePassSize?.(width, height);
    }

    public getScene(): THREE.Scene {
        return this.scene;
    }

    public getRenderer(): THREE.WebGPURenderer {
        return this.three.renderer;
    }

    public getCamera(): THREE.PerspectiveCamera {
        return this.three.camera;
    }

    public getControls(): OrbitControls {
        return this.three.controls;
    }

    // ----------------------------------------------------------
    // PRIVATE HELPERS
    // ----------------------------------------------------------
    private isPerspectiveCamera(camera: THREE.Camera): camera is THREE.PerspectiveCamera {
        return 'aspect' in camera;
    }

    // ----------------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------------
    public dispose(): void {
        this.three.controls?.dispose();
        this.three.renderer?.dispose();
        this.gizmoHelper?.dispose?.();
        this.scene.clear();
    }
}


class InteractiveViewHelper {
    constructor(private camera, private mainRenderer) {
        // Create dedicated canvas for the view helper
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        canvas.style.width = '128px';
        canvas.style.height = '128px';
        
        // Create dedicated WebGL renderer with transparency
        this.renderer = new THREEGL.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setClearColor(0x000000, 0); // Transparent background
        this.renderer.setSize(128, 128);
        
        // Initialize ViewHelper with the main camera and dedicated canvas
        this.helper = new ViewHelper(camera, canvas);
        
        // Create container div
        const div = document.createElement('div');
        this.div = div;
        div.id = 'viewHelperXYZ';
        div.style.zIndex = '12';
        div.style.position = 'absolute';
        div.style.height = '128px';
        div.style.width = '128px';
        div.style.pointerEvents = 'auto';
        
        // Append canvas to div
        div.appendChild(canvas);
        document.body.appendChild(div);
        
        // Handle click events
        canvas.addEventListener('pointerup', (event) => {
            this.helper.handleClick(event);
        });
    }
    
    setControll(controls) {
        this.helper.controls = controls;
        this.helper.controls.center = controls.target;
    }
    
    update(dt = 1 / 50) {
        if (this.helper.animating) {
            this.helper.update(dt);
        }
        // Use dedicated renderer instead of shared one
        this.helper.render(this.renderer);
    }
    
    handleResize() {
        const dim = 128;
        const domElement = this.mainRenderer.domElement;
        const rect = domElement.getBoundingClientRect();
        const offsetX = rect.left + (domElement.offsetWidth - dim);
        const offsetY = rect.top + (domElement.offsetHeight - dim);
        this.div.style.top = offsetY + 'px';
        this.div.style.left = offsetX + 'px';
    }
    
    dispose() {
        // Cleanup method
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.div && this.div.parentNode) {
            this.div.parentNode.removeChild(this.div);
        }
    }
}



/* ---------------------------
   Three API - scene / helpers
   --------------------------- */
export class ThreeAPI {
    private renderer?: EditorRenderer;
    public scene: THREE.Scene;
    public helperScene: THREE.Scene;
    public grid?: THREE.GridHelper;
    public axes?: THREE.AxesHelper;
    public transformControls?: THREE.TransformControls;
    public activeTool: string;
    public activeGizmo: boolean;
    public selectedObject?: THREE.Object3D;
    public raycastingScene?: THREE.Scene;
    public helperActive: boolean = true; // Control flag for helpers
    private _box = new THREE.Box3();
    private lights = new THREE.Group()

    constructor(private bus: BusHub) {
        this.scene = new THREE.Scene();
        this.helperScene = new THREE.Scene();
        this.activeTool = '';
        this.activeGizmo = false;
        this.raycastingScene = null;
    }

    setRenderer(renderer: EditorRenderer) {
        this.bus.sceneUpdate.subscribe((scene) => {
            this.raycastingScene = scene;
            this.cleanupInitials()
            this.disableRaycasting()
            this.helperScene.clear();
            scene.traverse(e => {
                this.addHelper(e)
            })
            this.loadInitials()
            this.enableRaycasting()
        });

        this.renderer = renderer;
        // set the internal scene reference to the renderer's scene if desired
        // but we keep a dedicated scene owned by ThreeAPI and set to renderer when playing.
        if (this.renderer.scene) {
            // make sure renderer uses this scene
            //this.renderer.three.setOutNode(pass(this.scene, this.renderer.three.camera))
            this.scene = this.renderer.getScene()
        }

        this.loadInitials();
        this.initRaycaster();
        this.enableRaycasting();
        this.loadDefaultLights()
    }

    initRaycaster() {
        // Raycaster and mouse vector
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Pointer move updates mouse coords
        this.onPointerMove = (event) => {
            if (!this.helperActive) return;

            const rect = this.renderer.three.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        };

        // Click selects object
        this.onClick = (event) => {
            if (!this.helperActive) return;

            // Intersect with all objects in scene
            const intersects = this.getHitFromMouse(event)?.hits;

            if (intersects && intersects?.length > 0) {
                for (let i = 0; i < intersects.length; i++) {
                    if (intersects[i].object?.isMesh && !intersects[i].object.object) {
                        this.setTransformTarget(intersects[i].object);
                        break;
                    }
                }
            } else {
                this.setTransformTarget(null);
            }
        };
    }

    getHitFromMouse(event: MouseEvent) {
        if (!this.helperActive) return null;

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
        this.renderer.three.renderer.domElement.addEventListener('click', this.onClick);
    }

    // Disable raycasting listeners
    disableRaycasting() {
        this.renderer.three.renderer.domElement.removeEventListener('click', this.onClick);
    }

    // Store event listeners and subscriptions for cleanup
    private objectChangeListener?: (event: any) => void;
    private draggingChangedListener?: (event: any) => void;
    private mutationSubscription?: any;


    // default lights
    loadDefaultLights() {
        this.lights.add(
            new THREE.HemisphereLight(0xffffff, 0x444444, 0.8)
        );
        let l2 = new THREE.DirectionalLight(0xffffff, 0.6);
        l2.position.set(2,5,2)
        this.lights.add(l2)
        this.addToScene(this.lights)
    }
    
    toggleLights(activate){
        this.lights.visible = typeof activate === 'boolean' ? activate : !this.lights.visible;
    }

    loadInitials() {
        // Add default helpers
        this.grid = new THREE.GridHelper(10, 10);
        this.boxHelper = new THREE.BoxHelper(new THREE.Object3D(), 0x00ffff);
        this.boxHelper.visible = false;
        this.axes = new THREE.AxesHelper(10);
        this.transformControls = new TransformControls(
            this.renderer.three.camera,
            this.renderer.three.renderer.domElement
        );

        // Store listener references for cleanup
        this.objectChangeListener = () => {
            if (!this.helperActive) return;

            if (this.transformControls.mode === 'translate') mutationCall(this.selectedObject, 'position');
            if (this.transformControls.mode === 'rotate') mutationCall(this.selectedObject, 'rotation');
            if (this.transformControls.mode === 'scale') mutationCall(this.selectedObject, 'scale');
            
            this.selectedObject?.userData?.helper?.update?.()
            this.selectedObject?.parent?.userData?.helper?.update?.()
            
        };

        this.draggingChangedListener = (event) => {
            if (!this.helperActive) return;

            if (this.renderer.three.controls) this.renderer.three.controls.enabled = !event.value;
        };

        this.transformControls.addEventListener('objectChange', this.objectChangeListener);
        this.transformControls.addEventListener("dragging-changed", this.draggingChangedListener);

        const transformHelper = this.transformControls.getHelper();
        // this.axes.layers.set(2)
        // this.grid.layers.set(2)
        // transformHelper.layers.set(2)
        this.helperScene.add(this.grid);
        this.helperScene.add(this.axes);
        this.helperScene.add(transformHelper);
        this.helperScene.add(this.boxHelper);

        this.addToScene(this.helperScene);

        this.mutationSubscription = this.bus.mutationBus.subscribe((e) => {
            if (!this.helperActive) return;

            if (e.path === 'position' || e.path === 'rotation' || e.path === 'scale') {
                this.boxHelper.update();
            }
        });
    }

    /**
     * Clean up all resources created in loadInitials
     */
    cleanupInitials() {
        // Remove event listeners
        if (this.transformControls) {
            if (this.objectChangeListener) {
                this.transformControls.removeEventListener('objectChange', this.objectChangeListener);
                this.objectChangeListener = undefined;
            }
            if (this.draggingChangedListener) {
                this.transformControls.removeEventListener('dragging-changed', this.draggingChangedListener);
                this.draggingChangedListener = undefined;
            }

            // Detach and dispose transform controls
            this.transformControls.detach();
            this.transformControls.dispose();
            this.transformControls = undefined;
        }

        // Unsubscribe from mutation bus
        if (this.mutationSubscription) {
            this.mutationSubscription?.();
            this.mutationSubscription = undefined;
        }

        // Remove and dispose helpers from scene
        if (this.grid) {
            this.helperScene.remove(this.grid);
            this.grid.dispose?.();
            this.grid = undefined;
        }

        if (this.boxHelper) {
            this.helperScene.remove(this.boxHelper);
            this.boxHelper.dispose?.();
            this.boxHelper = undefined;
        }

        if (this.axes) {
            this.helperScene.remove(this.axes);
            this.axes.dispose?.();
            this.axes = undefined;
        }

        // Remove helper scene from main scene
        if (this.helperScene) {
            this.removeFromScene(this.helperScene);
            // Clear helper scene
            this.helperScene.clear();
        }

        // Clear selected object reference
        this.selectedObject = undefined;
    }

    /**
     * Dispose entire ThreeAPI instance
     */
    dispose() {
        // Cleanup initials
        this.cleanupInitials();

        // Disable raycasting
        this.disableRaycasting();

        // Clean up raycaster references
        this.raycaster = undefined;
        this.mouse = undefined;
        this.onPointerMove = undefined;
        this.onClick = undefined;

        // Clear scenes
        if (this.scene) {
            this.scene.clear();
        }
        if (this.helperScene) {
            this.helperScene.clear();
        }

        // Clear renderer reference
        this.renderer = undefined;
        this.raycastingScene = undefined;
    }

    addHelper(object3d) {
        if (!this.helperActive) return null;

        // Remove existing helper if present
        if (object3d.userData.helper) {
            this.helperScene.remove(object3d.userData.helper);
            object3d.userData.helper.dispose?.();
            object3d.userData.helper = null;
        }

        let helper;

        // Camera helpers
        if (object3d.isCamera) {
            helper = new THREE.CameraHelper(object3d);
        }
        // Light helpers
        else if (object3d.isDirectionalLight) {
            helper = new THREE.DirectionalLightHelper(object3d, 1);
        }
        else if (object3d.isPointLight) {
            helper = new THREE.PointLightHelper(object3d, 0.5);
        }
        else if (object3d.isSpotLight) {
            helper = new THREE.SpotLightHelper(object3d);
        }
        else if (object3d.isHemisphereLight) {
            helper = new THREE.HemisphereLightHelper(object3d, 1);
        }
        // Mesh helpers
        // else if (object3d.isMesh || object3d.isLine || object3d.isPoints) {
        //     helper = new THREE.BoxHelper(object3d, 0xffff00);
        // }
        // Bone/Skeleton helpers
        else if (object3d.isSkinnedMesh || object3d.isBone) {
            helper = new THREE.SkeletonHelper(object3d);
        }
        // Generic no helper 
        else {
            helper = null
        }

        if (helper) {
            // Store reference for later removal
            object3d.userData.helper = helper;
            this.helperScene.add(helper);
        }

        return helper;
    }

    removeHelper(object3d) {
        if (object3d.userData.helper) {
            this.helperScene.remove(object3d.userData.helper);
            object3d.userData.helper.dispose?.();
            delete object3d.userData.helper;
        }
        object3d.traverse(obj => {
            if (obj !== object3d) this.removeHelper(obj)
        })
    }

    toggleHelpers(val) {
        this.helperScene.visible = typeof val === 'boolean' ? val : !this.helperScene.visible;
        this.setTransformTarget(this.selectedObject);
    }

    /**
     * Enable or disable all helper functionality
     * @param active - true to enable helpers, false to disable
     */
    setHelperActive(active: boolean) {
        this.helperActive = active;

        // Hide helper scene when inactive
        if (!active) {
            this.helperScene.visible = false;
            this.transformControls?.detach();
            this.boxHelper.visible = false;
        }
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
        if (!this.helperActive) return;

        this.activeGizmo = tool === 'translate' || tool === 'rotate' || tool === 'scale';
        if (this.activeGizmo) this.transformControls.setMode(tool);
        else this.transformControls.detach();
        this.activeTool = tool;
        this.setTransformTarget(this.selectedObject); // connect with gizmo
    }

    setSpace(space) {
        if (!this.helperActive) return;
        this.transformControls.setSpace(space);
    }

    selectObject(target, notify = false) {
        this.selectedObject = target;
        if (notify) {
            this.bus.selectionUpdate.emit(target);
        }
    }

    setTransformTarget(target) {
        if (!this.helperActive) return;

        this.selectObject(target, true);

        if (target && !target.isScene && !this._box.setFromObject(target).isEmpty()) {
            const bx = this.boxHelper.setFromObject(target);
            this.boxHelper.visible = true;
        } else {
            this.boxHelper.visible = false;
        }

        if ((!target || target?.isScene) || !this.activeGizmo || !this.helperScene.visible) {
            return this.transformControls.detach();
        }
        this.transformControls.attach(target);
    }

    focusObject(object: THREE.Object3D, offset = 1.25) {
        const camera = this.renderer.three.camera as THREE.PerspectiveCamera;
        const controls = this.renderer.three.controls;

        const box = this._box.setFromObject(object);
        if (box.isEmpty()) return;

        const center = new THREE.Vector3();
        const size = new THREE.Vector3();

        box.getCenter(center);
        box.getSize(size);

        const maxSize = Math.max(size.x, size.y, size.z);

        // keep existing FOV, do NOT modify camera params
        const fov = THREE.MathUtils.degToRad(camera.fov);
        const distance = (maxSize / (2 * Math.tan(fov / 2))) * offset;

        // move camera along its current view direction
        const direction = new THREE.Vector3()
            .subVectors(camera.position, controls.target)
            .normalize();

        camera.position.copy(center).addScaledVector(direction, distance);

        controls.target.copy(center);
        controls.update();
    }

    toggleCameraViewMode() {
        this.renderer.toggleCameraType();
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



type AnyThree =
    | THREE.Object3D
    | THREE.Material
    | THREE.BufferGeometry;

export class ThreeRegistry {
    private objects = new Map<string, THREE.Object3D>();
    private specialObjects = new Map<string, THREE.Object3D>();
    private materials = new Map<string, THREE.Material>();
    private geometries = new Map<string, THREE.BufferGeometry>();

    register(item: AnyThree, traverse = false) {
        if (item instanceof THREE.Object3D) {
            if (item.userData.special) this.specialObjects.set(item.uuid, item)
            this.objects.set(item.uuid, item);
            if (item.geometry) this.register(item.geometry);
            if (Array.isArray(item.material)) {
                item.material.forEach(m => this.register(m));
            } else if (item.material) {
                this.register(item.material);
            }
            if (traverse) {
                item.traverse(node => {
                    this.register(node);
                })
            }
        } else if (item instanceof THREE.Material) {
            this.materials.set(item.uuid, item);
        } else if (item instanceof THREE.BufferGeometry) {
            this.geometries.set(item.uuid, item);
        }
        return item;
    }

    unregister(item: AnyThree) {
        this.objects.delete(item.uuid);
        this.materials.delete(item.uuid);
        this.geometries.delete(item.uuid);
    }

    getObject(uuid: string) {
        return this.objects.get(uuid);
    }

    getMaterial(uuid: string) {
        return this.materials.get(uuid);
    }

    getGeometry(uuid: string) {
        return this.geometries.get(uuid);
    }
}
export const threeRegistry = new ThreeRegistry();



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
    public registry: ThreeRegistry;
    public activeUrl?: string;


    constructor() {
        this.activeScene = new THREE.Scene();       // Main scene under editor
        this.indexingDepth = 3;                     // optional depth limit
        this.ignoreIndexTypes = [THREE.Bone];       // filter bones from index
        this.sceneIndex = [];                       // flat hierarchy index
        this.registry = threeRegistry;
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
    public fromJson(json: any, setActive): THREE.Scene {
        const loader = new ObjectLoader();
        const scene = loader.parse(json) as THREE.Scene;
        if (setActive) {
            this.activeScene = scene
            this.registry.register(this.activeScene, true);
        }
        return scene
        //this.rebuildLightScene()
        //this._buildIndex();
    }
    
    public setScene(scene){
        this.activeScene = scene
        this.registry.register(this.activeScene, true);
    }
    
    // --------------------------------------------------------
    // Save to file
    // --------------------------------------------------------
    public async saveScene(filePath: string, scene?: THREE.Scene): Promise<void> {
        // const json = this.toJson();
        //this.rebuildLightScene()
        //this.activeScene.userData.lightScene = this.lightScene;
        await fs.writeFile(filePath, JSON.stringify(scene || this.activeScene, null, 2));
        this.activeUrl = filePath;
    }


    public async savePrimary() {
        await this.saveScene("/Game/files/Scenes/Primary.json")
    }
    public async saveActive() {
        if (this.activeUrl)
            await this.saveScene(this.activeUrl)
    }
    // --------------------------------------------------------
    // Load from file
    // --------------------------------------------------------
    public async loadScene(filePath: string, setActive = true): Promise<void> {
        const text = await fs.readFile(filePath);
        const json = JSON.parse(text);
        const scene = this.fromJson(json, setActive);
        this.activeUrl = filePath;
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