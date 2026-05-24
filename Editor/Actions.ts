import fs from "@/Core/lib/fs";
import {Editor} from "@/Editor/Editor";
import { THREE } from '@/Core/lib/THREE';
import { Baxporter } from '@/Core/Plugins/Binary/Baxporter';


const exporter = new Baxporter();
const ACTIONS = Editor.actionRegistry;


ACTIONS.registerGlobal("reimport",async (path)=>{
    const data = await fs.readFile(path);
    const last = path.lastIndexOf('/');


    if (last === -1) path="import.object";
    const file = new File([data],path.slice(last + 1));
    Editor.importer.importFile(file,Editor.importer.ctx)
});


ACTIONS.registerGlobal("new_material",async ()=>{
    const mat = new THREE.MeshStandardMaterial();
    const name = prompt('enter material name');
    exporter.export(mat, Editor.assetBrowser.activeDirName, `${name||mat.type}` ).then(e=>Editor.assetBrowser.reload())
});


ACTIONS.registerGlobal("new_folder",async ()=>{
    const name = prompt('enter folder name');
    await fs.mkdir(Editor.assetBrowser.activeDirName+'/'+name)
});

export default ACTIONS;