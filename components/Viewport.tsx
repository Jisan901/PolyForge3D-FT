import React, { useState } from 'react';
import { MousePointer2, Move, Rotate3d, Maximize, Grid3X3, Sun, Video, PlayCircle } from 'lucide-react';
import { ViewMode } from '../types';

interface ViewportProps {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}

const Viewport: React.FC<ViewportProps> = ({ mode, setMode }) => {
  const [toolbarActive, setToolbarActive] = useState('select');

  // A simulated 3D grid using CSS gradients
  const gridStyle = {
    backgroundImage: `
      linear-gradient(to right, #3f3f46 1px, transparent 1px),
      linear-gradient(to bottom, #3f3f46 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    transform: 'perspective(500px) rotateX(60deg) scale(2)',
    opacity: 0.2,
    width: '200%',
    height: '200%',
    position: 'absolute' as const,
    top: '-50%',
    left: '-50%',
    pointerEvents: 'none' as const
  };

  const ToolButton = ({ id, icon: Icon }: { id: string, icon: any }) => (
    <button 
      className={`p-1.5 rounded hover:bg-white/10 ${toolbarActive === id ? 'bg-editor-accent text-white' : 'text-editor-textDim'}`}
      onClick={() => setToolbarActive(id)}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <div className="flex-1 flex flex-col bg-[#111] relative overflow-hidden">
      {/* Viewport Toolbar (Floating) */}
      <div className="absolute top-2 left-2 z-20 flex gap-1 bg-editor-panel/90 backdrop-blur border border-editor-border rounded p-1 shadow-lg">
        <ToolButton id="select" icon={MousePointer2} />
        <ToolButton id="move" icon={Move} />
        <ToolButton id="rotate" icon={Rotate3d} />
        <ToolButton id="scale" icon={Maximize} />
        <div className="w-[1px] h-6 bg-editor-border mx-1" />
        <ToolButton id="local" icon={Grid3X3} />
      </div>

      {/* Viewport Actions (Top Right) */}
      <div className="absolute top-2 right-2 z-20 flex gap-2">
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
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#1e1e20] to-[#111]">
        
        {/* Grid Floor */}
        <div style={gridStyle} />
        
        {/* Horizon Line */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#2a2a2e] to-transparent opacity-50 pointer-events-none" />

        {/* Mock 3D Objects */}
        <div className="relative w-full h-full perspective-container">
            {/* Center Cube */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-editor-accent/50 bg-editor-accent/10 hover:bg-editor-accent/20 cursor-pointer flex items-center justify-center group transition-colors">
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white bg-black/50 px-2 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                  PlayerBox
               </div>
               {/* Gizmo Mock */}
               {toolbarActive === 'move' && (
                   <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-[1px] h-20 bg-green-500 absolute" />
                       <div className="h-[1px] w-20 bg-red-500 absolute" />
                       <div className="w-2 h-2 rounded-full bg-blue-500" />
                   </div>
               )}
            </div>

            {/* Floor Plane hint */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-16 w-96 h-96 border border-zinc-700/30 -z-10 bg-zinc-800/20" />
        </div>

        {/* Axis Indicator (Bottom Right) */}
        <div className="absolute bottom-4 right-4 w-12 h-12 opacity-80 pointer-events-none">
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
           <div className="absolute inset-0 bg-black z-30 flex items-center justify-center">
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