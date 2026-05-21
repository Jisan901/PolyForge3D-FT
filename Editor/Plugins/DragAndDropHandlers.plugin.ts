import { Plugin } from "@/Core/Plugins/Plugin"
import { THREE } from '@/Core/lib/THREE';
import { Baxporter } from '@/Core/Plugins/Binary/Baxporter';
import { Editor } from "@/Editor/Editor";
import { mutationCall, toast } from '@/Editor/Mutation';

export default class DragAndDropHandlersPlugin extends Plugin {
    name = "DragAndDropHandlersPlugin"
    exporter = new Baxporter()
    init() {
        const editor = Editor;
        const core = Editor.core;
        const three = editor.api.three;

        Editor.api.buses.assetPanelDrop.subscribe((e: any, mouseEvent: MouseEvent) => {
            console.log(e,mouseEvent,'from')
            if (e.type === 'Export' || e.type === 'Object' || e.type === 'RuntimeResource'){
            const obj = e.data.obj;
            this.exporter.export(obj, editor.assetBrowser.activeDirName, obj.name||obj.type ).then(e=>editor.assetBrowser.reload())
            }
            
        })
        
        
        Editor.api.buses.viewportDrop.subscribe(async (e: any, mouseEvent: MouseEvent) => {
            console.log(e)
            if (e.type === 'Asset'){

            const hit = three.getHitFromMouse(mouseEvent);
            const target_object = hit?.object;
            const scene = editor.core.sceneManager.activeScene;
            const target = three.selectedObject||scene;
            
            if(e.data.type === 'model'){
            const object = await editor.api.loadObjectFile(e.data.fullPath,false);
            // Position and orient object based on hit point
            if (hit) {
                const normal = hit.normal.clone().normalize();
                const quat = new THREE.Quaternion().setFromUnitVectors(object.up, normal);
                object.position.copy(hit.point);
                object.quaternion.copy(quat);
            }
            // Add to scene or selected object
            
            
            editor.addObject(target, object);
            mutationCall(scene);
            toast('Loaded and placed');
            }
            if(e.data.type === 'material'){
            const material = await core.loaders.objectLoader.loadMaterial(e.data.fullPath);
            
            if (hit) {
                hit.object.material = material
            }
            
            
            mutationCall(target_object.material);
            toast('Material placed');
            }
            if(e.data.type === 'geometry'){
            const geometry = await core.loaders.objectLoader.loadGeometry(e.data.fullPath);
            
            if (hit) {
                hit.object.geometry = geometry
            }
            
            
            mutationCall(target_object?.geometry);
            toast('geometry placed');
            }
            if(e.data.type === 'texture'){
            const map = await core.loaders.objectLoader.loadTexture(e.data.fullPath);
            
            if (hit) {
                hit.object.material.map = map
            }
            
            
            mutationCall(target_object.material.map);
            toast('texture placed');
            }
            if(e.data.type === 'animation'){
            const anims = await core.loaders.objectLoader.loadAnimation(e.data.fullPath);
            console.log(anims)
            if (hit) {
                target.animations.push(...Object.values(anims))
            }
            
            
            mutationCall(target_object.animations);
            toast('animations added');
            }
            }
        })
    }
}


// const baxporter = new Baxporter()

// await baxporter.export(mesh,          './assets', 'Character')
// await baxporter.export(geometry,      './assets', 'CharacterGeo')
// await baxporter.export(material,      './assets', 'CharacterMat')
// await baxporter.export(texture,       './assets', 'CharacterTex')
// await baxporter.export(clip,          './assets', 'Idle')
// await baxporter.export([idle, walk],  './assets', 'CharacterAnims')