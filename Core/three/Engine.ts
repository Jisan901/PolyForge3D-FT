import { THREE, TSL } from '@/Core/lib/THREE'

type RenderingConfig = {
    screenScalingFactor: number;
};

type Rendering = {
    renderer: THREE.WebGPURenderer;
    camera: THREE.PerspectiveCamera;
    render: (scene: THREE.Scene) => void;
    config: RenderingConfig;
    postProcessing?: THREE.PostProcessing;
    scenePass: any
};

type EngineType = 'webgpu' | 'webgl';



export class Engine {

    public three!: Rendering;
    public scene!: THREE.Scene;

    private engineType: EngineType;
    private activeCamera!: THREE.Camera;

    public postProcessor!: PostProcessor;

    constructor(engineType: EngineType = 'webgl') {
        this.engineType = engineType;
    }

    // ----------------------------------------------------------
    // INIT
    // ----------------------------------------------------------

    public async init(): Promise<void> {

        this.scene = new THREE.Scene();

        this.three = await this.setupThree();

        // Create PostProcessor AFTER renderer exists
        this.postProcessor = new PostProcessor(this);

        // Default camera
        this.setActiveCamera(this.three.camera);

        //window.addEventListener('resize', this.handleResize);
    }

    // ----------------------------------------------------------
    // THREE SETUP
    // ----------------------------------------------------------

    private async setupThree(): Promise<Rendering> {

        const config: RenderingConfig = { screenScalingFactor: 1 };

        const width = window.innerWidth * config.screenScalingFactor;
        const height = window.innerHeight * config.screenScalingFactor;

        // Renderer
        const renderer = new THREE.WebGPURenderer({
            antialias: false,
            alpha: true,
            forceWebGL: this.engineType === 'webgl'
        });

        await renderer.init();

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);

        // Camera
        const camera = new THREE.PerspectiveCamera(
            45,
            width / height,
            0.001,
            5000
        );

        camera.position.set(0, 10, -10);
        camera.lookAt(0, 0, 0);

        // Fallback render (no PP)
        const render = (scene: THREE.Scene) => {
            renderer.render(scene, camera);
        };

        return {
            renderer,
            camera,
            render,
            config,
            postProcessing: null as any,
            scenePass: null as any
        };
    }

    // ----------------------------------------------------------
    // UPDATE LOOP
    // ----------------------------------------------------------

    public update(): void {

        if (!this.scene || !this.activeCamera) return;

        // PostProcessing path
        if (this.three.postProcessing) {

            // WebGPU render trigger
            this.three.postProcessing.render()

            return;
        }

        // Fallback direct render
        this.three.renderer.render(
            this.scene,
            this.activeCamera
        );
    }

    // ----------------------------------------------------------
    // CAMERA MANAGEMENT
    // ----------------------------------------------------------

    public setActiveCamera(camera: THREE.Camera): void {

        this.activeCamera = camera;

        // Sync postprocessor scene pass
        this.postProcessor?.updateCamera(camera);
    }

    public getActiveCamera(): THREE.Camera {
        return this.activeCamera;
    }

    // ----------------------------------------------------------
    // REQUIRED BY PostProcessor
    // ----------------------------------------------------------

    public getRenderer(): THREE.WebGPURenderer {
        return this.three.renderer;
    }

    public setScene(scene: THREE.Scene): void {

        this.scene = scene;

        // Inform PostProcessor
        if (this.postProcessor) {

            this.postProcessor.updateScene(scene);
        }
    }


    public getActiveScene(): THREE.Scene {
        return this.scene;
    }

    // ----------------------------------------------------------
    // SIZE / RESIZE
    // ----------------------------------------------------------

    public setSize(width: number, height: number): void {

        this.three.renderer.setSize(width, height);

        if (this.isPerspectiveCamera(this.activeCamera)) {
            this.activeCamera.aspect = width / height;
            this.activeCamera.updateProjectionMatrix();
        }
    }

    private handleResize = () => {

        this.setSize(
            window.innerWidth,
            window.innerHeight
        );
    };

    // ----------------------------------------------------------
    // UTILS
    // ----------------------------------------------------------

    public getScene(): THREE.Scene {
        return this.scene;
    }

    public getCanvas(): HTMLCanvasElement {
        return this.three.renderer.domElement;
    }

    private isPerspectiveCamera(
        camera: THREE.Camera
    ): camera is THREE.PerspectiveCamera {

        return (camera as THREE.PerspectiveCamera)
            .isPerspectiveCamera === true;
    }

    // ----------------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------------

    public dispose(): void {

        //window.removeEventListener('resize', this.handleResize);

        this.three.renderer?.dispose();
        this.scene.clear();
    }

}




export type PostProcessCallback = (
    previousNode: any,
    renderer: THREE.WebGPURenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    data?: any,
    pass?: PostProcessPass
) => any;

export type PostProcessUpdate = (
    node: any,
    renderer: THREE.WebGPURenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    data?: any
) => void;

export type PostProcessPass = {
    /** Whether this pass is currently enabled */
    active: boolean;

    /** Execution order (lower = earlier) */
    order: number;

    /** Custom user data for this pass */
    data?: any;

    /** Builds the node chain */
    callback: PostProcessCallback;

    /** Optional runtime update handler */
    update?: PostProcessUpdate;

    /** Cached output node of this pass */
    node?: any;
};

export type PostProcessingRegistry = Record<string, PostProcessPass>;




export class PostProcessor {

    /** Registered post-processing passes */
    private registry: PostProcessingRegistry = {};

