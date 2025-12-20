import React, { useState, useRef, useEffect } from 'react';
import {
    MousePointer2, Move, Rotate3d, Maximize, Grid3X3, Sun, Video, PlayCircle,
    Eye, Target, ArrowDownToLine, LightbulbOff, Lock, Copy
} from 'lucide-react';
import { ViewMode, SceneObject, ObjectType } from '../types';
import { PolyForge, BusHub, mutationCall, toast } from "../PolyForge"
import {DragAndDropZone} from "./Utils/DragNDrop";
import * as THREE from 'three'
const handleCameraMode = ()=> PolyForge.api.three.toggleCameraViewMode.bind(PolyForge.api.three)
const editor = PolyForge.editor;
const three = editor.api.three;


interface ViewportProps {
    mode: ViewMode;
    setMode: (mode: ViewMode) => void;
    selectedObject: SceneObject | null;
}

interface DynamicTool {
    id: string;
    icon: React.ElementType;
    tooltip: string;
    action?: () => void;
}

// Extract ToolButton to avoid re-creation on every render
const ToolButton: React.FC<{
    id: string;
    icon: React.ElementType;
    tooltip?: string;
    active?: boolean;
    onClick?: () => void;
    setActive?: (id: string) => void;
}> = ({ id, icon: Icon, tooltip, active, onClick, setActive }) => (
    <button
        className={`p-1.5 rounded hover:bg-white/10 ${active ? 'bg-editor-accent text-white' : 'text-editor-textDim'} relative group transition-colors`}
        onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
            if (setActive) setActive(id);
        }}
        title={tooltip}
    >
        <Icon size={14} />
        {/* Tooltip */}
        {tooltip && (
            <span className="absolute left-1/2 -bottom-8 -translate-x-1/2 bg-black/90 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50 border border-editor-border shadow-md">
                {tooltip}
            </span>
        )}
    </button>
);

