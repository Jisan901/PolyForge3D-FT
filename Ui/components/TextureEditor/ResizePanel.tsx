import React from 'react';
import { Maximize, ChevronDown, ChevronRight } from 'lucide-react';

interface ResizePanelProps {
  width: number | '';
  height: number | '';
  maintainAspectRatio: boolean;
  onWidthChange: (val: number | '') => void;
  onHeightChange: (val: number | '') => void;
  onToggleMaintainAspectRatio: (val: boolean) => void;
  onApplyResize: () => void;
  disabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export const ResizePanel: React.FC<ResizePanelProps> = ({
  width,
  height,
  maintainAspectRatio,
  onWidthChange,
  onHeightChange,
  onToggleMaintainAspectRatio,
  onApplyResize,
  disabled,
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
          <Maximize size={12} className="text-editor-textDim" />
          <h3 className="text-[10px] font-semibold text-white uppercase tracking-wider">
            Resize
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] text-editor-textDim">Width</span>
              <input
                type="number"
                value={width}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onWidthChange(isNaN(val) ? '' : val);
                }}
                className="w-full bg-editor-input border border-editor-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-editor-accent text-white"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] text-editor-textDim">Height</span>
              <input
                type="number"
                value={height}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onHeightChange(isNaN(val) ? '' : val);
                }}
                className="w-full bg-editor-input border border-editor-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-editor-accent text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={maintainAspectRatio}
              onChange={(e) => onToggleMaintainAspectRatio(e.target.checked)}
              className="w-3 h-3 bg-editor-input border border-editor-border rounded focus:outline-none focus:border-editor-accent accent-editor-accent"
            />
            <span className="text-[10px] text-editor-textDim">Maintain Aspect Ratio</span>
          </label>

          <button
            onClick={onApplyResize}
            disabled={disabled || !width || !height}
            className="w-full py-1 bg-editor-accent hover:bg-editor-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded text-[10px] text-white transition-colors"
          >
            Apply Resize
          </button>
        </div>
      )}
    </div>
  );
};
