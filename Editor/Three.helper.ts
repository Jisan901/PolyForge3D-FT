import { THREE } from "@/Core/lib/THREE";
import { Engine } from "@/Core/three/Engine";
import { ThreeHelpers } from "@/Core/three/Helper";

import { mutationCall } from "@/Editor/Mutation";

import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { InteractiveViewHelper } from "@/Editor/Three/Gizmo";


export class HelperManager {
    public transformControls: TransformControls;
    public grid: THREE.GridHelper;
    public axes: THREE.AxesHelper;
    public boxHelper: THREE.BoxHelper;

    public activeTool: string = '';
    public activeGizmo: boolean = false;
    private _box = new THREE.Box3();

    // Cleanup refs
    private _listeners: {
        [key: string]: Function
    } = {};
    private _sub?: any;

    private currentObject: null | THREE.Object3D = null;

    private _helpers = new Map<string,
        THREE.Object3D>();

    constructor(
        private bus: BusHub,
        private domElement: HTMLElement,
        private camera: THREE.Camera,
        private editorGroup: THREE.Group // Attach helpers here
    ) {
        // 1. Init Static Helpers
        this.grid = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
        this.axes = new THREE.AxesHelper(10);
        this.boxHelper = new THREE.BoxHelper(new THREE.Object3D(), 0x00ffff);
        this.boxHelper.visible = false;

        // 2. Init Transform Controls
        this.transformControls = new TransformControls(camera, domElement);

        // 3. Add to Editor Group
        this.editorGroup.add(this.grid, this.axes, this.boxHelper, this.transformControls.getHelper());

        this.setupListeners();
    }

    private setupListeners() {
        // Transform Object Change
        this._listeners.change = () => {
            if (!this.editorGroup.visible) return;
            const sel = this.transformControls.object;
            if (sel) {
                if (['translate', 'rotate', 'scale'].includes(this.transformControls.mode)) {
                    mutationCall(sel, this.transformControls.mode === 'translate' ? 'position' : this.transformControls.mode === 'rotate' ? 'rotation' : 'scale');
                }
                sel.userData?.helper?.update?.();
            }
        };

        // Disable orbit when dragging gizmo
        this._listeners.drag = (e: any) => this.bus.orbitEnabled.emit(!e.value);

        this.transformControls.addEventListener('objectChange', this._listeners.change as any);
        this.transformControls.addEventListener('dragging-changed', this._listeners.drag as any);

        // Mutation Sync
        this._sub = this.bus.mutationBus.subscribe((e: any) => {
            if (this.editorGroup.visible && ['position', 'rotation', 'scale'].includes(e.path)) this.boxHelper.update();
        });
    }

    refreshHelpers(targetScene: THREE.Scene) {
        // Clear old specific helpers
        this.editorGroup.children = this.editorGroup.children.filter(c => !c.userData.isSpecificHelper)

        targetScene.traverse((obj) => {
            if (obj === this.editorGroup) return; // Skip self
            this.addSpecificHelper(obj);
        });
    }

    addSpecificHelper(obj: THREE.Object3D) {
        // if (!this.editorGroup.visible) return; that's not matter

        // Cleanup existing
        if (obj.userData.helper) {
            this.removeHelper(obj);
        }

        let h;
        if (obj.isCamera) h = new THREE.CameraHelper(obj as THREE.Camera);
        else if (obj.isDirectionalLight) h = new THREE.DirectionalLightHelper(obj as THREE.DirectionalLight, 1);
        else if (obj.isPointLight) h = new THREE.PointLightHelper(obj as THREE.PointLight, 0.5);
        else if (obj.isSpotLight) h = new THREE.SpotLightHelper(obj as THREE.SpotLight);
        else if (obj.isHemisphereLight) h = new THREE.HemisphereLightHelper(obj as THREE.HemisphereLight, 1);
        else if (obj.isSkinnedMesh || obj.isBone) h = new THREE.SkeletonHelper(obj);

        if (h) {
            h.userData.isSpecificHelper = true;
            obj.userData.helper = h.uuid;
            this._helpers.set(h.uuid, h);
            this.editorGroup.add(h);
        }
    }

