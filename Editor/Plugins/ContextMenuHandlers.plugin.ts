import { Plugin } from "@/Core/Plugins/Plugin"
import { THREE } from '@/Core/lib/THREE';
import { Editor } from "@/Editor/Editor";
import { mutationCall, toast } from '@/Editor/Mutation';

export default class ContextMenuHandlersPlugin extends Plugin {
    name = "ContextMenuHandlersPlugin"
    async init() {
        const editor = Editor;
        const three = editor.api.three;

        Editor.api.buses.hierarchyContextMenu.subscribe((...args: any[]) => {
            const [id, items] = args;
            const obj = three.selectedObject;
            if (!obj) return;
            let newOptions = [];
            
            if ((obj as any).isScene) newOptions.push({
                label: 'Clear', action: () => {obj.clear();mutationCall(obj, 'children');three.setScene(obj as THREE.Scene)}
            })
            if ((obj as any).isMesh) newOptions.push({
                label: 'Apply Transform', action: () => {(three as any).applyTransform(obj);three.selectObject(obj);}
            })
            if ((obj as any).isGroup) newOptions.push({
                label: 'Join', action: () => {(three as any).joinGroup(obj);mutationCall(obj, 'children');}
            })
            
            
            items.push(...newOptions);
        })
    }
}