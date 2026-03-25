import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, RefreshCw, SlidersHorizontal, Image as ImageIcon, Layers, Palette, ChevronDown, ChevronRight, Eraser, Hand, ZoomIn, ZoomOut, Maximize, Expand } from 'lucide-react';

import { Editor } from "@/Editor/Editor";

const editor = Editor;


interface Point { x: number, y: number }
interface Path {
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  mask: string;
  falloff: number;
  isEraser?: boolean;
}

const getPattern = (ctx: CanvasRenderingContext2D, type: string, color: string) => {
  if (type === 'solid') return color;
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 16;
  pCanvas.height = 16;
  const pCtx = pCanvas.getContext('2d');
  if (!pCtx) return color;

  pCtx.fillStyle = color;
  if (type === 'checkerboard') {
    pCtx.fillRect(0, 0, 8, 8);
    pCtx.fillRect(8, 8, 8, 8);
  } else if (type === 'dots') {
    pCtx.beginPath();
    pCtx.arc(8, 8, 4, 0, Math.PI * 2);
    pCtx.fill();
  } else if (type === 'stripes') {
    pCtx.fillRect(0, 0, 16, 4);
    pCtx.fillRect(0, 8, 16, 4);
  } else if (type === 'grid') {
    pCtx.fillRect(0, 0, 16, 2);
    pCtx.fillRect(0, 0, 2, 16);
  } else if (type === 'noise') {
    for (let x = 0; x < 16; x+=2) {
      for (let y = 0; y < 16; y+=2) {
        if ((x * 37 + y * 13) % 5 === 0 || (x * 17 + y * 23) % 7 === 0) {
          pCtx.fillRect(x, y, 2, 2);
        }
      }
    }
  }
  return ctx.createPattern(pCanvas, 'repeat') || color;
};

