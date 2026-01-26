import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

import { THREE } from '@/Core/lib/THREE';
import {mutationCall} from "@/Editor/Mutation"
import { MappedObject } from "@/Editor/ObjectMapper";
import { Editor } from "@/Editor/Editor";

const editor = Editor;
const Core = Editor.core;

interface EditorStatesValue {
    scene: THREE.Scene[];
    selectedId: string;
    selectedObject: THREE.Object3D | null;
    mappedObject: MappedObject | null;
    version: number;
    toastData: string;
}

const EditorStatesContext = createContext<EditorStatesValue | null>(null);

export function EditorStatesProvider({ children }) {
    const [scene, setScene] = useState<THREE.Scene[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(null);
    const [mappedObject, setMappedObject] = useState<MappedObject | null>(null);
    const [version, setVersion] = useState(0);
    const [toastData, setToastData] = useState("Ready");

    // Sync Scene from PolyForge
    useEffect(() => {
        const active = Core?.sceneManager?.activeScene;
        setScene(active ? [active] : []);
        
        return editor.api.buses.sceneUpdate.subscribe(() => {
            const active = Core?.sceneManager?.activeScene;
            setScene(active ? [active] : []);
        });
    }, []);

    // Sync Messages
    useEffect(() => {
        return editor.api.buses.messageBus.subscribe((e) => {
            setToastData(e);
        });
    }, []);

    // Sync Selection
    useEffect(() => {
        return editor.api.buses.selectionUpdate.subscribe((target) => {
            //const target = PolyForge.api.three.selectedObject;
            setSelectedId(target?.uuid || "");
            setSelectedObject(target || null);
            if (target) {
                setMappedObject(new MappedObject(target));
            } else {
                setMappedObject(null);
            }
        });
    }, []);

    const value: EditorStatesValue = {
        scene,
        selectedId,
        selectedObject,
        mappedObject,
        version,
        toastData,
    };

    return (
        <EditorStatesContext value={value}>
            {children}
        </EditorStatesContext>
    );
}

export function useEditorStates(): EditorStatesValue {
    const ctx = useContext(EditorStatesContext);
    if (!ctx) throw new Error("useEditorStates must be inside <EditorStatesProvider>");
    return ctx;
}






const builder = Core.builder;

interface EditorActionsValue {
    addObject: (type: string, parentUuid?: string) => THREE.Object3D | null;
    selectObject: (uuid?: string) => THREE.Object3D | null;
    deleteObject: (uuid: string) => void;
    onDuplicate: (uuid: string) => THREE.Object3D | null;
    onAddComponent: (t:any)=>void;
    onRemoveComponent: (t:any)=>void;
}

const EditorActionsContext = createContext<EditorActionsValue | null>(null);


const sceneManager = Core.sceneManager;


export function EditorActionsProvider({ children }) {
    

    const addObject = useCallback(
        (type: string, parentUuid?: string) => {
            const root = sceneManager.activeScene
            if (!root) return null;

            const parent = parentUuid
                ? root?.getObjectByProperty("uuid", parentUuid)
                : root;

            if (!parent) return null;

            const obj = builder.create(type);
            editor.addObject(parent, obj);

            return obj;
        },
        []
    );

    const onDuplicate = useCallback(
        (uuid?: string) => {
            const root = sceneManager.activeScene
            if (!root) return null;

            const target = uuid
                ? root?.getObjectByProperty("uuid", uuid)
                : null;
            
            if (!target) return null;

            const parent = target.parent || root;
            if (!parent) return null;

            const obj = target.clone();
            editor.addObject(parent, obj);
            
            return obj;
        },
        []
    );

    const selectObject = useCallback(
        (uuid?: string) => {
            const root = sceneManager.activeScene;
            if (!root) return null;

            const target = uuid
                ? root?.getObjectByProperty("uuid", uuid)
                : null;
            
            
            if (editor.api.three.selectedObject?.uuid !== target?.uuid)
                return editor.api.three.selectObject(target);
                
            //editor.api.three.selectObject(target);

            return target;
        },
        []
    );

    const deleteObject = useCallback(
        (uuid: string) => {
            const root = sceneManager.activeScene;
            if (!root||root.uuid === uuid) return;

            const target = root?.getObjectByProperty("uuid", uuid);
            if (!target) return;

            editor.removeObject(target);
        },
        []
    );
    
    const onAddComponent = useCallback((id,force=false)=>{
        const target = editor.api.three.selectedObject;
        if (target.userData.components&&target.userData.components[id]&&!force) return 
        
        const component = Core.componentManager.createComponent(id)
        
        if (target&&component){
            target.userData.special = true;
            target.userData.components??={}
            target.userData.components[id]=component
        }
        editor.api.three.selectObject(target)
        
    },[])
    
    const onRemoveComponent = useCallback((id)=>{
        const target = editor.api.three.selectedObject;
        const component = target.userData.components[id]
        
        if (target&&component){
            delete target.userData.components[id]
            if (parseInt(id)===7) mutationCall(target,'userData.components.7')
            if (Object.keys(target.userData.components).length===0) target.userData.special = false;
        }
        
        editor.api.three.selectObject(target)
        
    },[])

    const value: EditorActionsValue = {
        addObject,
        selectObject,
        deleteObject,
        onDuplicate,
        onAddComponent,
        onRemoveComponent
    };

    return (
        <EditorActionsContext value={value}>
            {children}
        </EditorActionsContext>
    );
}

export function useEditorActions(): EditorActionsValue {
    const ctx = useContext(EditorActionsContext);
    if (!ctx) throw new Error("useEditorActions must be inside <EditorActionsProvider>");
    return ctx;
}



// 
export default function EditorProviders({ children }) {
    return (
        <EditorStatesProvider>
            <EditorActionsProvider>
                {children}
            </EditorActionsProvider>
        </EditorStatesProvider>
    );
}