    removeHelper(object3d: THREE.Object3D) {
        if (!object3d.userData.helper) return;
        const helper = this._helpers.get(object3d.userData.helper);
        if (!helper) return;


        this.editorGroup.remove(helper);
        ThreeHelpers.freeGPU(helper);
        delete object3d.userData.helper;
        this._helpers.delete(object3d.userData.helper)

        object3d.traverse(obj => {
            if (obj !== object3d) this.removeHelper(obj)
        })
    }

    attach(target: THREE.Object3D | null) {
        this.currentObject = target;
        if (!this.editorGroup.visible) return;

        // Box
        if (target && !target.isScene) {
            this._box.setFromObject(target);
            if (!this._box.isEmpty()) {
                this.boxHelper.setFromObject(target);
                this.boxHelper.visible = true;
            }
        } else {
            this.boxHelper.visible = false;
        }

        // Gizmo
        if (!target || target.isScene || !this.activeGizmo || target.userData.locked) this.transformControls.detach();
        else this.transformControls.attach(target);
    }

    setTool(tool: string) {
        this.activeGizmo = ['translate',
            'rotate',
            'scale'].includes(tool);
        this.activeTool = tool;
        this.bus.toolChange.emit(tool);
        if (this.activeGizmo) this.transformControls.setMode(tool as any);
        else {
            return this.transformControls.detach();
        }
        if (this.currentObject) this.attach(this.currentObject);
    }
    setSpace(space: string) {
        this.transformControls.setSpace(space);
    }

    dispose() {
        this.transformControls.removeEventListener('objectChange', this._listeners.change as any);
        this.transformControls.removeEventListener('dragging-changed', this._listeners.drag as any);
        this._sub?.();
        this.transformControls.detach();
        this.transformControls.dispose();
    }

}

export class ThreeAPI {
    public selectedObject?: THREE.Object3D;
    public helpers: HelperManager;

    public gizmo: InteractiveViewHelper;

    // --- Editor Internals ---
    public editorGroup = new THREE.Group();
    public editorHelperGroup = new THREE.Group();
    public editorCamera: THREE.PerspectiveCamera;
    public editorControls: OrbitControls;
    private editorLights = new THREE.Group();

    // --- State ---
    private _activeCamera: THREE.Camera;
    private _raycaster = new THREE.Raycaster();
    private _mouse = new THREE.Vector2();
    private _canvas: HTMLCanvasElement;
    public scene: THREE.Scene;

    constructor(
        private bus: BusHub,
        private engine: Engine, // direct core
    ) {
        this._canvas = this.engine.getCanvas.bind(this.engine)();
        this.scene = this.engine.getActiveScene.bind(this.engine)();



        // 1. Setup Editor Group (Hidden from game logic via flag)
        this.editorGroup.userData.hiddenOnEditor = true;
        this.editorGroup.name = 'Editor_Helpers_Root';
        this.editorGroup.toJSON = () => {
            const object = new THREE.Object3D()
            object.name = 'Editor_Helpers_Root';
            return object.toJSON()
        }

        this.editorGroup.add(this.editorHelperGroup);

        // 2. Setup Internal Camera & Controls
        const aspect = this._canvas.clientWidth / this._canvas.clientHeight;
        this.editorCamera = new THREE.PerspectiveCamera(70, aspect, 0.001, 5000);
        this.editorCamera.position.set(5, 5, 5);
        this.editorCamera.lookAt(0, 0, 0);

        this.engine.setActiveCamera(this.editorCamera);

        this.editorControls = new OrbitControls(this.editorCamera, this._canvas);

        this.gizmo = new InteractiveViewHelper(this._canvas, this.editorCamera);
        this.gizmo.setControll(this.editorControls)

        // Start in Editor Mode
        this._activeCamera = this.editorCamera;

        // 3. Setup Helper Manager
        this.helpers = new HelperManager(this.bus, this._canvas, this.editorCamera, this.editorHelperGroup);

        // 4. Setup Lights
        this.setupEditorLights();

        // 5. Init Scene
        this.setScene(this.scene);
        this.initInteraction();

        // Listen for orbit disable requests from Gizmo
        this.bus.orbitEnabled.subscribe((enabled: boolean) => this.editorControls.enabled = enabled);
    }

