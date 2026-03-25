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
  RotateCw,
  ArrowUpDown,
  Square,
  Box,
  Shield,
  Play,
  Brush
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  // Transform tools
  MousePointer2,
  Move,
  Rotate3d,
  Maximize,
  Grid3X3,
  Move3d,
  // View tools
  Target,
  Eye,
  Video,
  PlayCircle,
  // Object tools
  Sun,
  LightbulbOff,
  ArrowDownToLine,
  Lock,
  Copy,
  // Animation Plugin
  RotateCw,
  ArrowUpDown,
  Square,
  // Physics Plugin
  Box,
  Shield,
  Play,
  Brush
};

export const getIconComponent = (iconName: string): LucideIcon =>
  ICON_MAP[iconName] ?? MousePointer2;

export const isValidIcon = (iconName: string): boolean => iconName in ICON_MAP;

export const getAvailableIcons = (): string[] => Object.keys(ICON_MAP);

export const registerIcon = (
  iconName: string,
  iconComponent: LucideIcon,
): void => {
  if (ICON_MAP[iconName]) {
    console.warn(
      `[IconMapper] Icon "${iconName}" already registered, overwriting...`,
    );
  }
  ICON_MAP[iconName] = iconComponent;
};

export const registerIcons = (icons: Record<string, LucideIcon>): void => {
  Object.entries(icons).forEach(([name, component]) =>
    registerIcon(name, component),
  );
};

import React, { useState, useRef, useEffect } from "react";
import { toast } from "@/Editor/Mutation";
import { Editor } from "@/Editor/Editor";
import { DragAndDropZone } from "./Utils/DragNDrop";
import { useEditorStates } from "../contexts/EditorContext";
//import { getIconComponent } from './iconMapper';
import { type ViewportTool } from "@/Editor/ToolApi";

const editor = Editor;
const three = editor.api.three;

const ToolButton: React.FC<{
  id: string;
  icon: React.ElementType;
  tooltip?: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ id, icon: Icon, tooltip, active, onClick }) => (
  <button
    className={`p-1.5 rounded transition-colors relative group ${
      active ? "bg-editor-accent text-white" : "text-editor-textDim"
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

const Viewport: React.FC = () => {
  const { selectedObject } = useEditorStates();

  const [toolbarActive, setToolbarActive] = useState("select");
  const [space, setSpace] = useState<"world" | "local">("world");
  const [pluginTools, setPluginTools] = useState<ViewportTool[]>([]);
  const canvasParentRef = useRef<HTMLDivElement>(null);
  
  
  
  
  useEffect(() => {
      
    const el = canvasParentRef.current;
    if (!el) return;
    
    const resizeObserver = new ResizeObserver(() => {
      if (!canvasParentRef.current) return;
      const width = canvasParentRef.current.clientWidth;
      const height = canvasParentRef.current.clientHeight;
      
      
      editor.setSize(width, height);
    });
    resizeObserver.observe(el);  
    
    

    if (!el.hasChildNodes()) {
      const canvas = editor.core.engine.getCanvas()
      if (canvas.parentElement){
          canvas.parentElement.innerHTML = `<div className="h-full flex flex-col items-center justify-center bg-editor-panel text-editor-textDim">
                <span className="text-xs">Canvas moved to another window</span>
            </div>`
      }
      el.appendChild(canvas);
      
    }

    const handleResize = () => {
      editor.setSize(el.offsetWidth, el.offsetHeight);
    };

    window.addEventListener("canvasresize", handleResize);
    handleResize();

    return () => {
        resizeObserver.disconnect()
        window.removeEventListener("canvasresize", handleResize);
    }
  }, []);

  useEffect(() => {
    editor.api.three.helpers.setTool(toolbarActive);
  }, [toolbarActive]);

  useEffect(() => {
    editor.api.three.helpers.setSpace(space);
  }, [space]);

  useEffect(() => {
    if (!selectedObject) {
      setPluginTools([]);
      return;
    }
    try {
      setPluginTools(editor.api.toolService.getToolsForObject(selectedObject));
    } catch (error) {
      console.error("Failed to fetch tools:", error);
      setPluginTools([]);
    }
  }, [selectedObject]);

  const executeToolAction = (tool: ViewportTool) => {
    if (!selectedObject) return;
    try {
      if (typeof tool.action === "function") {
        tool.action(selectedObject);
      } else {
        const target = tool.action.split(".").reduce<any>((obj, key) => {
          if (!obj?.[key]) throw new Error(`Cannot find: ${tool.action}`);
          return obj[key];
        }, window);

        if (typeof target !== "function")
          throw new Error(`${tool.action} is not a function`);
        target(tool.params ?? selectedObject);
      }
      toast(`${tool.tooltip} executed`);
    } catch (error) {
      console.error(`Failed to execute tool: ${tool.id}`, error);
      toast(`Error: ${tool.tooltip} failed`);
    }
  };

  const handleAssetDrop = (e: any, mouseEvent: MouseEvent) => {
    editor.api.buses.viewportDrop.emit(e, mouseEvent);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#111] relative overflow-hidden">
      {/* Transform Toolbar */}
      <div className="absolute top-2 left-2 z-10 flex gap-1 bg-editor-panel/95 backdrop-blur-sm border border-editor-border rounded p-1 shadow-lg items-center">
        <ToolButton
          id="select"
          icon={MousePointer2}
          tooltip="Select Tool (Q)"
          active={toolbarActive === "select"}
          onClick={() => setToolbarActive("select")}
        />
        <ToolButton
          id="translate"
          icon={Move}
          tooltip="Move Tool (W)"
          active={toolbarActive === "translate"}
          onClick={() => setToolbarActive("translate")}
        />
        <ToolButton
          id="rotate"
          icon={Rotate3d}
          tooltip="Rotate Tool (E)"
          active={toolbarActive === "rotate"}
          onClick={() => setToolbarActive("rotate")}
        />
        <ToolButton
          id="scale"
          icon={Maximize}
          tooltip="Scale Tool (R)"
          active={toolbarActive === "scale"}
          onClick={() => setToolbarActive("scale")}
        />

        <div className="w-[1px] h-4 bg-editor-border mx-1" />

        <ToolButton
          id="space"
          icon={Grid3X3}
          tooltip="Toggle World/Local"
          active={space === "world"}
          onClick={() => setSpace((s) => (s === "world" ? "local" : "world"))}
        />

        {pluginTools.length > 0 && (
          <>
            <div className="w-[1px] h-4 bg-editor-border mx-1" />
            {pluginTools.map((tool) => (
              <ToolButton
                key={tool.id}
                id={tool.id}
                icon={getIconComponent(tool.icon)}
                tooltip={tool.tooltip}
                {...(tool.activator && { active: toolbarActive===tool.id })}
                onClick={() => {executeToolAction(tool);tool.activator && setToolbarActive(tool.id)}}
              />
            ))}
          </>
        )}
      </div>

      {/* Viewport Settings */}
      <div className="absolute top-2 right-2 z-10">
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
