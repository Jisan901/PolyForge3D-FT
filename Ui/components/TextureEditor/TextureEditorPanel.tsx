import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { Editor } from '@/Editor/Editor';
import {
  Point,
  Path,
  TextureAdjustments,
  BrushSettings,
  EditorTool,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_BRUSH,
} from './types';
import { getPattern } from './patternUtils';
import { extractImageSource, updateTexturePixels } from './textureSyncUtils';
import { AdjustmentsPanel } from './AdjustmentsPanel';
import { BrushPanel } from './BrushPanel';
import { ResizePanel } from './ResizePanel';
import { TextureToolbar } from './TextureToolbar';
import { TextureCanvasViewport } from './TextureCanvasViewport';

const editor = Editor;

export const TextureEditorPanel: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [selectedTexture, setSelectedTexture] = useState<any>(null);

  // Adjustments State
  const [adjustments, setAdjustments] = useState<TextureAdjustments>(DEFAULT_ADJUSTMENTS);

  // Brush Settings State
  const [brush, setBrush] = useState<BrushSettings>(DEFAULT_BRUSH);
  const [activeTool, setActiveTool] = useState<EditorTool>('pan');

  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<Path | null>(null);

  // Viewport State
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialPinchScale, setInitialPinchScale] = useState<number>(1);

  // Accordion UI State
  const [showAdjustments, setShowAdjustments] = useState(true);
  const [showBrush, setShowBrush] = useState(true);
  const [showResize, setShowResize] = useState(false);

  // Resize State
  const [resizeWidth, setResizeWidth] = useState<number | ''>('');
  const [resizeHeight, setResizeHeight] = useState<number | ''>('');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isDirtyRef = useRef(false);

  // --------------------------------------------------------------------------
  // 1. Subscribe to Editor Selection (Textures)
  // --------------------------------------------------------------------------
  useEffect(() => {
    return editor.api.buses.selectionUpdate.subscribe((target) => {
      if (target && target.isTexture) {
        setSelectedTexture(target);
        isDirtyRef.current = false;

        setAdjustments(DEFAULT_ADJUSTMENTS);
        setPaths([]);
        setCurrentPath(null);

        const src = extractImageSource(target);
        if (src) {
          setImageSrc(src);
        }
      } else {
        setSelectedTexture(null);
        setImageSrc(null);
        isDirtyRef.current = false;
      }
    });
  }, []);

  // --------------------------------------------------------------------------
  // 2. Load Image when imageSrc changes
  // --------------------------------------------------------------------------
  useEffect(() => {
    imageRef.current = null;
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setResizeWidth(img.width);
        setResizeHeight(img.height);
        // Display image on canvas WITHOUT mutating or syncing to the Three.js texture!
        drawAll(false);
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  // --------------------------------------------------------------------------
  // 3. Canvas Rendering & Texture Sync
  // --------------------------------------------------------------------------
  const drawAll = useCallback(
    (syncToTexture = false) => {
      if (!imageRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const img = imageRef.current;
      if (!canvas || !ctx || !img) return;

      canvas.width = img.width;
      canvas.height = img.height;

      // COLOR PRESERVATION FIX:
      // Only apply CSS filter if values are non-default.
      // Setting ctx.filter = 'brightness(100%) ...' forces the browser canvas
      // through a color matrix pass that slightly alters colors and hue!
      const hasFilters =
        adjustments.brightness !== 100 ||
        adjustments.contrast !== 100 ||
        adjustments.saturation !== 100 ||
        adjustments.blur !== 0 ||
        adjustments.hue !== 0;

      if (hasFilters) {
        ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) blur(${adjustments.blur}px) hue-rotate(${adjustments.hue}deg)`;
      } else {
        ctx.filter = 'none';
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';

      // Draw all saved paths
      paths.forEach((path) => {
        if (path.points.length < 2) return;
        ctx.beginPath();
        ctx.globalCompositeOperation = path.isEraser ? 'destination-out' : 'source-over';
        ctx.strokeStyle = path.isEraser ? '#000' : getPattern(ctx, path.mask, path.color);
        ctx.lineWidth = path.size;
        ctx.globalAlpha = path.opacity / 100;
        ctx.filter = path.falloff > 0 ? `blur(${path.falloff}px)` : 'none';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
      });

      ctx.globalAlpha = 1.0;
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';

      // ALL-TEXTURES-BECOMING-C FIX:
      // Only sync back to the 3D texture when changes were actually made by the user,
      // and update using an independent snapshot rather than the shared live DOM canvas!
      if (syncToTexture && selectedTexture?.isTexture) {
        updateTexturePixels(selectedTexture, canvas);
      }
    },
    [adjustments, paths, selectedTexture]
  );

  // Re-draw when adjustments or paths change (and sync to texture if dirty)
  useEffect(() => {
    if (imageRef.current) {
      drawAll(isDirtyRef.current);
    }
  }, [drawAll]);

  // --------------------------------------------------------------------------
  // 4. Adjustments & Brush Change Handlers
  // --------------------------------------------------------------------------
  const handleAdjustmentChange = (key: keyof TextureAdjustments, val: number) => {
    isDirtyRef.current = true;
    setAdjustments((prev) => ({ ...prev, [key]: val }));
  };

  const handleBrushChange = (updates: Partial<BrushSettings>) => {
    setBrush((prev) => ({ ...prev, ...updates }));
  };

  // --------------------------------------------------------------------------
  // 5. Image Upload & File Handling
  // --------------------------------------------------------------------------
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        isDirtyRef.current = true;
        setImageSrc(event.target?.result as string);
        setAdjustments(DEFAULT_ADJUSTMENTS);
        setPaths([]);
      };
      reader.readAsDataURL(file);
    }
  };

  // --------------------------------------------------------------------------
  // 6. Resize Handlers
  // --------------------------------------------------------------------------
  const handleWidthChange = (val: number | '') => {
    setResizeWidth(val);
    if (maintainAspectRatio && imageRef.current && typeof val === 'number') {
      const ratio = imageRef.current.height / imageRef.current.width;
      setResizeHeight(Math.round(val * ratio));
    }
  };

  const handleHeightChange = (val: number | '') => {
    setResizeHeight(val);
    if (maintainAspectRatio && imageRef.current && typeof val === 'number') {
      const ratio = imageRef.current.width / imageRef.current.height;
      setResizeWidth(Math.round(val * ratio));
    }
  };

  const handleApplyResize = () => {
    if (!imageRef.current || !resizeWidth || !resizeHeight) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Number(resizeWidth);
    tempCanvas.height = Number(resizeHeight);
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      tempCtx.drawImage(imageRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
      const newSrc = tempCanvas.toDataURL('image/png');

      const scaleX = Number(resizeWidth) / imageRef.current.width;
      const scaleY = Number(resizeHeight) / imageRef.current.height;

      const scaledPaths = paths.map((path) => ({
        ...path,
        points: path.points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY })),
        size: path.size * Math.max(scaleX, scaleY),
      }));

      isDirtyRef.current = true;
      setPaths(scaledPaths);
      setImageSrc(newSrc);
    }
  };

  // --------------------------------------------------------------------------
  // 7. Reset & Export
  // --------------------------------------------------------------------------
  const handleReset = () => {
    isDirtyRef.current = true;
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setPaths([]);
    if (imageRef.current && canvasRef.current) {
      drawAll(true);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'edited-texture.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  // --------------------------------------------------------------------------
  // 8. Pointer / Canvas Interaction Handlers
  // --------------------------------------------------------------------------
  const getCoordinates = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    if (!imageSrc) return;

    // Handle touch pinch/pan (2 touches)
    if ('touches' in e && e.touches.length >= 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      setInitialPinchDistance(dist);
      setInitialPinchScale(scale);

      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;
      setLastPanPoint({ x: midX, y: midY });
      setIsPanning(true);
      setIsDrawing(false);
      return;
    }

    // Handle middle click or Pan tool
    const isMiddleClick = 'button' in e && e.button === 1;
    const isPanTool = activeTool === 'pan';
    const isSingleTouchPan = 'touches' in e && e.touches.length === 1 && isPanTool;

    if (isMiddleClick || isPanTool || isSingleTouchPan) {
      setIsPanning(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setLastPanPoint({ x: clientX, y: clientY });
      return;
    }

    if (activeTool !== 'brush' && activeTool !== 'eraser') return;

    // Drawing mode
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      const coords = getCoordinates(e);
      if (!coords) return;

      setIsDrawing(true);
      const newPath: Path = {
        points: [coords],
        color: brush.color,
        size: brush.size,
        opacity: brush.opacity,
        mask: brush.mask,
        falloff: brush.falloff,
        isEraser: activeTool === 'eraser',
      };
      setCurrentPath(newPath);
    }
  };

  const handlePointerMove = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    if (!imageSrc) return;

    // Pan / Pinch handling
    if (isPanning && lastPanPoint) {
      if ('touches' in e && e.touches.length >= 2 && initialPinchDistance !== null) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        const newScale = Math.max(
          0.1,
          Math.min(10, initialPinchScale * (dist / initialPinchDistance))
        );
        const ratio = newScale / scale;

        const midX = (touch1.clientX + touch2.clientX) / 2;
        const midY = (touch1.clientY + touch2.clientY) / 2;

        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const relX = midX - centerX;
          const relY = midY - centerY;

          const dx = midX - lastPanPoint.x;
          const dy = midY - lastPanPoint.y;

          setOffset((prev) => ({
            x: prev.x * ratio + relX * (1 - ratio) + dx,
            y: prev.y * ratio + relY * (1 - ratio) + dy,
          }));
        }

        setScale(newScale);
        setLastPanPoint({ x: midX, y: midY });
        return;
      }

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - lastPanPoint.x;
      const dy = clientY - lastPanPoint.y;
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPoint({ x: clientX, y: clientY });
      return;
    }

    // Brush stroke drawing
    if (!isDrawing || !currentPath) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    const newPoints = [...currentPath.points, coords];
    setCurrentPath({ ...currentPath, points: newPoints });

    // Draw segment onto canvas immediately for real-time 60fps feedback
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.globalCompositeOperation = currentPath.isEraser ? 'destination-out' : 'source-over';
      ctx.strokeStyle = currentPath.isEraser
        ? '#000'
        : getPattern(ctx, currentPath.mask, brush.color);
      ctx.lineWidth = brush.size;
      ctx.globalAlpha = brush.opacity / 100;
      ctx.filter = currentPath.falloff > 0 ? `blur(${currentPath.falloff}px)` : 'none';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const lastPoint = currentPath.points[currentPath.points.length - 1];
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      setInitialPinchDistance(null);
    }
    if (isDrawing && currentPath) {
      setIsDrawing(false);
      isDirtyRef.current = true;
      setPaths((prev) => [...prev, currentPath]);
      setCurrentPath(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!imageSrc) return;

    const zoomSensitivity = 0.001;
    const zoomFactor = 1 - e.deltaY * zoomSensitivity;
    const newScale = Math.max(0.1, Math.min(10, scale * zoomFactor));
    const ratio = newScale / scale;

    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const relX = mouseX - centerX;
      const relY = mouseY - centerY;

      setOffset((prev) => ({
        x: prev.x * ratio + relX * (1 - ratio),
        y: prev.y * ratio + relY * (1 - ratio),
      }));
    }

    setScale(newScale);
  };

  return (
    <div className="flex h-full w-full bg-[#1e1e1e] text-editor-text font-sans overflow-hidden">
      {/* Left Sidebar - Tools & Panels */}
      <div className="w-52 border-r border-editor-border bg-editor-panel flex flex-col flex-shrink-0 overflow-y-auto">
        <AdjustmentsPanel
          adjustments={adjustments}
          onChange={handleAdjustmentChange}
          isOpen={showAdjustments}
          onToggle={() => setShowAdjustments((v) => !v)}
        />

        <BrushPanel
          brush={brush}
          onChange={handleBrushChange}
          isOpen={showBrush}
          onToggle={() => setShowBrush((v) => !v)}
        />

        <ResizePanel
          width={resizeWidth}
          height={resizeHeight}
          maintainAspectRatio={maintainAspectRatio}
          onWidthChange={handleWidthChange}
          onHeightChange={handleHeightChange}
          onToggleMaintainAspectRatio={setMaintainAspectRatio}
          onApplyResize={handleApplyResize}
          disabled={!imageSrc}
          isOpen={showResize}
          onToggle={() => setShowResize((v) => !v)}
        />

        <div className="mt-auto p-2 border-t border-editor-border flex gap-1.5">
          <button
            onClick={handleReset}
            className="flex-1 py-1 bg-[#2a2a2a] hover:bg-[#333] border border-editor-border rounded text-[10px] text-white flex items-center justify-center gap-1 transition-colors"
          >
            <RefreshCw size={10} /> Reset
          </button>
          <button
            onClick={handleDownload}
            disabled={!imageSrc}
            className="flex-1 py-1 bg-editor-accent hover:bg-editor-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded text-[10px] text-white flex items-center justify-center gap-1 transition-colors"
          >
            <Download size={10} /> Export
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col bg-[#111] relative overflow-hidden">
        <TextureToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          scale={scale}
          onZoomIn={() => setScale((s) => Math.min(10, s * 1.2))}
          onZoomOut={() => setScale((s) => Math.max(0.1, s / 1.2))}
          onResetView={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
          onImageUpload={handleImageUpload}
        />

        <TextureCanvasViewport
          imageSrc={imageSrc}
          canvasRef={canvasRef}
          containerRef={containerRef}
          activeTool={activeTool}
          scale={scale}
          offset={offset}
          isPanning={isPanning}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>
    </div>
  );
};

export default TextureEditorPanel;
