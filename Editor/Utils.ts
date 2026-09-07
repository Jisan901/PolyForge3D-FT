import { getComponent, getEntities } from '@/Core/Functions';
import { Components } from "@/Core/Types/Components";
import { Instance } from "@/Core/PolyForge";

import { mutationCall } from "@/Editor/Mutation";

export function refreshScriptVariables() {
    getEntities(Components.SCRIPT).forEach(async (object) => {
        const script: any = getComponent(Components.SCRIPT, object);
        if (!script) return;
        const path = script.path?.value;
        if (!path) return;
        const ScriptClass: any = await Instance.loaders.scriptLoader.getScriptClass(path, false); // invalidate cache
        
        if (!(ScriptClass && ScriptClass?.propMap)) return;
        
        
        const newVars: Record<string, any> = {};
        
        const propMap = ScriptClass?.propMap;
        
        Object.keys(ScriptClass.propMap).forEach((key) => {
            const meta = propMap[key];
            const isVec = meta?.type === 'vec' || meta?.type === 'vector3';
            if (!script.variables?.[key]) {
                if (propMap[key]) {
                    newVars[key] = propMap[key].default;
                }
            } else if (isVec) {
                const val = script.variables[key];
                if (!val || typeof val !== 'object' || val.x === undefined || val.y === undefined || val.z === undefined || !val.isVector3) {
                    const def = meta.default || {};
                    script.variables[key] = {
                        isVector3: true,
                        x: Number(val?.x ?? def.x ?? 0),
                        y: Number(val?.y ?? def.y ?? 0),
                        z: Number(val?.z ?? def.z ?? 0)
                    };
                }
            }
        });

        script.variables = { ...script.variables, ...newVars };
        mutationCall(object as object, `userData.components.${Components.SCRIPT}.data.variables`);
    })
}