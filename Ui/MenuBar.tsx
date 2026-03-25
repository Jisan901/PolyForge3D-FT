import ContextMenu, { MenuItem } from './components/ContextMenu';
import React, { useState, useEffect, useRef } from 'react';
import { Editor } from "@/Editor/Editor";
import { toast } from "@/Editor/Mutation";
import { useEditorStates, useEditorActions } from './contexts/EditorContext';
import { LayoutTemplate, Layers, Play, Pause, Square, Settings, Hammer, FilePlus, Cpu, Gamepad2 } from 'lucide-react';
import { ObjectType } from '@/Core/Types/Objects'

const editor = Editor;
const Core = Editor.core;

const MenuBar = () => {
    
    const { addObject,
        selectObject,
        deleteObject} = useEditorActions();
    
    const [isPlaying, setIsPlaying] = useState<boolean | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('SCENE');
    
    useEffect(() => {
        editor.prepareForPlayMode(viewMode === 'GAME');
    }, [viewMode]);
    
    
    // Menu State
    const [activeMenu, setActiveMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const navFileRef = useRef<HTMLDivElement>(null);
    const navEditRef = useRef<HTMLDivElement>(null);
    const navGameObjectRef = useRef<HTMLDivElement>(null);
    
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
        { label: 'Open Primary', action: async () => { await editor.mountScene("/Game/files/Scenes/Primary.json"); } },
        { separator: true, label: '', action: () => { } },
        { label: 'Save Scene', shortcut: 'Ctrl+S', action: () => { Core.sceneManager.saveActive(); toast('Saved Active') } },
        { label: 'Save Scene Pr...', shortcut: 'Ctrl+S', action: () => { Core.sceneManager.savePrimary(); toast('Saved Primary') } },
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
        { separator: true, label: '', action: () => { } },
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


    return <>
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
        
        
        <div className="h-8 flex items-center justify-center bg-editor-panel border-b border-editor-border relative px-4 flex-shrink-0">
            <div className="absolute left-2 flex gap-1">
                <button onClick={() => editor.refreshRegistry()} className="p-1.5 rounded hover:bg-white/10 text-editor-textDim">
                    <Hammer size={16} />
                </button>
                <button className="p-1.5 rounded hover:bg-white/10 text-editor-textDim">
                    <Settings size={16} />
                </button>
                {(['SCENE', 'GAME'] as ViewMode[]).map((mode) => (
                    <button
                        key={mode}
                        className={`px-3 py-1 text-[11px] rounded-t-sm ${viewMode === mode ? 'bg-[#1e1e1e] text-white font-medium border-t-2 border-editor-accent' : 'text-editor-textDim hover:bg-white/5'}`}
                        onClick={() => setViewMode(mode)}
                    >
                        {mode === 'SCENE' ? <Cpu size={16}/> : <Gamepad2 size={16} />}
                    </button>
                ))}
            </div>

            <div className="flex items-center bg-black/20 rounded p-1 gap-1 border border-editor-border/50">
                <button
                    className={`p-1.5 rounded ${isPlaying ? 'bg-editor-accent text-white' : 'hover:bg-white/10 text-editor-textDim'}`}
                    onClick={async () => {
                        if (isPlaying === null) {
                            await editor.enterPlayMode();
                            setViewMode('GAME');
                        } else {
                            editor.resumePlayMode();
                        }
                        setIsPlaying(true);
                    }}
                >
                    <Play size={16} fill={isPlaying ? "currentColor" : "none"} />
                </button>
                <button
                    className="p-1.5 rounded hover:bg-white/10 text-editor-textDim"
                    onClick={() => {
                        editor.pausePlayMode();
                        if (isPlaying) setIsPlaying(false);
                    }}
                >
                    <Pause size={16} fill="currentColor" />
                </button>
                <button
                    className="p-1.5 rounded hover:bg-white/10 text-editor-textDim"
                    onClick={async () => {
                        await editor.exitPlayMode();
                        setIsPlaying(null);
                        setViewMode('SCENE');
                    }}
                >
                    <Square size={14} fill="currentColor" />
                </button>
            </div>

            <div className="absolute right-2 flex gap-1">
                <button
                    className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-editor-textDim text-xs border border-transparent hover:border-editor-border"
                    onClick={() => console.log('Build started...')}
                >
                    <FilePlus size={14} />
                    <span>Build</span>
                </button>
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
    </>

}

export default MenuBar;