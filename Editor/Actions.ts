import fs from "@/Core/lib/fs";
import {Editor} from "@/Editor/Editor";


const ACTIONS = Editor.actionRegistry;


ACTIONS.registerGlobal("reimport",async (path)=>{
    const data = await fs.readFile(path);
    const last = path.lastIndexOf('/');


    if (last === -1) path="import.object";
    const file = new File([data],path.slice(last + 1));
    Editor.importer.importFile(file,Editor.importer.ctx)
});

export default ACTIONS;