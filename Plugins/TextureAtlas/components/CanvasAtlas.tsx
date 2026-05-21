import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { AtlasConfig, AtlasItem } from '../types';

interface CanvasAtlasProps {
  config: AtlasConfig;
  items: AtlasItem[];
  fitMode: 'stretch' | 'fit';
  tool: 'add' | 'erase' | 'pan';
  renderMode: 'pixelated' | 'interpolated';
  onDropImage: (files: File[], col: number, row: number) => void;
  onAreaSelect: (col: number, row: number, colSpan: number, rowSpan: number, shiftKey: boolean) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function CanvasAtlas({ config, items, fitMode, tool, renderMode, onDropImage, onAreaSelect, canvasRef }: CanvasAtlasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activePointers = useRef<Set<number>>(new Set());
  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ col: number; row: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ col: number; row: number } | null>(null);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  const atlasWidth = config.columns * config.cellWidth;
  const atlasHeight = config.rows * config.cellHeight;

  const centerView = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const padding = 40;
    const availableWidth = container.clientWidth - padding;
    const availableHeight = container.clientHeight - padding;
    
    const scaleX = availableWidth / atlasWidth;
    const scaleY = availableHeight / atlasHeight;
    const initialScale = Math.min(scaleX, scaleY, 1);
    
