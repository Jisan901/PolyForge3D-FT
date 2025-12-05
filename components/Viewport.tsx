import React, { useState } from 'react';
import { 
  MousePointer2, Move, Rotate3d, Maximize, Grid3X3, Sun, Video, PlayCircle,
  Eye, Target, ArrowDownToLine, LightbulbOff, Lock, Copy
} from 'lucide-react';
import { ViewMode, SceneObject, ObjectType } from '../types';

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
      else if (setActive) setActive(id);
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

  // A simulated 3D grid using CSS gradients
  const gridStyle = {
    backgroundImage: `
      linear-gradient(to right, #3f3f46 1px, transparent 1px),
      linear-gradient(to bottom, #3f3f46 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    transform: 'perspective(500px) rotateX(60deg) scale(2)',
    opacity: 0.15,
    width: '200%',
    height: '200%',
    position: 'absolute' as const,
    top: '-50%',
    left: '-50%',
    pointerEvents: 'none' as const
  };

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
      <div className="absolute top-2 left-2 z-40 flex gap-1 bg-editor-panel/95 backdrop-blur-sm border border-editor-border rounded p-1 shadow-lg items-center">
        <ToolButton id="select" icon={MousePointer2} tooltip="Select Tool (Q)" active={toolbarActive === 'select'} setActive={setToolbarActive} />
        <ToolButton id="move" icon={Move} tooltip="Move Tool (W)" active={toolbarActive === 'move'} setActive={setToolbarActive} />
        <ToolButton id="rotate" icon={Rotate3d} tooltip="Rotate Tool (E)" active={toolbarActive === 'rotate'} setActive={setToolbarActive} />
        <ToolButton id="scale" icon={Maximize} tooltip="Scale Tool (R)" active={toolbarActive === 'scale'} setActive={setToolbarActive} />
        <div className="w-[1px] h-4 bg-editor-border mx-1" />
        <ToolButton id="local" icon={Grid3X3} tooltip="Toggle Local/Global" active={toolbarActive === 'local'} setActive={setToolbarActive} />

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
      <div className="absolute top-2 right-2 z-40 flex gap-2">
         <div className="flex bg-editor-panel/90 backdrop-blur border border-editor-border rounded p-1 shadow-lg">
             <div className="flex items-center gap-2 px-2 border-r border-editor-border cursor-pointer hover:bg-white/5 rounded-sm">
                 <Sun size={12} className="text-yellow-400" />
                 <span className="text-[10px] text-white">Lit</span>
             </div>
             <div className="flex items-center gap-2 px-2 cursor-pointer hover:bg-white/5 rounded-sm">
                 <Video size={12} className="text-blue-400" />
                 <span className="text-[10px] text-white">Perspective</span>
             </div>
         </div>
      </div>

      {/* The "3D" Scene */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#1e1e20] to-[#111] z-0">
        
        {/* Grid Floor */}
        <div style={gridStyle} />
        
        {/* Horizon Line */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#2a2a2e] to-transparent opacity-50 pointer-events-none" />

        {/* Mock 3D Objects */}
        <div className="relative w-full h-full perspective-container">
            {/* Center Gizmo Target */}
            {selectedObject ? (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-editor-accent/50 bg-editor-accent/10 hover:bg-editor-accent/20 cursor-pointer flex items-center justify-center group transition-colors z-10">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white bg-black/50 px-2 rounded whitespace-nowrap border border-editor-border shadow-sm">
                      {selectedObject.name}
                  </div>
                  
                  {/* Mock Gizmo Logic */}
                  {toolbarActive === 'move' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-[1px] h-32 bg-green-500 absolute bottom-1/2 origin-bottom" />
                          <div className="h-[1px] w-32 bg-red-500 absolute left-1/2 origin-left" />
                          <div className="w-2 h-2 rounded-full bg-blue-500 z-10 ring-2 ring-black" />
                          {/* Arrows */}
                          <div className="absolute -top-16 text-green-500 text-[10px] font-bold bg-black/50 px-0.5 rounded">Y</div>
                          <div className="absolute -right-16 text-red-500 text-[10px] font-bold bg-black/50 px-0.5 rounded">X</div>
                      </div>
                  )}
                  {toolbarActive === 'rotate' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-32 h-32 rounded-full border border-red-500 absolute opacity-80" />
                          <div className="w-28 h-28 rounded-full border border-green-500 absolute rotate-x-45 opacity-80" />
                          <div className="w-24 h-24 rounded-full border border-blue-500 absolute opacity-80" />
                      </div>
                  )}
                  {toolbarActive === 'scale' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-[1px] h-32 bg-green-500 absolute bottom-1/2" />
                          <div className="h-[1px] w-32 bg-red-500 absolute left-1/2" />
                          <div className="w-3 h-3 bg-blue-500 z-10" />
                          {/* Cube Ends */}
                          <div className="absolute -top-16 w-2 h-2 bg-green-500" />
                          <div className="absolute -right-16 w-2 h-2 bg-red-500" />
                      </div>
                  )}
              </div>
            ) : (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-editor-textDim text-xs pointer-events-none select-none">
                No Object Selected
              </div>
            )}

            {/* Floor Plane hint */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-16 w-96 h-96 border border-zinc-700/30 -z-10 bg-zinc-800/20" />
        </div>

        {/* Axis Indicator (Bottom Right) */}
        <div className="absolute bottom-4 right-4 w-12 h-12 opacity-80 pointer-events-none z-20">
            <div className="relative w-full h-full">
                <div className="absolute bottom-0 left-0 w-[1px] h-8 bg-green-500 origin-bottom transform rotate-0" />
                <div className="absolute bottom-0 left-0 w-8 h-[1px] bg-red-500 origin-left transform rotate-12" />
                <div className="absolute bottom-0 left-0 w-6 h-[1px] bg-blue-500 origin-left transform -rotate-45" />
                <span className="absolute -top-1 left-0 text-[8px] text-green-500 font-bold">Y</span>
                <span className="absolute bottom-0 -right-2 text-[8px] text-red-500 font-bold">X</span>
                <span className="absolute bottom-[-5px] left-[-8px] text-[8px] text-blue-500 font-bold">Z</span>
            </div>
        </div>
      </div>

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