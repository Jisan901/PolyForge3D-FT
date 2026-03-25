import { Plugin } from "@/Core/Plugins/Plugin"
import { THREE } from '@/Core/lib/THREE';
import { Editor } from "@/Editor/Editor";
import { mutationCall, toast } from '@/Editor/Mutation';
import material from './BrushMaterial'


export default class TerrainEditorPlugin extends Plugin {
    name = 'Terrain Painter';
    version = '1.0.0';
    private readonly PLUGIN_ID = 'terrain-tools';
    init() {
        const editor = Editor;
        const three = editor.api.three;
        const core = editor.core;
        const canvas = core.engine.getCanvas();

        this.brush = new THREE.Mesh(
            new THREE.SphereGeometry(5, 32, 32),
            material||new THREE.MeshBasicMaterial({
                color: 0xff0000,
                wireframe: false,
                transparent: true,
                opacity: 0.5
            })
        );
        
        let pointermoveHandler;
        
        
        pointermoveHandler = (e)=>{
            const hit = three.getHitFromMouse(e,[three.selectedObject])
            if (hit&&hit.point){
                this.brush.position.copy(hit.point);
            }
        }
        
        
        editor.api.buses.toolChange.subscribe(tool=>{
            if(three.helpers.activeTool==="paint") {three.editorControls.enabled = false;this.brush.visible = true;canvas.addEventListener("pointermove", pointermoveHandler); }
            else {three.editorControls.enabled = true;this.brush.visible = false;canvas.removeEventListener("pointermove", pointermoveHandler);}
        })
        
        
        editor.api.toolService.register(
            // Show for all Object3D instances
            (object: THREE.Object3D) => object.isObject3D === true,
            
            // Dynamic tool provider based on object type
            (object: THREE.Object3D) => {
                const tools = [];
                
                // Common tools for all transformable objects
                if (object.isObject3D) {
                    tools.push({
                        id: 'paint',
                        icon: 'Brush',
                        tooltip: 'Paint',
                        action: ()=>{  },
                        activator: true,
                    });
                }

                return tools;
            },
            
            this.PLUGIN_ID
        );
        
        
        three.editorHelperGroup.add(this.brush);
        
        
    }
}
