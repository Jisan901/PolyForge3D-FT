import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { EditorTool, Point } from './types';

interface TextureCanvasViewportProps {
  imageSrc: string | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  activeTool: EditorTool;
  scale: number;
  offset: Point;
  isPanning: boolean;
  onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  onPointerDown: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
}

export const TextureCanvasViewport: React.FC<TextureCanvasViewportProps> = ({
  imageSrc,
  canvasRef,
  containerRef,
  activeTool,
  scale,
  offset,
  isPanning,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => {
  const getCursorClass = () => {
    if (activeTool === 'pan') {
      return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    }
    if (activeTool === 'brush' || activeTool === 'eraser') {
      return 'cursor-crosshair';
    }
    return 'cursor-default';
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden flex items-center justify-center p-4 checkerboard-bg relative touch-none"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={onPointerDown}
      onTouchMove={onPointerMove}
      onTouchEnd={onPointerUp}
      onTouchCancel={onPointerUp}
    >
      {!imageSrc ? (
        <div className="flex flex-col items-center justify-center text-editor-textDim select-none">
          <ImageIcon size={32} className="mb-2 opacity-20" />
          <p className="text-xs font-medium text-white mb-0.5">No Texture Loaded</p>
          <p className="text-[10px]">Select a texture or click "Load" to edit</p>
        </div>
      ) : (
        <div
          className="relative shadow-2xl border border-editor-border/50 flex items-center justify-center"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <canvas
            ref={canvasRef}
            className={`max-w-full max-h-full object-contain ${getCursorClass()}`}
            style={{
              backgroundImage:
                'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQAK9CGVG3UW0AAAAABJRU5ErkJggg==")',
            }}
          />
        </div>
      )}
    </div>
  );
};