export const TextureEditor: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [selectedTexture, setSelectedTexture] = useState<any>(null);
  
  // Adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [hue, setHue] = useState(0);
  
  // Brush Settings
  const [isPaintingMode, setIsPaintingMode] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [isPanMode, setIsPanMode] = useState(true);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(5);
  const [brushFalloff, setBrushFalloff] = useState(0);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushMask, setBrushMask] = useState('solid');
  
  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<Path | null>(null);

  // Viewport State
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialPinchScale, setInitialPinchScale] = useState<number>(1);

  // UI State
  const [showAdjustments, setShowAdjustments] = useState(true);
  const [showBrush, setShowBrush] = useState(true);
  const [showResize, setShowResize] = useState(false);

  // Resize State
  const [resizeWidth, setResizeWidth] = useState<number | ''>('');
  const [resizeHeight, setResizeHeight] = useState<number | ''>('');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setBlur(0);
        setHue(0);
        setPaths([]);
      };
      reader.readAsDataURL(file);
    }
  };
  
  
  useEffect(() => {
        return editor.api.buses.selectionUpdate.subscribe((target) => {
            setSelectedTexture(null)
            setImageSrc(null)
            if(target.isTexture){
                setSelectedTexture(target)
                setImageSrc(target.image instanceof HTMLImageElement? (target?.image.src as string): target.image.toDataURL());
                setBrightness(100);
                setContrast(100);
                setSaturation(100);
                setBlur(0);
                setHue(0);
                setPaths([]);
            }
        });
    }, []);
  
  
  
  
  useEffect(() => {
    imageRef.current = null;
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setResizeWidth(img.width);
        setResizeHeight(img.height);
        drawAll();
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) {
      setResizeWidth('');
      return;
    }
    setResizeWidth(val);
    if (maintainAspectRatio && imageRef.current) {
      const ratio = imageRef.current.height / imageRef.current.width;
      setResizeHeight(Math.round(val * ratio));
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) {
      setResizeHeight('');
      return;
    }
    setResizeHeight(val);
    if (maintainAspectRatio && imageRef.current) {
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
      
      const scaledPaths = paths.map(path => ({
        ...path,
        points: path.points.map(p => ({ x: p.x * scaleX, y: p.y * scaleY })),
        size: path.size * Math.max(scaleX, scaleY)
      }));
      
      setPaths(scaledPaths);
      setImageSrc(newSrc);
    }
  };

  useEffect(() => {
    if (imageRef.current) drawAll();
  }, [brightness, contrast, saturation, blur, hue, paths]);

  const drawAll = () => {
    if(!imageSrc) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (canvas && ctx && img) {
      canvas.width = img.width;
      canvas.height = img.height;

      // Apply filters and draw image
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) hue-rotate(${hue}deg)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';

      // Draw all saved paths
      paths.forEach(path => {
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
      
      if(selectedTexture?.isTexture){
          selectedTexture.image.src = canvas.toDataURL();
          selectedTexture.image.height = canvas.height;
          selectedTexture.image.width = canvas.width;
          console.log(selectedTexture)
          selectedTexture.needsUpdate = true
      }
    }
  };

  const getCoordinates = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
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
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!imageSrc) return;

    // Handle touch pinch/pan
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

    // Handle middle click (button 1) or Pan Mode
    if (('button' in e && e.button === 1) || isPanMode || ('touches' in e && e.touches.length === 1 && isPanMode)) {
      setIsPanning(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setLastPanPoint({ x: clientX, y: clientY });
      return;
    }

    if (!isPaintingMode) return;

    // Check if the click was actually on the canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      const coords = getCoordinates(e);
      if (!coords) return;

      setIsDrawing(true);
      const newPath: Path = {
        points: [coords],
        color: brushColor,
        size: brushSize,
        opacity: brushOpacity,
        mask: brushMask,
        falloff: brushFalloff,
        isEraser
      };
      setCurrentPath(newPath);
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!imageSrc) return;

    if (isPanning && lastPanPoint) {
      if ('touches' in e && e.touches.length >= 2 && initialPinchDistance !== null) {
        // Handle pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        const newScale = Math.max(0.1, Math.min(10, initialPinchScale * (dist / initialPinchDistance)));
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
          
          setOffset(prev => ({ 
            x: prev.x * ratio + relX * (1 - ratio) + dx, 
            y: prev.y * ratio + relY * (1 - ratio) + dy 
          }));
        }
        
        setScale(newScale);
        setLastPanPoint({ x: midX, y: midY });
        return;
      }

      // Single pointer pan (mouse or touch)
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - lastPanPoint.x;
      const dy = clientY - lastPanPoint.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPoint({ x: clientX, y: clientY });
      return;
    }

    if (!isDrawing || !isPaintingMode || !currentPath) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    const newPoints = [...currentPath.points, coords];
    setCurrentPath({ ...currentPath, points: newPoints });

    // Draw just the new segment for performance
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.globalCompositeOperation = currentPath.isEraser ? 'destination-out' : 'source-over';
      ctx.strokeStyle = currentPath.isEraser ? '#000' : getPattern(ctx, currentPath.mask, brushColor);
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = brushOpacity / 100;
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
    if (isDrawing && isPaintingMode && currentPath) {
      setIsDrawing(false);
      setPaths([...paths, currentPath]);
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
      
      setOffset(prev => ({
        x: prev.x * ratio + relX * (1 - ratio),
        y: prev.y * ratio + relY * (1 - ratio)
      }));
    }
    
    setScale(newScale);
  };

  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setHue(0);
    setPaths([]);
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

  return (
    <div className="flex h-full w-full bg-[#1e1e1e] text-editor-text font-sans overflow-hidden">
      {/* Left Sidebar - Tools & Filters */}
      <div className="w-52 border-r border-editor-border bg-editor-panel flex flex-col flex-shrink-0 overflow-y-auto">
        
        {/* Adjustments Panel */}
        <div className="border-b border-editor-border">
          <button 
            className="w-full p-2 flex items-center justify-between hover:bg-white/5 transition-colors"
            onClick={() => setShowAdjustments(!showAdjustments)}
          >
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal size={12} className="text-editor-textDim" />
              <h3 className="text-[10px] font-semibold text-white uppercase tracking-wider">Adjustments</h3>
            </div>
            {showAdjustments ? <ChevronDown size={12} className="text-editor-textDim" /> : <ChevronRight size={12} className="text-editor-textDim" />}
          </button>
          
          {showAdjustments && (
            <div className="p-3 flex flex-col gap-3 bg-[#1a1a1a]">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-editor-textDim">Brightness</span>
                  <span className="text-white">{brightness}%</span>
                </div>
                <input 
                  type="range" min="0" max="200" value={brightness} 
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-editor-textDim">Contrast</span>
                  <span className="text-white">{contrast}%</span>
                </div>
                <input 
                  type="range" min="0" max="200" value={contrast} 
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-editor-textDim">Saturation</span>
                  <span className="text-white">{saturation}%</span>
                </div>
                <input 
                  type="range" min="0" max="200" value={saturation} 
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-editor-textDim">Hue</span>
                  <span className="text-white">{hue}°</span>
                </div>
                <input 
                  type="range" min="0" max="360" value={hue} 
                  onChange={(e) => setHue(Number(e.target.value))}
                  className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-editor-textDim">Blur</span>
                  <span className="text-white">{blur}px</span>
                </div>
                <input 
                  type="range" min="0" max="20" value={blur} 
                  onChange={(e) => setBlur(Number(e.target.value))}
                  className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Brush Panel */}
        <div className="border-b border-editor-border">
          <button 
            className="w-full p-2 flex items-center justify-between hover:bg-white/5 transition-colors"
            onClick={() => setShowBrush(!showBrush)}
          >
            <div className="flex items-center gap-1.5">
              <Palette size={12} className="text-editor-textDim" />
              <h3 className="text-[10px] font-semibold text-white uppercase tracking-wider">Brush</h3>
            </div>
            {showBrush ? <ChevronDown size={12} className="text-editor-textDim" /> : <ChevronRight size={12} className="text-editor-textDim" />}
          </button>
          
          {showBrush && (
            <div className="p-3 flex flex-col gap-3 bg-[#1a1a1a]">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-editor-textDim">Color</span>
                </div>
                <input 
                  type="color" value={brushColor} 
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-full h-6 bg-transparent rounded cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-editor-textDim">Size</span>
                  <span className="text-white">{brushSize}px</span>
                </div>
                <input 
                  type="range" min="1" max="100" value={brushSize} 
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-editor-textDim">Falloff</span>
                  <span className="text-white">{brushFalloff}px</span>
                </div>
                <input 
                  type="range" min="0" max="50" value={brushFalloff} 
                  onChange={(e) => setBrushFalloff(Number(e.target.value))}
                  className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-editor-textDim">Opacity</span>
                  <span className="text-white">{brushOpacity}%</span>
                </div>
                <input 
                  type="range" min="1" max="100" value={brushOpacity} 
                  onChange={(e) => setBrushOpacity(Number(e.target.value))}
                  className="w-full h-1 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-editor-textDim">Mask</span>
                </div>
                <select 
                  value={brushMask} 
                  onChange={(e) => setBrushMask(e.target.value)}
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

        {/* Resize Panel */}
        <div className="border-b border-editor-border">
          <button 
            className="w-full p-2 flex items-center justify-between hover:bg-white/5 transition-colors"
            onClick={() => setShowResize(!showResize)}
          >
            <div className="flex items-center gap-1.5">
              <Maximize size={12} className="text-editor-textDim" />
              <h3 className="text-[10px] font-semibold text-white uppercase tracking-wider">Resize</h3>
            </div>
            {showResize ? <ChevronDown size={12} className="text-editor-textDim" /> : <ChevronRight size={12} className="text-editor-textDim" />}
          </button>
          
          {showResize && (
            <div className="p-3 flex flex-col gap-3 bg-[#1a1a1a]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[10px] text-editor-textDim">Width</span>
                  <input 
                    type="number" 
                    value={resizeWidth} 
                    onChange={handleWidthChange}
                    className="w-full bg-editor-input border border-editor-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-editor-accent text-white"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[10px] text-editor-textDim">Height</span>
                  <input 
                    type="number" 
                    value={resizeHeight} 
                    onChange={handleHeightChange}
                    className="w-full bg-editor-input border border-editor-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-editor-accent text-white"
                  />
                </div>
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={maintainAspectRatio} 
                  onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                  className="w-3 h-3 bg-editor-input border border-editor-border rounded focus:outline-none focus:border-editor-accent accent-editor-accent"
                />
                <span className="text-[10px] text-editor-textDim">Maintain Aspect Ratio</span>
              </label>
              
              <button 
                onClick={handleApplyResize}
                disabled={!imageSrc || !resizeWidth || !resizeHeight}
                className="w-full py-1 bg-editor-accent hover:bg-editor-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded text-[10px] text-white transition-colors"
              >
                Apply Resize
              </button>
            </div>
          )}
        </div>

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
        {/* Toolbar */}
        <div className="h-7 border-b border-editor-border bg-editor-panel flex items-center px-2 gap-1.5 shrink-0">
          <label className="flex items-center gap-1 px-1.5 py-0.5 bg-[#2a2a2a] hover:bg-[#333] border border-editor-border rounded text-[10px] text-white cursor-pointer transition-colors">
            <Upload size={10} />
            <span>Load</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          <div className="w-px h-3 bg-editor-border mx-0.5"></div>
          <button 
            onClick={() => {
              setIsPanMode(true);
              setIsPaintingMode(false);
            }}
            className={`p-1 rounded transition-colors ${isPanMode ? 'bg-editor-accent text-white' : 'text-editor-textDim hover:text-white hover:bg-white/10'}`} 
            title="Pan Tool"
          >
            <Hand size={12} />
          </button>
          <button 
            onClick={() => {
              if (isPaintingMode && !isEraser) setIsPaintingMode(false);
              else { setIsPaintingMode(true); setIsPanMode(false); setIsEraser(false); }
            }}
            className={`p-1 rounded transition-colors ${isPaintingMode && !isEraser ? 'bg-editor-accent text-white' : 'text-editor-textDim hover:text-white hover:bg-white/10'}`} 
            title="Brush Tool"
          >
            <Palette size={12} />
          </button>
          <button 
            onClick={() => {
              if (isPaintingMode && isEraser) setIsPaintingMode(false);
              else { setIsPaintingMode(true); setIsPanMode(false); setIsEraser(true); }
            }}
            className={`p-1 rounded transition-colors ${isPaintingMode && isEraser ? 'bg-editor-accent text-white' : 'text-editor-textDim hover:text-white hover:bg-white/10'}`} 
            title="Eraser Tool"
          >
            <Eraser size={12} />
          </button>
          
          <div className="w-px h-3 bg-editor-border mx-0.5"></div>
          
          <button 
            onClick={() => setScale(s => Math.min(10, s * 1.2))}
            className="p-1 rounded text-editor-textDim hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={12} />
          </button>
          <div className="text-[10px] text-editor-textDim w-8 text-center">
            {Math.round(scale * 100)}%
          </div>
          <button 
            onClick={() => setScale(s => Math.max(0.1, s / 1.2))}
            className="p-1 rounded text-editor-textDim hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={12} />
          </button>
          <button 
            onClick={() => { setScale(1); setOffset({x: 0, y: 0}); }}
            className="p-1 rounded text-editor-textDim hover:text-white hover:bg-white/10 transition-colors"
            title="Reset View"
          >
            <Expand size={12} />
          </button>
        </div>

        {/* Canvas Container */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden flex items-center justify-center p-4 checkerboard-bg relative touch-none"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onTouchCancel={handlePointerUp}
        >
          {!imageSrc ? (
            <div className="flex flex-col items-center justify-center text-editor-textDim">
              <ImageIcon size={32} className="mb-2 opacity-20" />
              <p className="text-xs font-medium text-white mb-0.5">No Texture Loaded</p>
              <p className="text-[10px]">Click "Load" to start editing</p>
            </div>
          ) : (
            <div 
              className="relative shadow-2xl border border-editor-border/50 flex items-center justify-center"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: 'center',
                transition: isPanning ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <canvas 
                ref={canvasRef} 
                className={`max-w-full max-h-full object-contain ${isPanMode ? 'cursor-grab' : isPaintingMode ? 'cursor-crosshair' : 'cursor-default'} ${isPanning && isPanMode ? 'cursor-grabbing' : ''}`}
                style={{ 
                  backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQAK9CGVG3UW0AAAAABJRU5ErkJggg==")'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextureEditor;
