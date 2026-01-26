import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, LayoutTemplate, Settings, Hammer, FilePlus, Layers } from 'lucide-react';
import HierarchyImport from './components/Hierarchy';
import InspectorImport from './components/Inspector';
import Viewport from './components/Viewport';
import AssetBrowserImport from './components/AssetBrowser';
import ConsolePanelImport, { LogEntry } from './components/ConsolePanel';
import ContextMenu, { MenuItem } from './components/ContextMenu';
import TimelineEditorImport from './components/TimelineEditor';
import SettingsModalImport  from './components/SettingsModal';
import UVEditorPlugin from "../Plugins/UVEditor"


import { SceneObject, ViewMode, AssetFile, ObjectType } from '../types';
import { Editor } from "@/Editor/Editor";

import { toast } from "@/Editor/Mutation";
import { useEditorStates, useEditorActions } from './contexts/EditorContext';


const editor = Editor;
const Core = Editor.core;
const three = editor.api.three;


// memo 
const Hierarchy = React.memo(HierarchyImport)
const Inspector = React.memo(InspectorImport)
const AssetBrowser = React.memo(AssetBrowserImport)
const ConsolePanel = React.memo(ConsolePanelImport)
const TimelineEditor = React.memo(TimelineEditorImport)
const SettingsModal = React.memo(SettingsModalImport)

