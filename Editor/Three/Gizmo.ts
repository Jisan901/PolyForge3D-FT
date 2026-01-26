import { THREE } from '@/Core/lib/THREE';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';


export class InteractiveViewHelper {
    private camera:THREE.PerspectiveCamera;
    constructor(private aligner: HTMLElement) {
        // Create dedicated canvas for the view helper
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 500);
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        canvas.style.width = '128px';
        canvas.style.height = '128px';
        
        // Create dedicated WebGL renderer with transparency
        this.renderer = new THREE.WebGPURenderer({
            antialias: false,
            alpha: true,
            forceWebGL: true
        });
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
        const domElement = this.aligner;
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