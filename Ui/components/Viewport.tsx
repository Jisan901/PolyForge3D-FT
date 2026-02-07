

import {
    MousePointer2,
    Move,
    Rotate3d,
    Maximize,
    Grid3X3,
    Sun,
    Move3d,
    Target,
    Eye,
    Video,
    LightbulbOff,
    ArrowDownToLine,
    Lock,
    Copy,
    PlayCircle,
    // Plugin icons
    RotateCw,
    ArrowUpDown,
    Square,
    Box,
    Shield,
    Play,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

/**
 * Centralized icon mapping for dynamic tool rendering
 * Add new icons here as needed (especially for plugins)
 */
export const ICON_MAP: Record<string, LucideIcon> = {
    // Core transform tools
    MousePointer2,
    Move,
    Rotate3d,
    Maximize,
    Grid3X3,
    Move3d,

    // Core view tools
    Target,
    Eye,
    Video,
    PlayCircle,

    // Core object tools
    Sun,
    LightbulbOff,
    ArrowDownToLine,
    Lock,
    Copy,

    // Plugin icons (Animation Plugin)
    RotateCw,
    ArrowUpDown,
    Square,

    // Plugin icons (Physics Plugin)
    Box,
    Shield,
    Play,
};

/**
 * Get icon component by name with fallback
 * @param iconName - Name of the lucide-react icon
 * @returns Icon component or default fallback
 */
export const getIconComponent = (iconName: string): LucideIcon => {
    return ICON_MAP[iconName] || MousePointer2;
};

/**
 * Check if an icon name is valid
 * @param iconName - Icon name to validate
 * @returns true if icon exists in map
 */
export const isValidIcon = (iconName: string): boolean => {
    return iconName in ICON_MAP;
};

/**
 * Get all available icon names
 * @returns Array of icon names
 */
export const getAvailableIcons = (): string[] => {
    return Object.keys(ICON_MAP);
};

/**
 * Register a custom icon dynamically (for plugins)
 * @param iconName - Name to register the icon under
 * @param iconComponent - Lucide icon component
 */
export const registerIcon = (iconName: string, iconComponent: LucideIcon): void => {
    if (ICON_MAP[iconName]) {
        console.warn(`[IconMapper] Icon "${iconName}" already registered, overwriting...`);
    }
    ICON_MAP[iconName] = iconComponent;
};

/**
 * Register multiple icons at once
 * @param icons - Object mapping icon names to components
 */
export const registerIcons = (icons: Record<string, LucideIcon>): void => {
    Object.entries(icons).forEach(([name, component]) => {
        registerIcon(name, component);
    });
};



import React, { useState, useRef, useEffect } from 'react';
//import { MousePointer2, Move, Rotate3d, Maximize, Grid3X3, Sun, Move3d } from 'lucide-react';
import { mutationCall, toast } from '@/Editor/Mutation';
import { Editor } from '@/Editor/Editor';
import { DragAndDropZone } from './Utils/DragNDrop';
import { THREE } from '@/Core/lib/THREE';
//import { getIconComponent } from './iconMapper';
import { type ViewportTool } from '@/Editor/ToolApi';

const editor = Editor;
const three = editor.api.three;

interface ViewportProps {
    selectedObject: THREE.Object3D | null;
}

// Reusable ToolButton component
const ToolButton: React.FC<{
    id: string;
    icon: React.ElementType;
    tooltip?: string;
    active?: boolean;
    onClick?: () => void;
}> = ({ id, icon: Icon, tooltip, active, onClick }) => (
    <button
        className={`p-1.5 rounded hover:bg-white/10 transition-colors relative group ${
            active ? 'bg-editor-accent text-white' : 'text-editor-textDim'
        }`}
        onClick={(e) => {
            e.stopPropagation();
            onClick?.();
        }}
        title={tooltip}
    >
        <Icon size={14} />
        {tooltip && (
            <span className="absolute left-1/2 -bottom-8 -translate-x-1/2 bg-black/90 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50 border border-editor-border shadow-md">
                {tooltip}
            </span>
        )}
    </button>
);

const Viewport: React.FC<ViewportProps> = ({ selectedObject }) => {
    const [toolbarActive, setToolbarActive] = useState('select');
    const [space, setSpace] = useState<'world' | 'local'>('world');
    const [pluginTools, setPluginTools] = useState<ViewportTool[]>([]);
    const canvasParentRef = useRef<HTMLDivElement>(null);

    // Initialize canvas
    useEffect(() => {
        const el = canvasParentRef.current;
        if (!el) return;

        if (!el.hasChildNodes()) {
            el.appendChild(editor.core.engine.getCanvas());
        }

        const handleResize = () => {
            const { offsetWidth: width, offsetHeight: height } = el;
            editor.setSize(width, height);
        };

        window.addEventListener('canvasresize', handleResize);
        handleResize();

        return () => window.removeEventListener('canvasresize', handleResize);
    }, []);

   

    // Update tool mode
    useEffect(() => {
        editor.api.three.helpers.setTool(toolbarActive);
    }, [toolbarActive]);

    // Update transform space
    useEffect(() => {
        editor.api.three.helpers.setSpace(space);
    }, [space]);

    // Get plugin tools when selected object changes
    useEffect(() => {
        if (!selectedObject) {
            setPluginTools([]);
            return;
        }

        // Call backend API to get tools for this object type
        const fetchTools = () => {
            try {
                const tools = editor.api.toolService.getToolsForObject(selectedObject);
                setPluginTools(tools);
            } catch (error) {
                console.error('Failed to fetch tools:', error);
                setPluginTools([]);
            }
        };

        fetchTools();
    }, [selectedObject]);

    // Execute tool action
    const executeToolAction = (tool: ViewportTool) => {
        if (!selectedObject) return;

        try {
            if (typeof tool.action === 'function') {
                // Direct function call
                tool.action(selectedObject);
            } else {
                // String path to editor API
                const actionPath = tool.action.split('.');
                let target: any = window; // Start from window to support 'editor.api.method'

                for (const key of actionPath) {
                    target = target[key];
                    if (!target) {
                        throw new Error(`Cannot find: ${tool.action}`);
                    }
                }

                if (typeof target === 'function') {
                    // Call with params if available, otherwise just the object
                    target(tool.params || selectedObject);
                } else {
                    throw new Error(`${tool.action} is not a function`);
                }
            }

            toast(`${tool.tooltip} executed`);
        } catch (error) {
            console.error(`Failed to execute tool: ${tool.id}`, error);
            toast(`Error: ${tool.tooltip} failed`);
        }
    };

    // Handle asset drop
    const handleAssetDrop = async (e: any, mouseEvent: MouseEvent) => {
        if (e.type !== 'Asset' || e.data.type !== 'model') return;

        const hit = three.getHitFromMouse(mouseEvent);
        const object = await editor.api.loadObjectFile(e.data.fullPath);

        // Position and orient object based on hit point
        if (hit) {
            const normal = hit.normal.clone().normalize();
            const quat = new THREE.Quaternion().setFromUnitVectors(object.up, normal);
            object.position.copy(hit.point);
            object.quaternion.copy(quat);
        }
        console.log(hit,mouseEvent)
        // Add to scene or selected object
        const scene = editor.core.sceneManager.activeScene;
        const target = three.selectedObject || scene;
        editor.addObject(target, object);

        mutationCall(scene);
        toast('Loaded and placed');
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#111] relative overflow-hidden">
            {/* Transform Tools Toolbar */}
            <div className="absolute top-2 left-2 z-10 flex gap-1 bg-editor-panel/95 backdrop-blur-sm border border-editor-border rounded p-1 shadow-lg items-center">
                <ToolButton
                    id="select"
                    icon={MousePointer2}
                    tooltip="Select Tool (Q)"
                    active={toolbarActive === 'select'}
                    onClick={() => setToolbarActive('select')}
                />
                <ToolButton
                    id="translate"
                    icon={Move}
                    tooltip="Move Tool (W)"
                    active={toolbarActive === 'translate'}
                    onClick={() => setToolbarActive('translate')}
                />
                <ToolButton
                    id="rotate"
                    icon={Rotate3d}
                    tooltip="Rotate Tool (E)"
                    active={toolbarActive === 'rotate'}
                    onClick={() => setToolbarActive('rotate')}
                />
                <ToolButton
                    id="scale"
                    icon={Maximize}
                    tooltip="Scale Tool (R)"
                    active={toolbarActive === 'scale'}
                    onClick={() => setToolbarActive('scale')}
                />

                <div className="w-[1px] h-4 bg-editor-border mx-1" />

                <ToolButton
                    id="space"
                    icon={Grid3X3}
                    tooltip="Toggle World/Local"
                    active={space === 'world'}
                    onClick={() => setSpace((s) => (s === 'world' ? 'local' : 'world'))}
                />

                {/* Plugin Tools */}
                {pluginTools.length > 0 && (
                    <>
                        <div className="w-[1px] h-4 bg-editor-border mx-1" />
                        {pluginTools.map((tool) => (
                            <ToolButton
                                key={tool.id}
                                id={tool.id}
                                icon={getIconComponent(tool.icon)}
                                tooltip={tool.tooltip}
                                onClick={() => executeToolAction(tool)}
                            />
                        ))}
                    </>
                )}
            </div>

            {/* Viewport Settings */}
            <div className="absolute top-2 right-2 z-10 flex gap-2">
                <div className="flex bg-editor-panel/90 backdrop-blur border border-editor-border rounded p-1 shadow-lg">
                    <button
                        onClick={() => three.toggleLights()}
                        className="flex items-center gap-2 px-2 border-r border-editor-border cursor-pointer hover:bg-white/5 rounded-sm"
                    >
                        <Sun size={12} className="text-yellow-400" />
                        <span className="text-[10px] text-white">Light</span>
                    </button>
                    <button
                        onClick={() => three.toggleHelpers()}
                        className="flex items-center gap-2 px-2 cursor-pointer hover:bg-white/5 rounded-sm"
                    >
                        <Move3d size={12} className="text-blue-400" />
                        <span className="text-[10px] text-white">Helpers</span>
                    </button>
                </div>
            </div>

            {/* 3D Canvas */}
            <DragAndDropZone
                highlight={false}
                onDrop={handleAssetDrop}
                className="h-full w-full relative flex-1 flex"
            >
                <div
                    ref={canvasParentRef}
                    id="wrapper"
                    className="flex-1 relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#1e1e20] to-[#111] z-0"
                />
            </DragAndDropZone>
        </div>
    );
};

export default Viewport;