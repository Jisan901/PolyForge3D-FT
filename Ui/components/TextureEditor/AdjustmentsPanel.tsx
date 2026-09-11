import React from 'react';
import { SlidersHorizontal, ChevronDown, ChevronRight } from 'lucide-react';
import { TextureAdjustments } from './types';

interface AdjustmentsPanelProps {
  adjustments: TextureAdjustments;
  onChange: (key: keyof TextureAdjustments, value: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const AdjustmentsPanel: React.FC<AdjustmentsPanelProps> = ({
  adjustments,
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
          <SlidersHorizontal size={12} className="text-editor-textDim" />
          <h3 className="text-[10px] font-semibold text-white uppercase tracking-wider">
            Adjustments
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
              <span className="text-editor-textDim">Brightness</span>
              <span className="text-white">{adjustments.brightness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={adjustments.brightness}
              onChange={(e) => onChange('brightness', Number(e.target.value))}
              className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-editor-textDim">Contrast</span>
              <span className="text-white">{adjustments.contrast}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={adjustments.contrast}
              onChange={(e) => onChange('contrast', Number(e.target.value))}
              className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-editor-textDim">Saturation</span>
              <span className="text-white">{adjustments.saturation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={adjustments.saturation}
              onChange={(e) => onChange('saturation', Number(e.target.value))}
              className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-editor-textDim">Hue</span>
              <span className="text-white">{adjustments.hue}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={adjustments.hue}
              onChange={(e) => onChange('hue', Number(e.target.value))}
              className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-editor-textDim">Blur</span>
              <span className="text-white">{adjustments.blur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={adjustments.blur}
              onChange={(e) => onChange('blur', Number(e.target.value))}
              className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>
        </div>
      )}
    </div>
  );
};
