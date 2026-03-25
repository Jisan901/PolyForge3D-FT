import React, { useState, useRef, useEffect } from 'react';
import { THREE } from '@/Core/lib/THREE';
import { Move, RotateCw, Maximize, Minus, Plus, Square as SquareIcon, Magnet, Upload, Hand, MousePointer2 } from 'lucide-react';
import { drawUvGraph } from './drawUtils';
import { useEditor } from './EditorContext';

export function UVGraph() {
  const { geometry, setGeometry, selectedVertices, setSelectedVertices, activeTool, setActiveTool, selectionMode, setUvVersion, selectedTexture, setSelectedTexture, selectedObject } = useEditor();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{startU: number, startV: number, currentU: number, currentV: number} | null>(null);
  const [canvasSize, setCanvasSize] = useState(400);
  const [hoveredGizmo, setHoveredGizmo] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [snapAmount, setSnapAmount] = useState(0.1);
  const [snapAngleDeg, setSnapAngleDeg] = useState(15);
  const [transformState, setTransformState] = useState<{
    axis: string;
    startU: number;
    startV: number;
    centerU: number;
    centerV: number;
    initialUVs: { idx: number; u: number; v: number }[];
  } | null>(null);
  
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const uvCanvasRef = useRef<HTMLCanvasElement>(null);

  // Drawing logic for the UV Canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Calculate the maximum square size that fits, minus some padding
        const size = Math.min(width, height) - 64; 
        setCanvasSize(Math.max(100, size));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (uvCanvasRef.current) {
      drawUvGraph(
        uvCanvasRef.current,
        zoom,
        pan,
        selectionMode,
        selectedVertices,
        selectionBox,
        geometry,
        activeTool,
        hoveredGizmo,
        selectedTexture
      );
    }
  }, [selectionMode, zoom, pan, selectedVertices, selectionBox, geometry, activeTool, hoveredGizmo, selectedTexture]);

  const getUvCoords = (clientX: number, clientY: number) => {
    if (!uvCanvasRef.current) return { u: 0, v: 0 };
    const rect = uvCanvasRef.current.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    
    const scaleX = 800 / rect.width;
    const scaleY = 800 / rect.height;
    const cx = sx * scaleX;
    const cy = sy * scaleY;

    const w = 800;
    const h = 800;

    const x = (cx - w/2 - pan.x) / zoom + w/2;
    const y = (cy - h/2 - pan.y) / zoom + h/2;

    const u = x / w;
    const v = 1 - (y / h);
    return { u, v };
  };

  const getSelectionCenter = () => {
    if (!geometry || selectedVertices.size === 0) return null;
    let sumU = 0, sumV = 0;
    selectedVertices.forEach(idx => {
      sumU += geometry.uvs[idx * 2];
      sumV += geometry.uvs[idx * 2 + 1];
    });
    return { u: sumU / selectedVertices.size, v: sumV / selectedVertices.size };
  };

  const getGizmoHit = (clientX: number, clientY: number) => {
    const center = getSelectionCenter();
    if (!center || !['move', 'rotate', 'scale'].includes(activeTool)) return null;

    if (!uvCanvasRef.current) return null;
    const rect = uvCanvasRef.current.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    
    const scaleX = 800 / rect.width;
    const scaleY = 800 / rect.height;
    const cx_screen = sx * scaleX;
    const cy_screen = sy * scaleY;

    const w = 800;
    const h = 800;

    const x = (cx_screen - w/2 - pan.x) / zoom + w/2;
    const y = (cy_screen - h/2 - pan.y) / zoom + h/2;

    const cx = center.u * w;
    const cy = (1 - center.v) * h;

    const dx = x - cx;
    const dy = y - cy;

    const armLength = 60 / zoom;
    const hitTolerance = 30 / zoom; // Touch friendly hit area

    if (activeTool === 'move' || activeTool === 'scale') {
      if (Math.abs(dx) < hitTolerance && Math.abs(dy) < hitTolerance) return 'xy';
      if (dx > 0 && dx < armLength + hitTolerance && Math.abs(dy) < hitTolerance) return 'x';
      if (dy < 0 && dy > -armLength - hitTolerance && Math.abs(dx) < hitTolerance) return 'y';
    } else if (activeTool === 'rotate') {
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dist - armLength) < hitTolerance) return 'rot';
    }
    return null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = 1.1;
      const newZoom = delta > 0 ? zoom * factor : zoom / factor;
      setZoom(Math.max(0.1, Math.min(10, newZoom)));
    } else {
      if (!uvCanvasRef.current) return;
      const rect = uvCanvasRef.current.getBoundingClientRect();
      const scaleX = 800 / rect.width;
      const scaleY = 800 / rect.height;
      setPan(prev => ({
        x: prev.x - e.deltaX * scaleX,
        y: prev.y - e.deltaY * scaleY
      }));
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target !== uvCanvasRef.current) return; // Prevent UI clicks from interacting with canvas

    if (e.button === 1 || (e.button === 0 && (e.altKey || activeTool === 'pan'))) {
      setIsPanning(true);
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (e.button === 0) {
      const hit = getGizmoHit(e.clientX, e.clientY);
      if (hit && geometry) {
        const { u, v } = getUvCoords(e.clientX, e.clientY);
        const center = getSelectionCenter()!;
        const initialUVs = Array.from(selectedVertices).map((idx: number) => ({
          idx, u: geometry.uvs[idx * 2], v: geometry.uvs[idx * 2 + 1]
        }));
        setTransformState({
          axis: hit, startU: u, startV: v, centerU: center.u, centerV: center.v, initialUVs
        });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else if (activeTool === 'select') {
        const { u, v } = getUvCoords(e.clientX, e.clientY);
        setSelectionBox({ startU: u, startV: v, currentU: u, currentV: v });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      if (!uvCanvasRef.current) return;
      const rect = uvCanvasRef.current.getBoundingClientRect();
      const scaleX = 800 / rect.width;
      const scaleY = 800 / rect.height;
      const dx = (e.clientX - lastPointerPos.current.x) * scaleX;
      const dy = (e.clientY - lastPointerPos.current.y) * scaleY;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
    } else if (transformState && geometry && setGeometry) {
      const { u, v } = getUvCoords(e.clientX, e.clientY);
      const { axis, startU, startV, centerU, centerV, initialUVs } = transformState;
      
      const newGeometry = { ...geometry, uvs: [...geometry.uvs] };
      
      if (activeTool === 'move') {
        let du = axis.includes('x') ? u - startU : 0;
        let dv = axis.includes('y') ? v - startV : 0;
        
        if (snapToGrid && snapAmount > 0) {
          const snappedCenterU = Math.round((centerU + du) / snapAmount) * snapAmount;
          const snappedCenterV = Math.round((centerV + dv) / snapAmount) * snapAmount;
          du = snappedCenterU - centerU;
          dv = snappedCenterV - centerV;
        }
        
        initialUVs.forEach(init => {
          newGeometry.uvs[init.idx * 2] = init.u + du;
          newGeometry.uvs[init.idx * 2 + 1] = init.v + dv;
        });
      } else if (activeTool === 'scale') {
        const du = u - startU;
        const dv = v - startV;
        const scaleX = axis.includes('x') ? 1 + du * 2 : 1;
        const scaleY = axis.includes('y') ? 1 + dv * 2 : 1;
        const scaleXY = axis === 'xy' ? 1 + (du + dv) * 2 : 1;
        
        let sx = axis === 'xy' ? scaleXY : scaleX;
        let sy = axis === 'xy' ? scaleXY : scaleY;
        
        if (snapToGrid && snapAmount > 0) {
          sx = Math.round(sx / snapAmount) * snapAmount;
          sy = Math.round(sy / snapAmount) * snapAmount;
        }
        
        initialUVs.forEach(init => {
          newGeometry.uvs[init.idx * 2] = centerU + (init.u - centerU) * sx;
          newGeometry.uvs[init.idx * 2 + 1] = centerV + (init.v - centerV) * sy;
        });
      } else if (activeTool === 'rotate') {
        const startAngle = Math.atan2(startV - centerV, startU - centerU);
        const currentAngle = Math.atan2(v - centerV, u - centerU);
        let angle = currentAngle - startAngle;
        
        if (snapToGrid && snapAngleDeg > 0) {
          const snapAngleRad = (snapAngleDeg * Math.PI) / 180;
          angle = Math.round(angle / snapAngleRad) * snapAngleRad;
        }
        
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        initialUVs.forEach(init => {
          const dx = init.u - centerU;
          const dy = init.v - centerV;
          newGeometry.uvs[init.idx * 2] = centerU + dx * cos - dy * sin;
          newGeometry.uvs[init.idx * 2 + 1] = centerV + dx * sin + dy * cos;
        });
      }
      
      setGeometry(newGeometry);
      setUvVersion(v => v + 1);
    } else if (selectionBox) {
      const { u, v } = getUvCoords(e.clientX, e.clientY);
      setSelectionBox(prev => prev ? { ...prev, currentU: u, currentV: v } : null);
    } else {
      const hit = getGizmoHit(e.clientX, e.clientY);
      setHoveredGizmo(hit);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } else if (transformState) {
      setTransformState(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } else if (selectionBox) {
      const { startU, startV, currentU, currentV } = selectionBox;
      // Touch friendly click threshold (scales with zoom)
      const isClick = Math.abs(startU - currentU) < 0.02 / zoom && Math.abs(startV - currentV) < 0.02 / zoom;
      
      const newSelection = new Set(e.shiftKey ? selectedVertices : []);
      
      if (isClick) {
        let closestIdx = -1;
        let minDist = 0.08 / zoom; // Touch friendly selection radius
        if (geometry) {
          for (let idx = 0; idx < geometry.uvs.length / 2; idx++) {
            const u = geometry.uvs[idx * 2];
            const v = geometry.uvs[idx * 2 + 1];
            const dist = Math.hypot(u - currentU, v - currentV);
            if (dist < minDist) {
              minDist = dist;
              closestIdx = idx;
            }
          }
        }
        if (closestIdx !== -1) {
          newSelection.add(closestIdx);
        }
      } else {
        // Touch friendly selection box padding (scales with zoom)
        const padding = 0.02 / zoom;
        const minU = Math.min(startU, currentU) - padding;
        const maxU = Math.max(startU, currentU) + padding;
        const minV = Math.min(startV, currentV) - padding;
        const maxV = Math.max(startV, currentV) + padding;
        
        if (geometry) {
          for (let idx = 0; idx < geometry.uvs.length / 2; idx++) {
            const u = geometry.uvs[idx * 2];
            const v = geometry.uvs[idx * 2 + 1];
            if (u >= minU && u <= maxU && v >= minV && v <= maxV) {
              newSelection.add(idx);
            }
          }
        }
      }
      
      setSelectedVertices(newSelection);
      setSelectionBox(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const handleManualTranslate = (axis: 'u' | 'v', newValue: number) => {
    if (isNaN(newValue) || !geometry || selectedVertices.size === 0 || !setGeometry) return;
    
    const center = getSelectionCenter();
    if (!center) return;

    const delta = newValue - (axis === 'u' ? center.u : center.v);
    
    const newGeometry = { ...geometry, uvs: [...geometry.uvs] };
    
    selectedVertices.forEach(idx => {
      const u = newGeometry.uvs[idx * 2];
      const v = newGeometry.uvs[idx * 2 + 1];
      newGeometry.uvs[idx * 2] = axis === 'u' ? u + delta : u;
      newGeometry.uvs[idx * 2 + 1] = axis === 'v' ? v + delta : v;
    });
    
    setGeometry(newGeometry);
    setUvVersion(v => v + 1);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const selectionCenter = getSelectionCenter();

  const handleTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;
        setSelectedTexture(texture);
        
        // Also apply to the selected object if it exists
        if (selectedObject && selectedObject.material) {
          const mat = Array.isArray(selectedObject.material) ? selectedObject.material[0] : selectedObject.material;
          if ('map' in mat) {
            (mat as any).map = texture;
            (mat as any).needsUpdate = true;
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-[#1a1a1a] relative overflow-hidden flex items-center justify-center group touch-none"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Transformation Tools Menu */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1 bg-[#2d2d2d]/80 backdrop-blur-sm p-1 rounded-md border border-[#444] shadow-lg">
        <ToolButton 
          active={activeTool === 'select'} 
          onClick={() => setActiveTool('select')} 
          icon={<MousePointer2 size={14} />} 
          title="Select" 
        />
        <ToolButton 
          active={activeTool === 'pan'} 
          onClick={() => setActiveTool('pan')} 
          icon={<Hand size={14} />} 
          title="Pan" 
        />
        <ToolButton 
          active={activeTool === 'move'} 
          onClick={() => setActiveTool('move')} 
          icon={<Move size={14} />} 
          title="Move (G)" 
        />
        <ToolButton 
          active={activeTool === 'rotate'} 
          onClick={() => setActiveTool('rotate')} 
          icon={<RotateCw size={14} />} 
          title="Rotate (R)" 
        />
        <ToolButton 
          active={activeTool === 'scale'} 
          onClick={() => setActiveTool('scale')} 
          icon={<Maximize size={14} />} 
          title="Scale (S)" 
        />
        <div className="h-[1px] bg-[#444] my-1" />
        <ToolButton 
          active={snapToGrid} 
          onClick={() => setSnapToGrid(!snapToGrid)} 
          icon={<Magnet size={14} />} 
          title="Snap to Grid" 
        />
      </div>

      {/* Snap Settings Panel */}
      {snapToGrid && (
        <div className="absolute left-12 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-0.5 bg-[#2d2d2d]/90 backdrop-blur-sm p-1 rounded border border-[#444] shadow-lg font-mono text-[9px] text-[#ccc] w-24 ml-2">
          <div className="font-semibold text-white mb-0.5 border-b border-[#555] pb-0.5">Snap Settings</div>
          <div className="flex items-center justify-between">
            <span title="Grid snap amount">Grid:</span>
            <input 
              type="number" 
              step="0.01"
              min="0.001"
              value={snapAmount}
              onChange={(e) => setSnapAmount(parseFloat(e.target.value) || 0)}
              className="w-10 bg-[#1a1a1a] border border-[#555] rounded px-0.5 py-0 text-right focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <span title="Angle snap in degrees">Angle:</span>
            <input 
              type="number" 
              step="1"
              min="1"
              value={snapAngleDeg}
              onChange={(e) => setSnapAngleDeg(parseFloat(e.target.value) || 0)}
              className="w-10 bg-[#1a1a1a] border border-[#555] rounded px-0.5 py-0 text-right focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Zoom Controls Overlay */}
      <div className="absolute right-2 top-2 z-20 flex items-center gap-1 bg-[#2d2d2d]/80 backdrop-blur-sm p-1 rounded-md border border-[#444] shadow-lg">
        <label className="p-1 hover:bg-[#444] rounded text-[#ccc] cursor-pointer" title="Upload Texture">
          <Upload size={14} />
          <input type="file" accept="image/*" className="hidden" onChange={handleTextureUpload} />
        </label>
        <div className="w-[1px] h-4 bg-[#555] mx-1" />
        <button 
          onClick={() => setSelectedVertices(new Set())}
          className="px-2 py-1 hover:bg-[#444] rounded text-[#ccc] text-[10px] font-medium uppercase tracking-wider border border-[#444] mr-2"
          title="Deselect All"
        >
          Deselect
        </button>
        <button 
          onClick={() => setZoom(prev => Math.max(0.1, prev / 1.2))}
          className="p-1 hover:bg-[#444] rounded text-[#ccc]"
          title="Zoom Out"
        >
          <Minus size={14} />
        </button>
        <span className="text-[10px] text-[#888] min-w-[32px] text-center font-mono">
          {Math.round(zoom * 100)}%
        </span>
        <button 
          onClick={() => setZoom(prev => Math.min(10, prev * 1.2))}
          className="p-1 hover:bg-[#444] rounded text-[#ccc]"
          title="Zoom In"
        >
          <Plus size={14} />
        </button>
        <button 
          onClick={resetView}
          className="p-1 hover:bg-[#444] rounded text-[#ccc]"
          title="Reset View"
        >
          <SquareIcon size={14} />
        </button>
      </div>

      {/* UV Canvas Area */}
      <div 
        className="relative z-10 border-2 border-[#555] bg-[#222] shadow-2xl overflow-hidden"
        style={{ width: canvasSize, height: canvasSize }}
      >
        <canvas
          ref={uvCanvasRef}
          width={800}
          height={800}
          className="w-full h-full touch-none"
          style={{
            cursor: isPanning ? 'grabbing' : 'crosshair'
          }}
        />
      </div>
      
      {/* Overlay Info */}
      <div className="absolute bottom-4 left-4 text-[10px] text-[#888] font-mono select-none flex gap-4 z-20">
        <span>UV Space (0,1)</span>
        <span className="opacity-50">|</span>
        <span>Tool: {activeTool.toUpperCase()}</span>
        <span className="opacity-50">|</span>
        <span>Mode: {selectionMode.toUpperCase()}</span>
        <span className="opacity-50">|</span>
        <span>Pan: {Math.round(pan.x)}, {Math.round(pan.y)}</span>
      </div>

      {/* Manual Transform Panel */}
      {selectedVertices.size > 0 && selectionCenter && (
        <div className="absolute bottom-12 left-4 z-20 flex flex-col gap-0.5 bg-[#2d2d2d]/90 backdrop-blur-sm p-1 rounded border border-[#444] shadow-lg font-mono text-[9px] text-[#ccc] w-28">
          <div className="font-semibold text-white mb-0.5 border-b border-[#555] pb-0.5">Transform Center</div>
          
          <div className="flex items-center justify-between">
            <span>U:</span>
            <input 
              type="number" 
              step="0.01"
              value={Number(selectionCenter.u.toFixed(3))}
              onChange={(e) => handleManualTranslate('u', parseFloat(e.target.value))}
              className="w-14 bg-[#1a1a1a] border border-[#555] rounded px-0.5 py-0 text-right focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <span>V:</span>
            <input 
              type="number" 
              step="0.01"
              value={Number(selectionCenter.v.toFixed(3))}
              onChange={(e) => handleManualTranslate('v', parseFloat(e.target.value))}
              className="w-14 bg-[#1a1a1a] border border-[#555] rounded px-0.5 py-0 text-right focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ToolButton({ active, onClick, icon, title }: { active: boolean, onClick: () => void, icon: React.ReactNode, title: string }) {
  return (
    <button 
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-blue-600 text-white' : 'text-[#b3b3b3] hover:bg-[#444] hover:text-white'}`}
    >
      {icon}
    </button>
  );
}