    /**
    * Maps the API to a new scene. Handles moving the editor group and refreshing helpers.
    */
    setScene(newScene: THREE.Scene) {

        if (newScene.userData.helperSceneId) {
            const previous = newScene.getObjectByName(newScene.userData.helperSceneId);
            if (previous) {
                previous.removeFromParent();
                ThreeHelpers.freeGPU(previous);
            }
        }


        newScene.userData.helperSceneId = 'Editor_Helpers_Root';

        // Remove from old
        this.editorGroup.removeFromParent();

        this.scene = newScene;

        // Add to new (Always ensure editor group is part of the scene graph)

        this.helpers.refreshHelpers(newScene);

        this.scene.add(this.editorGroup);

        // Reset selection if strictly needed, or keep if UUID matches
        this.selectObject(null);
    }

    setCameraMode(mode: 'editor' | 'game') {
        if (mode === 'editor') {
            this._activeCamera = this.editorCamera;
            this.editorControls.enabled = true;
            this.helpers.transformControls.camera = this.editorCamera; // Update Gizmo Cam
        } else {
            // Find game camera (naive approach, get first found)
            const gameCam = this.scene.getObjectByProperty('isCamera', true) as THREE.Camera;
            if (gameCam) {
                this._activeCamera = gameCam;
                this.editorControls.enabled = false;
                this.helpers.transformControls.camera = gameCam; // Update Gizmo Cam
            } else {
                console.warn('No game camera found in scene');
            }
        }
    }

