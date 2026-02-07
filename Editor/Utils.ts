import { getComponent, getEntities } from '@/Core/Functions';
import { Components } from "@/Core/Types/Components";
import { Instance } from "@/Core/PolyForge";

import { mutationCall } from "@/Editor/Mutation";

export function refreshScriptVariables() {
    getEntities(Components.SCRIPT).forEach(async (object) => {
        const script = getComponent(Components.SCRIPT, object);
        if (!script) return;
        const path = script.path?.value;
        if (!path) return;
        const ScriptClass = await Instance.loaders.scriptLoader.getScriptClass(path, false); // invalidate cache
        
        if (!(ScriptClass && ScriptClass?.propMap)) return;
        
        
        const newVars = {};
        
        const propMap = ScriptClass?.propMap;
        
        Object.keys(ScriptClass.propMap).forEach((key) => {
            if (!script.variables[key]) {
                if (propMap[key]) {
                    newVars[key] = propMap[key].default;
                }
            }
        });

        script.variables = { ...script.variables, ...newVars };
        mutationCall(object as object, `userData.components.${Components.SCRIPT}.data.variables`);
    })
}