import { THREE } from '@/Core/lib/THREE';
import { GeometryData } from './EditorContext';

export function drawGizmo(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  zoom: number,
  tool: 'move' | 'rotate' | 'scale',
  centerU: number,
  centerV: number,
  hoveredAxis: string | null
) {
  const cx = centerU * w;
  const cy = (1 - centerV) * h;
  const armLength = 60 / zoom;
  const handleSize = 12 / zoom;

  ctx.save();
  ctx.translate(cx, cy);

  if (tool === 'move') {
    // X Axis (Red)
    ctx.strokeStyle = hoveredAxis === 'x' ? '#ffaaaa' : '#ff4444';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2 / zoom;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(armLength, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(armLength, -handleSize/2); ctx.lineTo(armLength + handleSize, 0); ctx.lineTo(armLength, handleSize/2); ctx.fill();

    // Y Axis (Green)
    ctx.strokeStyle = hoveredAxis === 'y' ? '#aaffaa' : '#44aa44';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -armLength); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-handleSize/2, -armLength); ctx.lineTo(0, -armLength - handleSize); ctx.lineTo(handleSize/2, -armLength); ctx.fill();

    // Center (Blue)
    ctx.fillStyle = hoveredAxis === 'xy' ? '#ffffff' : '#4444ff';
    ctx.fillRect(-handleSize/2, -handleSize/2, handleSize, handleSize);
  } else if (tool === 'scale') {
    // X Axis
    ctx.strokeStyle = hoveredAxis === 'x' ? '#ffaaaa' : '#ff4444';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2 / zoom;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(armLength, 0); ctx.stroke();
    ctx.fillRect(armLength - handleSize/2, -handleSize/2, handleSize, handleSize);

    // Y Axis
    ctx.strokeStyle = hoveredAxis === 'y' ? '#aaffaa' : '#44aa44';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -armLength); ctx.stroke();
    ctx.fillRect(-handleSize/2, -armLength - handleSize/2, handleSize, handleSize);

    // Center
    ctx.strokeStyle = hoveredAxis === 'xy' ? '#ffffff' : '#4444ff';
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(-handleSize, -handleSize, handleSize*2, handleSize*2);
  } else if (tool === 'rotate') {
    ctx.strokeStyle = hoveredAxis === 'rot' ? '#ffffff' : '#44aaee';
    ctx.lineWidth = 2 / zoom;
    ctx.beginPath();
    ctx.arc(0, 0, armLength, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawUvGraph(
  canvas: HTMLCanvasElement,
  zoom: number,
  pan: { x: number, y: number },
  selectionMode: 'vertex' | 'face',
  selectedVertices: Set<number>,
  selectionBox: { startU: number, startV: number, currentU: number, currentV: number } | null,
  geometry: GeometryData | null,
  activeTool: string,
  hoveredGizmo: string | null,
  selectedTexture: THREE.Texture | null
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Clear canvas
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, w, h);

  // Save context and apply transformations
  ctx.save();

  // Apply pan (translate to center, then offset)
  ctx.translate(w / 2, h / 2);
  ctx.translate(pan.x, pan.y);
  ctx.scale(zoom, zoom);
  ctx.translate(-w / 2, -h / 2);

  // Draw texture if available
  if (selectedTexture && selectedTexture.image) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    if (selectedTexture.flipY === false) {
      ctx.translate(0, h);
      ctx.scale(1, -1);
    }
    ctx.drawImage(selectedTexture.image as CanvasImageSource, 0, 0, w, h);
    ctx.restore();
  }

  // Draw grid
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2 / zoom;
  for (let i = 0; i <= 10; i++) {
    const pos = (i / 10) * w;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(w, pos);
    ctx.stroke();
  }

  if (geometry) {
    // Draw UV coordinates
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3 / zoom;

    const { indices, uvs } = geometry;

    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i];
      const i2 = indices[i + 1];
      const i3 = indices[i + 2];

      const u1 = uvs[i1 * 2], v1 = uvs[i1 * 2 + 1];
      const u2 = uvs[i2 * 2], v2 = uvs[i2 * 2 + 1];
      const u3 = uvs[i3 * 2], v3 = uvs[i3 * 2 + 1];

      if (u1 !== undefined && u2 !== undefined && u3 !== undefined) {
        ctx.beginPath();
        ctx.moveTo(u1 * w, (1 - v1) * h);
        ctx.lineTo(u2 * w, (1 - v2) * h);
        ctx.lineTo(u3 * w, (1 - v3) * h);
        ctx.closePath();
        ctx.stroke();
        
        if (selectionMode === 'face') {
          ctx.fillStyle = 'rgba(74, 222, 128, 0.1)';
          ctx.fill();
        }
      }
    }

    // Draw vertices
    for (let idx = 0; idx < uvs.length / 2; idx++) {
      const u = uvs[idx * 2];
      const v = uvs[idx * 2 + 1];
      const isSelected = selectedVertices && selectedVertices.has(idx);
      const isVertexMode = selectionMode === 'vertex';
      
      ctx.fillStyle = isSelected ? '#ef4444' : (isVertexMode ? '#fff' : '#888');
      ctx.beginPath();
      const radius = (isSelected ? 5 : (isVertexMode ? 4 : 2)) / zoom;
      ctx.arc(u * w, (1 - v) * h, radius, 0, Math.PI * 2);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();
      }
    }

    // Draw Gizmo
    if (selectedVertices.size > 0 && ['move', 'rotate', 'scale'].includes(activeTool)) {
      let sumU = 0, sumV = 0;
      selectedVertices.forEach(idx => {
        sumU += uvs[idx * 2];
        sumV += uvs[idx * 2 + 1];
      });
      const cu = sumU / selectedVertices.size;
      const cv = sumV / selectedVertices.size;
      drawGizmo(ctx, w, h, zoom, activeTool as any, cu, cv, hoveredGizmo);
    }
  }

  // Draw selection box
  if (selectionBox) {
    const { startU, startV, currentU, currentV } = selectionBox;
    
    const x1 = startU * w;
    const y1 = (1 - startV) * h;
    const x2 = currentU * w;
    const y2 = (1 - currentV) * h;
    
    const boxX = Math.min(x1, x2);
    const boxY = Math.min(y1, y2);
    const boxW = Math.abs(x2 - x1);
    const boxH = Math.abs(y2 - y1);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.setLineDash([]);
  }

  // Restore context
  ctx.restore();
}
