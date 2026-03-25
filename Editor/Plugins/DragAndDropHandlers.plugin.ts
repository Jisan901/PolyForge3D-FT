import { Plugin } from "@/Core/Plugins/Plugin"
import { THREE } from '@/Core/lib/THREE';
import { Editor } from "@/Editor/Editor";
import { mutationCall, toast } from '@/Editor/Mutation';

export default class DragAndDropHandlersPlugin extends Plugin {
    init() {
        const editor = Editor;
        const three = editor.api.three;

        Editor.api.buses.assetPanelDrop.subscribe(() => {

        })
        Editor.api.buses.viewportDrop.subscribe(async (e: any, mouseEvent: MouseEvent) => {
            if (e.type !== 'Asset' || e.data.type !== 'model') return;

            const hit = three.getHitFromMouse(mouseEvent);
            const object = await editor.api.loadObjectFile(e.data.fullPath);

            // Position and orient object based on hit point
            if (hit) {
                const normal = hit.normal.clone().normalize();
                const quat = new THREE.Quaternion().setFromUnitVectors(object.up, normal);
                object.position.copy(hit.point);
                object.quaternion.copy(quat);
            }
            console.log(hit, mouseEvent)
            // Add to scene or selected object
            const scene = editor.core.sceneManager.activeScene;
            const target = three.selectedObject || scene;
            editor.addObject(target, object);

            mutationCall(scene);
            toast('Loaded and placed');
        })
    }
}