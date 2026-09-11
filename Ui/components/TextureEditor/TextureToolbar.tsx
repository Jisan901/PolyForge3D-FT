import React from 'react';
import { Upload, Hand, Palette, Eraser, ZoomIn, ZoomOut, Expand } from 'lucide-react';
import { EditorTool } from './types';

interface TextureToolbarProps {
  activeTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TextureToolbar: React.FC<TextureToolbarProps> = ({
  activeTool,
  onSelectTool,
  scale,
  onZoomIn,
  onZoomOut,
  onResetView,
  onImageUpload,
}) => {
  return (
    <div className="h-7 border-b border-editor-border bg-editor-panel flex items-center px-2 gap-1.5 shrink-0">
      <label className="flex items-center gap-1 px-1.5 py-0.5 bg-[#2a2a2a] hover:bg-[#333] border border-editor-border rounded text-[10px] text-white cursor-pointer transition-colors">
        <Upload size={10} />
        <span>Load</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImageUpload}
        />
      </label>

      <div className="w-px h-3 bg-editor-border mx-0.5" />

      <button
        onClick={() => onSelectTool('pan')}
        className={`p-1 rounded transition-colors ${
          activeTool === 'pan'
            ? 'bg-editor-accent text-white'
            : 'text-editor-textDim hover:text-white hover:bg-white/10'
        }`}
        title="Pan Tool"
      >
        <Hand size={12} />
      </button>

      <button
        onClick={() => onSelectTool(activeTool === 'brush' ? 'pan' : 'brush')}
        className={`p-1 rounded transition-colors ${
          activeTool === 'brush'
            ? 'bg-editor-accent text-white'
            : 'text-editor-textDim hover:text-white hover:bg-white/10'
        }`}
        title="Brush Tool"
      >
        <Palette size={12} />
      </button>

      <button
        onClick={() => onSelectTool(activeTool === 'eraser' ? 'pan' : 'eraser')}
        className={`p-1 rounded transition-colors ${
          activeTool === 'eraser'
            ? 'bg-editor-accent text-white'
            : 'text-editor-textDim hover:text-white hover:bg-white/10'
        }`}
        title="Eraser Tool"
      >
        <Eraser size={12} />
      </button>

      <div className="w-px h-3 bg-editor-border mx-0.5" />

      <button
        onClick={onZoomIn}
        className="p-1 rounded text-editor-textDim hover:text-white hover:bg-white/10 transition-colors"
        title="Zoom In"
      >
        <ZoomIn size={12} />
      </button>

      <div className="text-[10px] text-editor-textDim w-8 text-center">
        {Math.round(scale * 100)}%
      </div>

      <button
        onClick={onZoomOut}
        className="p-1 rounded text-editor-textDim hover:text-white hover:bg-white/10 transition-colors"
        title="Zoom Out"
      >
        <ZoomOut size={12} />
      </button>

      <button
        onClick={onResetView}
        className="p-1 rounded text-editor-textDim hover:text-white hover:bg-white/10 transition-colors"
        title="Reset View"
      >
        <Expand size={12} />
      </button>
    </div>
  );
};
