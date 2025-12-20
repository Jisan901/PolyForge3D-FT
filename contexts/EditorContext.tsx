import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from "react";
import * as THREE from "three";


import { PolyForge, mutate } from "../PolyForge"
import { MappedObject } from "../PolyModule/ObjectMapper"

const editor = PolyForge.editor;

const builder = PolyForge.meshBuilder;

interface EditorContextValue {
    scene: THREE.Scene[];                    // your `[activeScene]` wrapper
    selectedId: string;
    selectedObject: THREE.Object3D | null;
    version: number;
    mappedObject: null | MappedObject;

    addObject: (type: string, parentUuid?: string) => THREE.Object3D | null;
    selectObject: (uuid?: string) => THREE.Object3D | null;
    setSelectedObjectProperties: (path: string, value: any) => void;
    deleteObject: (uuid: string) => void;
    onDuplicate: (uuid: string)=>void;
    
    toastData : string
}

export const EditorContext = createContext<EditorContextValue | null>(null);

export default function EditorProvider({ children }) {
    const [scene, setScene] = useState([]);
    const [toastData, setToastData] = useState('Ready');
    // ---------------------------------------
    // Sync Scene from PolyForge
    // ---------------------------------------
    useEffect(() => {
        const active = PolyForge?.api?.sceneManager?.asctiveScene;
        setScene(active ? [active] : []);
        return editor.api.buses.sceneUpdate.subscribe(() => {
            const active = PolyForge?.api?.sceneManager?.activeScene;
            setScene(active ? [active] : []);
        });
    }, []);

    useEffect(() => {
        PolyForge.syncLoads()
        return editor.api.buses.messageBus.subscribe((e)=>{
            setToastData(e)
        })
    },[])



    const [selectedId, setSelectedId] = useState("");
    const [selectedObject, setSelectedObject] = useState(null);
    const [version, setVersion] = useState(0); // force rerender counter
    const [mappedObject, setMappedObject] = useState(null);

    // ---------------------------------------
    // Add Object
    // ---------------------------------------
    const addObject = useCallback(
        (type: string, parentUuid?: string) => {
            if (!scene[0]) return null;

            const parent = parentUuid
                ? scene[0]?.getObjectByProperty("uuid", parentUuid)
                : scene[0];

            if (!parent) return null;

            const obj = builder.create(type);
            editor.addObject(parent, obj)

            return obj;
        },
        [scene]
    );
    const onDuplicate = useCallback(
        (uuid?: string) => {
            if (!scene[0]) return null;

            const target = uuid
                ? scene[0]?.getObjectByProperty("uuid", uuid)
                : null;
            if (!target) return null;
            
            const parent = target.parent||scene[0];
            
            if (!parent) return null;

            const obj = target.clone();
            editor.addObject(parent, obj)
            return obj;
        },
        [scene]
    );

    // ---------------------------------------
    // Select Object
    // ---------------------------------------




    useEffect(() => {

        return editor.api.buses.selectionUpdate.subscribe(() => {
            const target = PolyForge.api.three.selectedObject;

            setSelectedId(target?.uuid || "");
            setSelectedObject(target || null);
            let map = new MappedObject(target)
            if (target) setMappedObject(map)
            else setMappedObject(null)
            
        });
    }, []);



    const selectObject = useCallback(
        (uuid?: string) => {

            if (!scene[0]) return null;

            const target = uuid
                ? scene[0]?.getObjectByProperty("uuid", uuid)
                : null;

            PolyForge.api.three.setTransformTarget(target);
    
            // setSelectedId(uuid || "");
            // setSelectedObject(target || null);
            // if (target) setMappedObject(new MappedObject(target))
            // else setMappedObject(null)
            return target;
        },
        [scene]
    );


    const setSelectedObjectProperties = useCallback((path: string, value: any) => {
        setSelectedObject(prev => {
            if (!prev) return prev;

            // mutate in place (same reference)
            const keys = path.split(".");
            let ref = prev;

            for (let i = 0; i < keys.length - 1; i++) {
                ref = ref[keys[i]];
            }
            ref[keys[keys.length - 1]] = value;

            return prev; // same reference
        });

    }, [selectedId]);
    // ---------------------------------------
    // Delete Object
    // ---------------------------------------
    const deleteObject = useCallback(
        (uuid: string) => {
            if (!scene[0]) return null;

            const target = uuid
                ? scene[0]?.getObjectByProperty("uuid", uuid)
                : null;

            if (!target) return;

            editor.removeObject(target);
        },
        [scene]
    );

    const value = {
        scene,
        selectedId,
        selectedObject,
        mappedObject,
        addObject,
        selectObject,
        setSelectedObjectProperties,
        deleteObject,
        onDuplicate,
        version,
        toastData
    } as EditorContextValue;

    return (
        <EditorContext value={value}>
            {children}
        </EditorContext>
    );
}

export function useEditor(): EditorContextValue {
    const ctx = useContext(EditorContext);
    if (!ctx) throw new Error("useEditor must be inside <EditorProvider>");
    return ctx;
}

export function useHierarchyEditor() {
    const { scene, addObject, selectObject, deleteObject, onDuplicate } = useContext(EditorContext);
    return { scene, addObject, selectObject, deleteObject, onDuplicate };
}