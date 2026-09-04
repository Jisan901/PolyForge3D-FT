import { THREE } from '@/Core/lib/THREE';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';

export class InteractiveViewHelper {
    public renderer: THREE.WebGPURenderer;
    public helper: any;
    public div: HTMLDivElement;
    public controls: any = null;

    constructor(private aligner: HTMLElement, private camera: THREE.PerspectiveCamera) {
        // Create dedicated canvas for the view helper
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        canvas.style.width = '128px';
        canvas.style.height = '128px';
        
        // Create dedicated WebGL renderer with transparency
        this.renderer = new THREE.WebGPURenderer({
            canvas,
            antialias: false,
            alpha: true,
            forceWebGL: true
        });
        this.renderer.init();
        this.renderer.setClearColor(0x000000, 0); // Transparent background
        this.renderer.setSize(128, 128);
        
        // Initialize ViewHelper with the main camera and dedicated canvas
        this.helper = new ViewHelper(this.camera, canvas);
        
        // Create container div
        const div = document.createElement('div');
        this.div = div;
        div.id = 'viewHelperXYZ';
        div.style.zIndex = '12';
        div.style.position = 'absolute';
        div.style.height = '128px';
        div.style.width = '128px';
        div.style.right = '8px';
        div.style.bottom = '8px';
        div.style.pointerEvents = 'auto';
        
        // Append canvas to div
        div.appendChild(canvas);

        // Attach to aligner's parent if available
        if (aligner && aligner.parentElement) {
            aligner.parentElement.appendChild(div);
        }
        
        // Handle click events and stop propagation to prevent unwanted viewport orbit/raycasting
        canvas.addEventListener('pointerdown', (event) => {
            event.stopPropagation();
        });

        canvas.addEventListener('pointerup', (event) => {
            event.stopPropagation();
            if (this.controls?.target) {
                this.helper.center = this.controls.target;
            }
            this.helper.handleClick(event);
        });
    }

    get isAnimating(): boolean {
        return Boolean(this.helper?.animating);
    }
    
    setControll(controls: any) {
        this.controls = controls;
        this.helper.controls = controls;
        if (controls && controls.target) {
            // Point helper center directly to the OrbitControls target Vector3
            this.helper.center = controls.target;
        }
    }

    attachTo(container: HTMLElement) {
        if (this.div.parentElement !== container) {
            container.appendChild(this.div);
        }
        this.div.style.display = 'block';
    }

    detach() {
        if (this.div && this.div.parentNode) {
            this.div.parentNode.removeChild(this.div);
        }
    }
    
    update(dt = 1 / 50) {
        // If viewport canvas is unmounted or detached from DOM, remove gizmo and skip rendering
        if (!this.aligner || !this.aligner.isConnected || !this.aligner.parentElement) {
            this.detach();
            return;
        }

        // Ensure gizmo container is inside the canvas parent
        if (this.div.parentElement !== this.aligner.parentElement) {
            this.aligner.parentElement.appendChild(this.div);
            this.div.style.display = 'block';
        }

        // Keep helper.center in sync with current controls.target (handles panning!)
        if (this.controls?.target) {
            this.helper.center = this.controls.target;
        }

        if (this.helper.animating) {
            this.helper.update(dt);
            // When animation completes, update OrbitControls to align with new camera orientation
            if (!this.helper.animating && this.controls) {
                this.controls.update();
            }
        }

        // Render dedicated helper
        this.helper.render(this.renderer);
    }
    
    handleResize() {
        if (this.aligner && this.aligner.isConnected && this.aligner.parentElement) {
            if (this.div.parentElement !== this.aligner.parentElement) {
                this.aligner.parentElement.appendChild(this.div);
            }
            this.div.style.display = 'block';
        } else {
            this.detach();
        }
    }
    
    dispose() {
        // Cleanup method
        if (this.renderer) {
            this.renderer.dispose();
        }
        this.detach();
    }
}