    setupEditorLights() {
        this.editorLights.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 10, 7);
        this.editorLights.add(dirLight);
        this.editorGroup.add(this.editorLights);
    }

    /* --- Interaction --- */

    private initInteraction() {
        this._canvas.addEventListener('click', (e) => {
            if (!this.editorGroup.visible) return; // Don't select if helpers hidden

            const rect = this._canvas.getBoundingClientRect();
            this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this._raycaster.setFromCamera(this._mouse, this._activeCamera);

            // Raycast everything, but filter results
            const intersects = this._raycaster.intersectObjects(this.scene.children.filter(child => child.name !== "Editor_Helpers_Root"), true);

            for (let hit of intersects) {
                // Skip Editor Tools
                if (this.isEditorObject(hit.object)) continue;

                // Select first valid mesh
                this.selectObject(hit.object);
                return;
            }
            this.selectObject(null);
        });
    }


    public getHitFromMouse = (event: MouseEvent, hitGroup?: THREE.Object3D[]) => {


        const rect = this._canvas.getBoundingClientRect();
        this._mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this._raycaster.setFromCamera(
            this._mouse,
            this.editorCamera
        );

        const hits = this._raycaster.intersectObjects(
            hitGroup?hitGroup:this.scene.children.filter(child => child.name !== "Editor_Helpers_Root"),
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
            point: hit.point.clone(),
            // world space
            normal,
            // world space
            object: hit.object,
            distance: hit.distance,
            hits
        };
    }

    // Helper to check if an object belongs to the editor group
    private isEditorObject(obj: THREE.Object3D): boolean {
        let curr: THREE.Object3D | null = obj;
        while (curr) {
            if (curr === this.editorGroup || curr.userData.isSpecificHelper || curr.type === 'LineSegments') return true;
            curr = curr.parent;
        }
        return false;
    }

    selectObject(obj: THREE.Object3D | null) {
        if(this.helpers.activeTool !== 'select') return;
        this.selectedObject = obj || undefined;
        this.helpers.attach(obj);
        this.bus.selectionUpdate.emit(obj);
    }

    /* --- Shorthands & Proxies --- */

    update(dt) {
        if (this._activeCamera === this.editorCamera) this.editorControls.update();
        this.gizmo.update(dt);
    }

    toggleHelpers(activate: boolean) {
        this.editorHelperGroup.visible = typeof activate === 'boolean' ? activate : !this.editorHelperGroup.visible;
        if (!activate) this.helpers.attach(null);
    }

    toggleLights(activate: boolean) {
        this.editorLights.visible = typeof activate === 'boolean' ? activate : !this.editorLights.visible;
    }

    resize(width: number, height: number) {
        this.gizmo.handleResize()
        if (this.editorCamera instanceof THREE.PerspectiveCamera) {
            this.editorCamera.aspect = width / height;
            this.editorCamera.updateProjectionMatrix();
        }
    }

    public focusSelected = () => {
        if (!this.selectedObject) return;
        const box = new THREE.Box3().setFromObject(this.selectedObject);
        if (box.isEmpty()) return;

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length();

        const offset = size * 1.5;
        const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(this.editorCamera.quaternion); // relative to cam

        // Simple Zoom
        this.editorCamera.position.copy(center).add(direction.multiplyScalar(offset));
        this.editorControls.target.copy(center);
        this.editorControls.update();
    }
    public toggleCameraPreview = () => {
        this.engine.setActiveCamera(this.selectedObject.uuid === this.engine.activeCamera.uuid ? this.editorCamera : this.selectedObject)
    }
    public toggleObjectLock = () => {
        const selected = this.selectedObject;

        if (!selected) {
            console.warn('No object selected');
            return;
        }

        // Toggle lock state
        selected.userData.locked = !selected.userData.locked;

        // Update selectable state
        selected.userData.selectable = !selected.userData.locked;

        // Optionally disable transform controls when locked
        if (selected.userData.locked && this.helpers.transformControls) {
            this.helpers.transformControls.detach()
        } else {
            this.selectObject(selected)
        }

        console.log(`Object ${selected.userData.locked ? 'locked' : 'unlocked'}: ${selected.name || selected.uuid}`);
    };


    /**
    * Snaps a 3D object to the ground using raycasting and bounding box computation
    * @param {THREE.Object3D} object - The object to snap to ground
    * @param {THREE.Scene} scene - The scene containing the ground
    * @param {Object} options - Configuration options
    * @returns {Object} Result object with success status and raycast info
    */
    public snapToGround = (object, options = {}) => {
        const {
            groundLayerMask = null,
            // Optional: specific layer for ground objects
            offset = 0,
            // Additional vertical offset from ground
            useObjectCenter = false,
            // Use object center instead of bottom
            maxDistance = 1000,
            // Maximum raycast distance
            raycastDirection = new THREE.Vector3(0, -1, 0) // Downward by default
        } = options;

        // Initialize raycaster
        const raycaster = new THREE.Raycaster();

        // Compute bounding box for the object
        const boundingBox = new THREE.Box3();
        boundingBox.setFromObject(object);

        // Get bounding box dimensions
        const boxSize = new THREE.Vector3();
        boundingBox.getSize(boxSize);

        const boxCenter = new THREE.Vector3();
        boundingBox.getCenter(boxCenter);

        // Determine raycast origin
        let rayOrigin;
        if (useObjectCenter) {
            rayOrigin = boxCenter.clone();
        } else {
            // Start from bottom center of bounding box
            rayOrigin = new THREE.Vector3(
                boxCenter.x,
                boundingBox.min.y,
                boxCenter.z
            );
        }

        // Set up raycaster
        raycaster.set(rayOrigin, raycastDirection.clone().normalize());
        raycaster.far = maxDistance;



        // Perform raycast
        const intersects = raycaster.intersectObjects(this.scene.children.filter(child => child.name !== "Editor_Helpers_Root"), true);

        if (intersects.length > 0) {
            const hitPoint = intersects[0].point;
            const hitNormal = intersects[0].normal;
            const hitObject = intersects[0].object;

            // Calculate new position
            let newY;
            if (useObjectCenter) {
                // Position center at hit point
                newY = hitPoint.y + offset;
            } else {
                // Position bottom of bounding box at hit point
                const bottomOffset = boxCenter.y - boundingBox.min.y;
                newY = hitPoint.y + bottomOffset + offset;
            }

            // Update object position
            object.position.y = newY;

            return {
                success: true,
                hitPoint: hitPoint.clone(),
                hitNormal: hitNormal.clone(),
                hitObject: hitObject,
                distance: intersects[0].distance,
                boundingBox: boundingBox,
                boxSize: boxSize,
                originalY: rayOrigin.y,
                newY: newY
            };
        } else {
            return {
                success: false,
                message: 'No ground found within raycast distance',
                rayOrigin: rayOrigin.clone(),
                rayDirection: raycastDirection.clone(),
                maxDistance: maxDistance,
                boundingBox: boundingBox,
                boxSize: boxSize
            };
        }
    }



    dispose() {
        this.helpers.dispose();
        this.editorControls.dispose();
        this.editorGroup.removeFromParent();
        this.scene.clear();
    }
}