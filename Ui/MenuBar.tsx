import React, { useState, useEffect, useRef } from 'react';
import ContextMenu from './components/ContextMenu';
import { Editor } from '@/Editor/Editor';
import { useEditorStates } from './contexts/EditorContext';
import { useMenus } from '@/Editor/MenuApi';
import { registerDefaultMenuItems } from './MenuBarDefaults';
import {
    LayoutTemplate,
    Layers,
    Play,
    Pause,
    Square,
    Settings,
    Hammer,
    FilePlus,
    Cpu,
    Gamepad2,
} from 'lucide-react';

const editor = Editor;

type ViewMode = 'SCENE' | 'GAME';

export const MenuBar: React.FC = () => {
    const { selectedId } = useEditorStates();
    const menuManager = useMenus();

    const [isPlaying, setIsPlaying] = useState<boolean | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('SCENE');

    // Menu State
    const [activeMenu, setActiveMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        registerDefaultMenuItems();
    }, []);

    useEffect(() => {
        editor.prepareForPlayMode(viewMode === 'GAME');
    }, [viewMode]);

    // Handle Top-Level Menu Click
    const handleMenuClick = (menuId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (activeMenu?.id === menuId) {
            setActiveMenu(null);
            return;
        }

        const el = menuRefs.current[menuId];
        if (el) {
            const rect = el.getBoundingClientRect();
            setActiveMenu({ id: menuId, x: rect.left, y: rect.bottom + 4 });
        }
    };

    // Smooth hover-switch between open menus (desktop menu bar feel)
    const handleMenuMouseEnter = (menuId: string) => {
        if (!activeMenu || activeMenu.id === menuId) return;

        const el = menuRefs.current[menuId];
        if (el) {
            const rect = el.getBoundingClientRect();
            setActiveMenu({ id: menuId, x: rect.left, y: rect.bottom + 4 });
        }
    };

    const topMenus = menuManager.getMenus();

    const currentMenuItems = activeMenu
        ? menuManager.getItems(activeMenu.id, { editor, selectedId })
        : [];

    return (
        <>
            <div className="h-8 flex items-center px-2 bg-editor-bg border-b border-editor-border select-none text-xs flex-shrink-0 relative z-30">
                <div
                    className="flex items-center mr-4 cursor-pointer"
                    onClick={() => document.body.requestFullscreen?.()}
                >
                    <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded mr-2" />
                    <span className="font-bold tracking-wide">PolyForge</span>
                </div>

                {/* Dynamic Menu Bar Categories */}
                <div className="flex gap-1 text-editor-textDim">
                    {topMenus.map((menu) => (
                        <div
                            key={menu.id}
                            ref={(el) => {
                                menuRefs.current[menu.id] = el;
                            }}
                            className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                                activeMenu?.id === menu.id
                                    ? 'bg-white/10 text-white'
                                    : 'hover:bg-white/10 hover:text-white'
                            }`}
                            onClick={(e) => handleMenuClick(menu.id, e)}
                            onMouseEnter={() => handleMenuMouseEnter(menu.id)}
                        >
                            {menu.icon && <span>{menu.icon}</span>}
                            <span>{menu.label}</span>
                        </div>
                    ))}
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

            {/* Play/Pause/ViewMode Bar */}
            <div className="h-8 flex items-center justify-center bg-editor-panel border-b border-editor-border relative px-4 flex-shrink-0">
                <div className="absolute left-2 flex gap-1">
                    <button
                        onClick={() => (editor as any).refreshRegistry?.()}
                        className="p-1.5 rounded hover:bg-white/10 text-editor-textDim"
                        title="Refresh Registry"
                    >
                        <Hammer size={16} />
                    </button>
                    <button
                        className="p-1.5 rounded hover:bg-white/10 text-editor-textDim"
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>
                    {(['SCENE', 'GAME'] as ViewMode[]).map((mode) => (
                        <button
                            key={mode}
                            className={`px-3 py-1 text-[11px] rounded-t-sm ${
                                viewMode === mode
                                    ? 'bg-[#1e1e1e] text-white font-medium border-t-2 border-editor-accent'
                                    : 'text-editor-textDim hover:bg-white/5'
                            }`}
                            onClick={() => setViewMode(mode)}
                        >
                            {mode === 'SCENE' ? <Cpu size={16} /> : <Gamepad2 size={16} />}
                        </button>
                    ))}
                </div>

                <div className="flex items-center bg-black/20 rounded p-1 gap-1 border border-editor-border/50">
                    <button
                        className={`p-1.5 rounded ${
                            isPlaying
                                ? 'bg-editor-accent text-white'
                                : 'hover:bg-white/10 text-editor-textDim'
                        }`}
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
                        <Play size={16} fill={isPlaying ? 'currentColor' : 'none'} />
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

            {/* Single Dynamic ContextMenu for any active menu category */}
            {activeMenu && currentMenuItems.length > 0 && (
                <ContextMenu
                    x={activeMenu.x}
                    y={activeMenu.y}
                    items={currentMenuItems}
                    onClose={() => setActiveMenu(null)}
                />
            )}
        </>
    );
};

export default MenuBar;