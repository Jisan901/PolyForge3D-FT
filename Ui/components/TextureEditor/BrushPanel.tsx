import React from 'react';
import { Palette, ChevronDown, ChevronRight } from 'lucide-react';
import { BrushSettings } from './types';

interface BrushPanelProps {
  brush: BrushSettings;
  onChange: (updates: Partial<BrushSettings>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const BrushPanel: React.FC<BrushPanelProps> = ({
  brush,
  onChange,
  isOpen,
  onToggle,
}) => {
  return (
    <div className="border-b border-editor-border">
      <button
        className="w-full p-2 flex items-center justify-between hover:bg-white/5 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-1.5">
          <Palette size={12} className="text-editor-textDim" />
          <h3 className="text-[10px] font-semibold text-white uppercase tracking-wider">
            Brush
          </h3>
        </div>
        {isOpen ? (
          <ChevronDown size={12} className="text-editor-textDim" />
        ) : (
          <ChevronRight size={12} className="text-editor-textDim" />
        )}
      </button>

      {isOpen && (
        <div className="p-3 flex flex-col gap-3 bg-[#1a1a1a]">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-editor-textDim">Color</span>
            </div>
            <input
              type="color"
              value={brush.color}
              onChange={(e) => onChange({ color: e.target.value })}
              className="w-full h-6 bg-transparent rounded cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-editor-textDim">Size</span>
              <span className="text-white">{brush.size}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={brush.size}
              onChange={(e) => onChange({ size: Number(e.target.value) })}
              className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-editor-textDim">Falloff</span>
              <span className="text-white">{brush.falloff}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={brush.falloff}
              onChange={(e) => onChange({ falloff: Number(e.target.value) })}
              className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-editor-textDim">Opacity</span>
              <span className="text-white">{brush.opacity}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={brush.opacity}
              onChange={(e) => onChange({ opacity: Number(e.target.value) })}
              className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-editor-textDim">Mask</span>
            </div>
            <select
              value={brush.mask}
              onChange={(e) => onChange({ mask: e.target.value })}
              className="w-full bg-[#2a2a2a] border border-editor-border rounded text-[10px] text-white p-1 outline-none"
            >
              <option value="solid">Solid</option>
              <option value="checkerboard">Checkerboard</option>
              <option value="dots">Dots</option>
              <option value="stripes">Stripes</option>
              <option value="grid">Grid</option>
              <option value="noise">Noise</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