    setScale(initialScale);
    setPan({
      x: (container.clientWidth - atlasWidth * initialScale) / 2,
      y: (container.clientHeight - atlasHeight * initialScale) / 2
    });
  }, [atlasWidth, atlasHeight]);

  useEffect(() => {
    centerView();
    window.addEventListener('resize', centerView);
    return () => window.removeEventListener('resize', centerView);
  }, [centerView]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = 0.002;
      const delta = -e.deltaY * zoomSensitivity;
      
      setScale(prevScale => {
        const newScale = Math.min(Math.max(0.1, prevScale * (1 + delta)), 10);
        const rect = container.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;
        
        setPan(prevPan => {
          const targetX = (pointerX - prevPan.x) / prevScale;
          const targetY = (pointerY - prevPan.y) / prevScale;
          return {
            x: pointerX - targetX * newScale,
            y: pointerY - targetY * newScale
          };
        });
        
        return newScale;
      });
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, atlasWidth, atlasHeight);

    // Set smoothing based on render mode
    ctx.imageSmoothingEnabled = renderMode === 'interpolated';

    // Draw checkerboard background for transparency
    const checkerSize = 16;
    for (let y = 0; y < atlasHeight; y += checkerSize) {
      for (let x = 0; x < atlasWidth; x += checkerSize) {
        ctx.fillStyle = ((x / checkerSize + y / checkerSize) % 2 === 0) ? '#2a2a2a' : '#1a1a1a';
        ctx.fillRect(x, y, checkerSize, checkerSize);
      }
    }

    // Draw images
    items.forEach(item => {
      const colSpan = item.colSpan || 1;
      const rowSpan = item.rowSpan || 1;
      const x = item.col * config.cellWidth;
      const y = item.row * config.cellHeight;
      const w = config.cellWidth * colSpan;
      const h = config.cellHeight * rowSpan;
      
      if (item.erasedCells && item.erasedCells.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        item.erasedCells.forEach(cell => {
          ctx.rect(
            cell.col * config.cellWidth,
            cell.row * config.cellHeight,
            config.cellWidth,
            config.cellHeight
          );
        });
        ctx.clip('evenodd');
      }

      if (fitMode === 'fit') {
        const scale = Math.min(w / item.image.width, h / item.image.height);
        const drawWidth = item.image.width * scale;
        const drawHeight = item.image.height * scale;
        const offsetX = (w - drawWidth) / 2;
        const offsetY = (h - drawHeight) / 2;
        ctx.drawImage(item.image, x + offsetX, y + offsetY, drawWidth, drawHeight);
      } else {
        ctx.drawImage(item.image, x, y, w, h);
      }

      if (item.erasedCells && item.erasedCells.length > 0) {
        ctx.restore();
      }
    });

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= config.columns; i++) {
      ctx.moveTo(i * config.cellWidth, 0);
      ctx.lineTo(i * config.cellWidth, atlasHeight);
    }
    for (let i = 0; i <= config.rows; i++) {
      ctx.moveTo(0, i * config.cellHeight);
      ctx.lineTo(atlasWidth, i * config.cellHeight);
    }
    ctx.stroke();

    // Draw hover or selection
    if (dragStart && dragEnd) {
      const minCol = Math.min(dragStart.col, dragEnd.col);
      const maxCol = Math.max(dragStart.col, dragEnd.col);
      const minRow = Math.min(dragStart.row, dragEnd.row);
      const maxRow = Math.max(dragStart.row, dragEnd.row);
      
      const w = (maxCol - minCol + 1) * config.cellWidth;
      const h = (maxRow - minRow + 1) * config.cellHeight;

      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fillRect(minCol * config.cellWidth, minRow * config.cellHeight, w, h);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.strokeRect(minCol * config.cellWidth, minRow * config.cellHeight, w, h);
    } else if (hoverCell) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(
        hoverCell.col * config.cellWidth,
        hoverCell.row * config.cellHeight,
        config.cellWidth,
        config.cellHeight
      );
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.strokeRect(
        hoverCell.col * config.cellWidth,
        hoverCell.row * config.cellHeight,
        config.cellWidth,
        config.cellHeight
      );
    }
  }, [config, items, hoverCell, dragStart, dragEnd, atlasWidth, atlasHeight, canvasRef, fitMode, renderMode]);

  const getCellFromEvent = (e: React.MouseEvent | React.DragEvent | React.PointerEvent) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    const x = (clientX - pan.x) / scale;
    const y = (clientY - pan.y) / scale;
    
    const col = Math.floor(x / config.cellWidth);
    const row = Math.floor(y / config.cellHeight);

    if (col >= 0 && col < config.columns && row >= 0 && row < config.rows) {
      return { col, row };
    }
    return null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const cell = getCellFromEvent(e);
    setHoverCell(cell);
  };

  const handleDragLeave = () => {
    setHoverCell(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setHoverCell(null);
    const cell = getCellFromEvent(e);
    if (!cell) return;

    const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      onDropImage(files, cell.col, cell.row);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    activePointers.current.add(e.pointerId);

    if (tool === 'pan' || e.button === 1 || activePointers.current.size > 1) {
      setIsPanning(true);
      lastPointer.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const cell = getCellFromEvent(e);
    if (!cell) return;
    setDragStart(cell);
    setDragEnd(cell);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && lastPointer.current) {
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastPointer.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (tool === 'pan' || e.buttons === 4 || activePointers.current.size > 1) return;

    const cell = getCellFromEvent(e);
    setHoverCell(cell);
    if (dragStart && cell) {
      setDragEnd(cell);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (isPanning) {
      if (activePointers.current.size === 0) {
        setIsPanning(false);
        lastPointer.current = null;
      }
      return;
    }

    if (dragStart && dragEnd && activePointers.current.size === 0) {
      const minCol = Math.min(dragStart.col, dragEnd.col);
      const maxCol = Math.max(dragStart.col, dragEnd.col);
      const minRow = Math.min(dragStart.row, dragEnd.row);
      const maxRow = Math.max(dragStart.row, dragEnd.row);
      
      onAreaSelect(minCol, minRow, maxCol - minCol + 1, maxRow - minRow + 1, e.shiftKey);
    }
    setDragStart(null);
    setDragEnd(null);
  };

  const handleZoomIn = () => {
    setScale(s => {
      const newScale = Math.min(s * 1.2, 10);
      if (!containerRef.current) return newScale;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      setPan(p => {
        const targetX = (centerX - p.x) / s;
        const targetY = (centerY - p.y) / s;
        return {
          x: centerX - targetX * newScale,
          y: centerY - targetY * newScale
        };
      });
      return newScale;
    });
  };

  const handleZoomOut = () => {
    setScale(s => {
      const newScale = Math.max(s / 1.2, 0.1);
      if (!containerRef.current) return newScale;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      setPan(p => {
        const targetX = (centerX - p.x) / s;
        const targetY = (centerY - p.y) / s;
        return {
          x: centerX - targetX * newScale,
          y: centerY - targetY * newScale
        };
      });
      return newScale;
    });
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-hidden bg-neutral-950 touch-none relative"
    >
      <div 
        style={{ 
          width: atlasWidth, 
          height: atlasHeight,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)'
        }}
        className="absolute top-0 left-0 will-change-transform"
      >
        <canvas
          ref={canvasRef}
          width={atlasWidth}
          height={atlasHeight}
          style={{ 
            width: '100%', 
            height: '100%',
            imageRendering: renderMode === 'pixelated' ? 'pixelated' : 'auto'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            setHoverCell(null);
            setDragStart(null);
            setDragEnd(null);
            setIsPanning(false);
            lastPointer.current = null;
            activePointers.current.clear();
          }}
          className={`touch-none ${tool === 'pan' || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
        />
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center bg-neutral-900 border border-neutral-800 rounded shadow-lg overflow-hidden z-10">
        <button onClick={handleZoomOut} className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white" title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button onClick={centerView} className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-mono w-14 text-center" title="Reset View">
          {Math.round(scale * 100)}%
        </button>
        <button onClick={handleZoomIn} className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white" title="Zoom In">
          <ZoomIn size={16} />
        </button>
      </div>
    </div>
  );
}
