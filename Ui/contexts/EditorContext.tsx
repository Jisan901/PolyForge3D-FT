import React, { createContext, useContext, useState, useEffect } from "react";
import { THREE } from '@/Core/lib/THREE';
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

export function EditorStatesProvider({ children }: { children: React.ReactNode }) {
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

export default function EditorProviders({ children }: { children: React.ReactNode }) {
    return (
        <EditorStatesProvider>
            {children}
        </EditorStatesProvider>
    );
}