import { Plugin } from "@/Core/Plugins/Plugin"
import { THREE } from '@/Core/lib/THREE';
import { Editor } from "@/Editor/Editor";
import { mutationCall, toast } from '@/Editor/Mutation';

export default class ContextMenuHandlersPlugin extends Plugin {
    name = "ContextMenuHandlersPlugin"
    init() {
        const editor = Editor;
        const three = editor.api.three;

        Editor.api.buses.hierarchyContextMenu.subscribe((id, items) => {
            const obj = three.selectedObject;
            if (!obj) return;
            let newOptions = [];
            
            if (obj.isScene) newOptions.push({
                label: 'Clear', action: () => {obj.clear();mutationCall(obj);three.setScene(obj)}
            })
            if (obj.isMesh) newOptions.push({
                label: 'Apply Transform', action: () => {three.applyTransform(obj);three.selectObject(obj);}
            })
            if (obj.isGroup) newOptions.push({
                label: 'Join', action: () => {three.joinGroup(obj);mutationCall(obj);}
            })
            
            
            items.push(...newOptions);
        })
    }
}