function App() {
    const {
        scene,
        selectedId,
        selectedObject,
        toastData
    } = useEditorStates();
    
    const { addObject,
        selectObject,
        deleteObject} = useEditorActions();
    // Application State
    
    
    
    const [viewMode, setViewMode] = useState<ViewMode>('SCENE');
    const [isPlaying, setIsPlaying] = useState(null);
    const [activeBottomTab, setActiveBottomTab] = useState<'Project' | 'Console' | 'Animation'>('Project');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Menu State
    const [activeMenu, setActiveMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const navFileRef = useRef<HTMLDivElement>(null);
    const navEditRef = useRef<HTMLDivElement>(null);
    const navGameObjectRef = useRef<HTMLDivElement>(null);

    // Resize State
    const [leftWidth, setLeftWidth] = useState(260);
    const [rightWidth, setRightWidth] = useState(280);
    const [bottomHeight, setBottomHeight] = useState(150);
    const [isResizing, setIsResizing] = useState<'left' | 'right' | 'bottom' | null>(null);




    // useEffect(()=>{
    //     const actve = PolyForge.api.getActiveCamera()
    //     if (!actve) return
    //     if (viewMode==='GAME'){
    //         three.renderer.togglePreviewCamera(actve)
    //         three.toggleHelpers(false)
    //         three.toggleLights(false)
            
    //     }
    //     else {
    //         if (!three.renderer.isPreviewMode) return
    //         three.renderer.togglePreviewCamera(null)
    //         three.toggleHelpers(true)
    //         three.toggleLights(true)
    //     }
    // },[viewMode])



    // Actions
    

    

    const handleDeleteObject = (id: string) => {
        
        console.log(`Deleted object ${id}`);
    };

    const handleDuplicateObject = (id: string) => {
        
    };

    

    // --- Menu Handlers ---

    const openFileMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (navFileRef.current) {
            const rect = navFileRef.current.getBoundingClientRect();
            setActiveMenu({ id: 'file', x: rect.left, y: rect.bottom + 4 });
        }
    };

    const openEditMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (navEditRef.current) {
            const rect = navEditRef.current.getBoundingClientRect();
            setActiveMenu({ id: 'edit', x: rect.left, y: rect.bottom + 4 });
        }
    };

    const openGameObjectMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (navGameObjectRef.current) {
            const rect = navGameObjectRef.current.getBoundingClientRect();
            setActiveMenu({ id: 'gameobject', x: rect.left, y: rect.bottom + 4 });
        }
    };

    // --- Menu Items ---

    const getFileMenuItems = (): MenuItem[] => [
        { label: 'New Scene', shortcut: 'Ctrl+N', action: () => editor.newScene() },
        { label: 'Open Primary', action: async () => {await editor.mountScene("/Game/files/Scenes/Primary.json");} },
        { separator: true, label: '', action: () => { } },
        { label: 'Save Scene', shortcut: 'Ctrl+S', action: () => {Core.sceneManager.saveActive();toast('Saved Active')} },
        { label: 'Save Scene Pr...', shortcut: 'Ctrl+S', action: () => {Core.sceneManager.savePrimary();toast('Saved Primary')} },
        { label: 'Save Scene As...', shortcut: 'Ctrl+Shift+S', action: () => console.log('Save Scene As') },
        { separator: true, label: '', action: () => { } },
        { label: 'Build Settings', shortcut: 'Ctrl+Shift+B', action: () => console.log('Build Settings') },
        { label: 'Build And Run', shortcut: 'Ctrl+B', action: () => console.log('Build And Run') },
        { separator: true, label: '', action: () => { } },
        { label: 'Exit', action: () => console.log('Exit') },
    ];
    const getEditMenuItems = (): MenuItem[] => [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => editor.undo() },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => editor.redo() },
        { separator: true, label: '', action: () => { } },
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => console.log('Cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => console.log('Copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => console.log('Paste') },
        { separator: true, label: '', action: () => { } },
        { label: 'Duplicate', shortcut: 'Ctrl+D', action: () => selectedId && handleDuplicateObject(selectedId) },
        { label: 'Delete', shortcut: 'Del', danger: true, action: () => selectedId && handleDeleteObject(selectedId) },
        { separator: true, label: '', action: () => { } },
        { label: 'Play', shortcut: 'Ctrl+P', action: () => setIsPlaying(true) },
        { label: 'Pause', shortcut: 'Ctrl+Shift+P', action: () => setIsPlaying(false) },
        { separator: true, label: '', action: () => {} },
        { label: 'Settings', shortcut: 'Ctrl+,', action: () => setIsSettingsOpen(true) },
    ];
    const getGameObjectMenuItems = (): MenuItem[] => {
        let id = null
        return [
        { label: 'Create Empty', action: () => addObject && addObject(ObjectType.FOLDER, id) },
        { separator: true, label: '', action: () => { } },
        { label: 'Cube', action: () => addObject && addObject(ObjectType.CUBE, id) },
        { label: 'Sphere', action: () => addObject && addObject(ObjectType.SPHERE, id) },
        { label: 'Capsule', action: () => addObject && addObject(ObjectType.CAPSULE, id) },
        { label: 'Cylinder', action: () => addObject && addObject(ObjectType.CYLINDER, id) },
        { label: 'Plane', action: () => addObject && addObject(ObjectType.PLANE, id) },
        { label: 'Light', action: () => addObject && addObject(ObjectType.LIGHT, id) },
        { separator: true, label: '', action: () => { } },
        { label: 'Import New Asset...', action: () => editor.importer.openDialog() },
    ];
}
    // Resize Handlers
    useEffect(() => {
        const eventNotifire = () => window.dispatchEvent(new Event('canvasresize'))
        const handleMove = (clientX: number, clientY: number) => {
            if (isResizing === 'left') {
                const newWidth = Math.max(150, Math.min(clientX, 600));
                setLeftWidth(newWidth);
            } else if (isResizing === 'right') {
                const newWidth = Math.max(200, Math.min(window.innerWidth - clientX, 600));
                setRightWidth(newWidth);
            } else if (isResizing === 'bottom') {
                const newHeight = Math.max(100, Math.min(window.innerHeight - clientY - 24, window.innerHeight - 200));
                setBottomHeight(newHeight);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            e.preventDefault();
            handleMove(e.clientX, e.clientY);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isResizing) return;
            if (e.cancelable) e.preventDefault();
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                handleMove(touch.clientX, touch.clientY);
            }
        };

        const handleEnd = () => {
            setIsResizing(null);
            window.dispatchEvent(new Event('canvasresize'))
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
            window.dispatchEvent(new Event('canvasresize'))
        }

        window.addEventListener('resize', eventNotifire)

        return () => {
            window.removeEventListener('resize', eventNotifire)
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isResizing]);

    return (
        <div className={`h-screen w-screen flex flex-col bg-editor-bg text-editor-text overflow-hidden font-sans ${isResizing === 'left' || isResizing === 'right' ? 'cursor-col-resize' : isResizing === 'bottom' ? 'cursor-row-resize' : ''}`}>

            {/* 1. Main Menu Bar */}
            <div className="h-8 flex items-center px-2 bg-editor-bg border-b border-editor-border select-none text-xs flex-shrink-0 relative z-30">
                <div className="flex items-center mr-4" onClick={() => document.body.requestFullscreen()}>
                    <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded mr-2" />
                    <span className="font-bold tracking-wide">PolyForge</span>
                </div>
                <div className="flex gap-1 text-editor-textDim">
                    <div
                        ref={navFileRef}
                        className={`px-3 py-1 rounded cursor-pointer transition-colors ${activeMenu?.id === 'file' ? 'bg-white/10 text-white' : 'hover:bg-white/10 hover:text-white'}`}
                        onClick={openFileMenu}
                    >
                        File
                    </div>
                    <div
                        ref={navEditRef}
                        className={`px-3 py-1 rounded cursor-pointer transition-colors ${activeMenu?.id === 'edit' ? 'bg-white/10 text-white' : 'hover:bg-white/10 hover:text-white'}`}
                        onClick={openEditMenu}
                    >
                        Edit
                    </div>
                    <div className="px-3 py-1 hover:bg-white/10 rounded cursor-pointer transition-colors">Assets</div>

                    <div
                        ref={navGameObjectRef}
                        className={`px-3 py-1 rounded cursor-pointer transition-colors ${activeMenu?.id === 'gameobject' ? 'bg-white/10 text-white' : 'hover:bg-white/10 hover:text-white'}`}
                        onClick={openGameObjectMenu}
                    >
                        GameObject
                    </div>

                    <div className="px-3 py-1 hover:bg-white/10 rounded cursor-pointer transition-colors">Component</div>
                    <div className="px-3 py-1 hover:bg-white/10 rounded cursor-pointer transition-colors">Window</div>
                    <div className="px-3 py-1 hover:bg-white/10 rounded cursor-pointer transition-colors">Help</div>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-3 text-editor-textDim">
                    <div className="flex items-center gap-1 hover:text-white cursor-pointer bg-editor-panel px-2 py-0.5 rounded border border-editor-border">
                        <LayoutTemplate size={12} />
                        <span>Layout</span>
                    </div>
                    <div className="flex items-center gap-1 hover:text-white cursor-pointer">
                        <Layers size={12} />
                        <span>Layers</span>
                    </div>
                </div>
            </div>

            {activeMenu && activeMenu.id === 'file' && (
                <ContextMenu
                    x={activeMenu.x}
                    y={activeMenu.y}
                    items={getFileMenuItems()}
                    onClose={() => setActiveMenu(null)}
                />
            )}

            {activeMenu && activeMenu.id === 'edit' && (
                <ContextMenu
                    x={activeMenu.x}
                    y={activeMenu.y}
                    items={getEditMenuItems()}
                    onClose={() => setActiveMenu(null)}
                />
            )}

            {activeMenu && activeMenu.id === 'gameobject' && (
                <ContextMenu
                    x={activeMenu.x}
                    y={activeMenu.y}
                    items={getGameObjectMenuItems()}
                    onClose={() => setActiveMenu(null)}
                />
            )}

            {/* 2. Toolbar & Play Controls */}
            <div className="h-10 flex items-center justify-center bg-editor-panel border-b border-editor-border relative px-4 flex-shrink-0">
                <div className="absolute left-2 flex gap-1">
                    <button className="p-1.5 rounded hover:bg-white/10 text-editor-textDim"><Hammer size={16} /></button>
                    <button className="p-1.5 rounded hover:bg-white/10 text-editor-textDim"><Settings size={16} /></button>
                </div>

                <div className="flex items-center bg-black/20 rounded p-1 gap-1 border border-editor-border/50">
                    <button
                        className={`p-1.5 rounded ${isPlaying ? 'bg-editor-accent text-white' : 'hover:bg-white/10 text-editor-textDim'}`}
                        onClick={async () => {
                            isPlaying===null?await editor.enterPlayMode():editor.resumePlayMode()
                            isPlaying===null&&setViewMode('GAME')
                            setIsPlaying(true);
                        }}
                    >
                        <Play size={16} fill={isPlaying ? "currentColor" : "none"} />
                    </button>
                    <button className="p-1.5 rounded hover:bg-white/10 text-editor-textDim" onClick={() => {
                    editor.pausePlayMode()
                        isPlaying&&setIsPlaying(false);
                    }}>
                        <Pause size={16} fill="currentColor" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-white/10 text-editor-textDim" onClick={async () => {
                        await editor.exitPlayMode()
                        setIsPlaying(null)
                        setViewMode('SCENE')
                    }}>
                        <Square size={14} fill="currentColor" />
                    </button>
                </div>

                <div className="absolute right-2 flex gap-1">
                    <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-editor-textDim text-xs border border-transparent hover:border-editor-border" onClick={() => console.log('Build started...')}>
                        <FilePlus size={14} />
                        <span>Build</span>
                    </button>
                </div>
            </div>

            {/* 3. Main Workspace Area */}
            <div className="flex-1 flex overflow-hidden z-10">

                {/* Left: Hierarchy */}
                <div style={{ width: leftWidth }} className="flex-shrink-0 flex flex-col">
                    <Hierarchy />
                </div>

                <div
                    className="w-[2px] bg-editor-bg hover:bg-editor-accent cursor-col-resize z-20 flex-shrink-0 transition-colors border-r border-editor-border touch-none"
                    onMouseDown={() => setIsResizing('left')}
                    onTouchStart={() => setIsResizing('left')}
                />

                {/* Center: Viewport & Assets */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">

                    {/* Center Top: Tab Bar */}
                    <div className="h-8 flex items-center bg-editor-panel border-b border-editor-border px-1 gap-1 flex-shrink-0">
                        <button
                            className={`px-3 py-1 text-[11px] rounded-t-sm flex items-center gap-2 ${viewMode === 'SCENE' ? 'bg-[#1e1e1e] text-white font-medium border-t-2 border-editor-accent' : 'text-editor-textDim hover:bg-white/5'}`}
                            onClick={() => setViewMode('SCENE')}
                        >
                            # Scene
                        </button>
                        <button
                            className={`px-3 py-1 text-[11px] rounded-t-sm flex items-center gap-2 ${viewMode === 'GAME' ? 'bg-[#1e1e1e] text-white font-medium border-t-2 border-editor-accent' : 'text-editor-textDim hover:bg-white/5'}`}
                            onClick={() => setViewMode('GAME')}
                        >
                            Game
                        </button>
                        <button className="px-3 py-1 text-[11px] text-editor-textDim hover:bg-white/5 rounded-t-sm">Asset Store</button>
                    </div>

                    {/* Center Middle: Viewport */}
                    <div className="flex-1 relative overflow-hidden">
                        <Viewport
                            mode={viewMode}
                            setMode={setViewMode}
                            selectedObject={selectedObject}
                        />
                    </div>

                    <div
                        className="h-[2px] bg-editor-bg hover:bg-editor-accent cursor-row-resize z-20 flex-shrink-0 transition-colors border-t border-editor-border touch-none"
                        onMouseDown={() => setIsResizing('bottom')}
                        onTouchStart={() => setIsResizing('bottom')}
                    />

                    {/* Center Bottom: Asset Explorer / Console */}
                    <div style={{ height: bottomHeight }} className="flex-shrink-0 flex flex-col">
                        <div className="h-full flex flex-col overflow-hidden">
                            {/* Tabs for Bottom Panel */}
                            <div className="flex items-center bg-editor-panel border-b border-editor-border h-7 px-1 flex-shrink-0 select-none">
                                <button
                                    className={`px-3 text-[10px] h-full border-b-2 font-medium ${activeBottomTab === 'Project' ? 'border-editor-accent text-white bg-[#1e1e1e]' : 'border-transparent text-editor-textDim hover:text-white'}`}
                                    onClick={() => setActiveBottomTab('Project')}
                                >
                                    Project
                                </button>
                                <button
                                    className={`px-3 text-[10px] h-full border-b-2 font-medium ${activeBottomTab === 'Console' ? 'border-editor-accent text-white bg-[#1e1e1e]' : 'border-transparent text-editor-textDim hover:text-white'}`}
                                    onClick={() => setActiveBottomTab('Console')}
                                >
                                    Console
                                </button>
                                <button
                                    className={`px-3 text-[10px] h-full border-b-2 font-medium ${activeBottomTab === 'Animation' ? 'border-editor-accent text-white bg-[#1e1e1e]' : 'border-transparent text-editor-textDim hover:text-white'}`}
                                    onClick={() => setActiveBottomTab('Animation')}
                                >
                                    Animation
                                </button>
                                <button
                                    className={`px-3 text-[10px] h-full border-b-2 font-medium ${activeBottomTab === 'Plugin' ? 'border-editor-accent text-white bg-[#1e1e1e]' : 'border-transparent text-editor-textDim hover:text-white'}`}
                                    onClick={() => setActiveBottomTab('Plugin')}
                                >
                                    UV Editor
                                </button>
                            </div>

                            {activeBottomTab === 'Project' ? (
                                <AssetBrowser />
                            ) : activeBottomTab === 'Console' ? (
                                <ConsolePanel />
                            ) : activeBottomTab === 'Animation' ? (
                                <TimelineEditor selectedObject={selectedObject} />
                            ) : 
                                <UVEditorPlugin selectedObject={selectedObject}/>
                            }
                        </div>
                    </div>
                </div>

                <div
                    className="w-[2px] bg-editor-bg hover:bg-editor-accent cursor-col-resize z-10 flex-shrink-0 transition-colors border-l border-editor-border touch-none"
                    onMouseDown={() => setIsResizing('right')}
                    onTouchStart={() => setIsResizing('right')}
                />

                {/* Right: Inspector */}
                <div style={{ width: rightWidth }} className="flex-shrink-0 flex flex-col">
                    <Inspector />
                </div>
            </div>

            {/* 4. Footer Status Bar */}
            <div className="h-6 bg-editor-accent/10 border-t border-editor-border flex items-center px-2 justify-between text-[10px] text-editor-textDim select-none flex-shrink-0">
                <div className="flex items-center gap-4">
                    <span>Auto-save enabled</span>
                    <span className="text-editor-text/50">{toastData}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>Baking: 0%</span>
                    <span>v1.0.0</span>
                </div>
            </div>
        {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
        </div>
    );
}

export default App;