    /** Ordered pass execution list */
    private orderList: string[] = ['defaultPass'];

    /** Cached scene render node */
    private scenePassNode: any = null;

    constructor(private engine: Engine) {

        // Default scene render pass
        this.registry['defaultPass'] = {
            active: true,
            order: 0,
            data: {},
            callback: (_, __, scene, camera, ___, pass) => {

                const node = this.scenePassNode||TSL.pass(scene, camera);
                this.scenePassNode = node;
                pass.node = node;

                return node;
            }
        };
    }

    // ---------------------------------------------------------
    // Registration
    // ---------------------------------------------------------

    /**
     * Register a new post-processing pass
     */
    public registerPostProcess(
        name: string,
        callback: PostProcessCallback,
        active = false,
        order = 0,
        data?: any,
        update?: PostProcessUpdate
    ): void {

        this.registry[name] = {
            active,
            order,
            data,
            callback,
            update
        };
    }

    // ---------------------------------------------------------
    // Enable / Disable
    // ---------------------------------------------------------

    /** Enable a post-processing pass */
    public enablePostProcess(name: string): void {
        const pass = this.registry[name];
        if (!pass) return this.warnMissing(name);

        if (pass.active) return;

        pass.active = true;
        this.rebuildPipeline();
    }

    /** Disable a post-processing pass */
    public disablePostProcess(name: string): void {
        const pass = this.registry[name];
        if (!pass) return this.warnMissing(name);

        if (!pass.active) return;

        pass.active = false;
        this.rebuildPipeline();
    }

    /** Toggle a pass */
    public togglePostProcess(name: string): boolean {
        const pass = this.registry[name];
        if (!pass) {
            this.warnMissing(name);
            return false;
        }

        pass.active = !pass.active;
        this.rebuildPipeline();

        return pass.active;
    }

    /** Check pass state */
    public isPostProcessActive(name: string): boolean {
        return this.registry[name]?.active ?? false;
    }

    // ---------------------------------------------------------
    // Ordering
    // ---------------------------------------------------------

    /**
     * Set execution order for passes
     */
    public setPostProcessingOrder(order: string[]): void {

        const invalid = order.filter(n => !this.registry[n]);

        if (invalid.length) {
            console.warn('Invalid post-process names:', invalid);
        }

        this.orderList = order;

        order.forEach((name, i) => {
            const pass = this.registry[name];
            if (pass) pass.order = i;
        });

        this.rebuildPipeline();
    }

    /** Get current pass order */
    public getPostProcessingOrder(): string[] {
        return [...this.orderList];
    }

    /** Get registry snapshot */
    public getPostProcessingRegistry(): PostProcessingRegistry {
        return { ...this.registry };
    }

    // ---------------------------------------------------------
    // Data Updates
    // ---------------------------------------------------------

    /**
     * Update runtime data of a pass
     */
    public updatePostProcessData(name: string, data: any): void {

        const pass = this.registry[name];
        if (!pass) return this.warnMissing(name);

        const renderer = this.engine.getRenderer();
        const scene = this.engine.getActiveScene();
        const camera = this.engine.getActiveCamera();

        pass.data = data;

        if (pass.update && pass.node) {
            pass.update(
                pass.node,
                renderer,
                scene,
                camera,
                data
            );
        }
    }

    /** Get pass data */
    public getPostProcessData(name: string): any {
        return this.registry[name]?.data;
    }

    // ---------------------------------------------------------
    // Pipeline Builder
    // ---------------------------------------------------------

    /**
     * Rebuilds the full post-processing pipeline.
     * ⚠ Expensive operation – call only when needed.
     */
    private rebuildPipeline(): void {
        console.log('rebuildPipeline ⚠ Expensive operation ');
        const renderer = this.engine.getRenderer();
        const scene = this.engine.getActiveScene();
        const camera = this.engine.getActiveCamera();

        if (!this.engine.three.postProcessing) {
            this.engine.three.postProcessing = new THREE.PostProcessing(renderer);
        }

        const activePasses = this.orderList
            .map(name => this.registry[name])
            .filter(pass => pass?.active)
            .sort((a, b) => a.order - b.order);

        if (!activePasses.length) {
            // Debug fallback output
            this.engine.three.postProcessing.outputNode = vec4(1, 0, 0, 1);
            this.engine.three.postProcessing.needsUpdate = true;
            return;
        }

        let currentNode: any = null;

        for (const pass of activePasses) {

            currentNode = pass.callback(
                currentNode,
                renderer,
                scene,
                camera,
                pass.data,
                pass
            );
        }

        this.engine.three.postProcessing.outputNode = currentNode;
        this.engine.three.postProcessing.needsUpdate = true;
    }

    // ---------------------------------------------------------
    // Utils
    // ---------------------------------------------------------

    private warnMissing(name: string) {
        console.warn(`Post-process "${name}" not found`);
    }
    /**
 * Sync active camera with scene pass
 * Call this when engine camera changes
 */
    public updateCamera(camera: THREE.Camera) {

        if (!this.scenePassNode) return;

        // WebGPU ScenePass / RenderPass node uses .camera
        if ('camera' in this.scenePassNode) {
            this.scenePassNode.camera = camera;
        }
    }
    /**
 * Update scene reference for scene pass
 */
    public updateScene(scene: THREE.Scene) {

        this.activeScene = scene;

        if (!this.scenePassNode) return;

        if ('scene' in this.scenePassNode) {
            this.scenePassNode.scene = scene;
        }
    }
}