const Viewport: React.FC<ViewportProps> = ({ mode, setMode, selectedObject }) => {
    const [toolbarActive, setToolbarActive] = useState('select');
    const canvasParentRef = useRef();
    
    useEffect(() => {
        let el = canvasParentRef.current
        
        if (!el) return
        
        
            if (!el.hasChildNodes()) el?.appendChild?.(PolyForge.editor.renderer.three.renderer.domElement)
    
        
        const resizer = () => {
            const width = el.offsetWidth;
            const height = el.offsetHeight;

            PolyForge.editor.renderer.setSize(width, height)
        }
        window.addEventListener("canvasresize", resizer)
        const width = el.offsetWidth;
        const height = el.offsetHeight;

        PolyForge.editor.renderer.setSize(width, height)
        
        return () => { window.removeEventListener("canvasresize", resizer);  }

    }, [canvasParentRef])
    useEffect(()=>{
        PolyForge.api.three.setTool(toolbarActive)
    },[toolbarActive])

    const getDynamicTools = (): DynamicTool[] => {
        if (!selectedObject) return [];

        const tools: DynamicTool[] = [];

        // Common tools for all transformable objects
        if (selectedObject.transform) {
            tools.push({ id: 'focus', icon: Target, tooltip: 'Focus Object (F)', action: () => console.log('Focus') });
        }

        switch (selectedObject.type) {
            case ObjectType.CAMERA:
                tools.push(
                    { id: 'preview', icon: Eye, tooltip: 'Preview Camera' },
                    { id: 'align_view', icon: Video, tooltip: 'Align View to Camera' }
                );
                break;
            case ObjectType.LIGHT:
                tools.push(
                    { id: 'toggle_light', icon: LightbulbOff, tooltip: 'Toggle Light' },
                    { id: 'shadows', icon: Sun, tooltip: 'Toggle Shadows' }
                );
                break;
            case ObjectType.CUBE:
            case ObjectType.SPHERE:
            case ObjectType.CYLINDER:
            case ObjectType.CAPSULE:
            case ObjectType.PLANE:
                tools.push(
                    { id: 'snap_ground', icon: ArrowDownToLine, tooltip: 'Snap to Ground' },
                    { id: 'lock_mesh', icon: Lock, tooltip: 'Lock Mesh' }
                );
                break;
            case ObjectType.FOLDER:
                tools.push(
                    { id: 'select_children', icon: Copy, tooltip: 'Select Children' }
                );
                break;
        }

        return tools;
    };

    const dynamicTools = getDynamicTools();

    return (
        <div className="w-full h-full flex flex-col bg-[#111] relative overflow-hidden">
            {/* Viewport Toolbar (Floating) */}
            <div className="absolute top-2 left-2 z-10 flex gap-1 bg-editor-panel/95 backdrop-blur-sm border border-editor-border rounded p-1 shadow-lg items-center">
                <ToolButton id="select" icon={MousePointer2} tooltip="Select Tool (Q)" active={toolbarActive === 'select'} setActive={setToolbarActive} />
                <ToolButton id="translate" icon={Move} tooltip="Move Tool (W)" active={toolbarActive === 'translate'} setActive={setToolbarActive} />
                <ToolButton id="rotate" icon={Rotate3d} tooltip="Rotate Tool (E)" active={toolbarActive === 'rotate'} setActive={setToolbarActive} />
                <ToolButton id="scale" icon={Maximize} tooltip="Scale Tool (R)" active={toolbarActive === 'scale'} setActive={setToolbarActive} />
                <div className="w-[1px] h-4 bg-editor-border mx-1" />
                <ToolButton id="grid" icon={Grid3X3} tooltip="Toggle Grid" onClick={e=>{PolyForge.api.three.toggleGrid()}}   />

                {/* Dynamic Section */}
                {dynamicTools.length > 0 && (
                    <>
                        <div className="w-[1px] h-4 bg-editor-border mx-1" />
                        {dynamicTools.map(t => (
                            <ToolButton
                                key={t.id}
                                id={t.id}
                                icon={t.icon}
                                tooltip={t.tooltip}
                                onClick={t.action}
                            />
                        ))}
                    </>
                )}
            </div>

            {/* Viewport Actions (Top Right) */}
            <div className="absolute top-2 right-2 z-10 flex gap-2">
                <div className="flex bg-editor-panel/90 backdrop-blur border border-editor-border rounded p-1 shadow-lg">
                    <div className="flex items-center gap-2 px-2 border-r border-editor-border cursor-pointer hover:bg-white/5 rounded-sm">
                        <Sun size={12} className="text-yellow-400" />
                        <span className="text-[10px] text-white">Lit</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 cursor-pointer hover:bg-white/5 rounded-sm" onClick={handleCameraMode}>
                        <Video size={12} className="text-blue-400" />
                        <span className="text-[10px] text-white">Perspective</span>
                    </div>
                </div>
            </div>

            {/* The "3D" Scene */}
<DragAndDropZone
  highlight = {false}
  onDrop={async (e, mouseEvent) => {
    if (e.type !== 'Asset') return;

    const hit = three.getHitFromMouse(mouseEvent);
    if (!hit) return;

    const object = await editor.api.loadObjectFile(e.data.fullPath);

    /* ---------------- Position ---------------- */
    object.position.copy(hit.point);

    /* ---------------- Rotation ---------------- */
    // Default up direction of the asset
    const up = new THREE.Vector3(0, 1, 0);

    // Surface normal (ensure world space)
    const normal = hit.normal.clone().normalize();

    // Quaternion that rotates up -> normal
    const quat = new THREE.Quaternion().setFromUnitVectors(object.up, normal);

    object.quaternion.copy(quat);

    /* ---------------- Add to scene ---------------- */
    const scene = editor.api.sceneManager.activeScene;
    editor.addObject(scene,object);

    mutationCall(scene);
    toast('Loaded and placed');
  }}
  className='h-full w-full relative flex-1 flex'
>
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#1e1e20] to-[#111] z-0" ref={canvasParentRef}>



            </div>
            </DragAndDropZone>
            {/* Game View Overlay Mock */}
            {mode === 'GAME' && (
                <div className="absolute inset-0 bg-black z-50 flex items-center justify-center">
                    <div className="text-center">
                        <PlayCircle size={48} className="text-editor-accent mx-auto mb-2 opacity-50" />
                        <p className="text-editor-textDim text-sm">Game View Active</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Viewport;