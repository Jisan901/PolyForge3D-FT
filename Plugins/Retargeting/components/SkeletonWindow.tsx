import React, { useMemo, useRef, useState } from 'react';

// Standard Mixamo bone hierarchy and their approximate 2D coordinates
const BONES = [
  { id: 'mixamorigHeadTop_End', x: 100, y: 15, parent: 'mixamorigHead' },
  { id: 'mixamorigHead', x: 100, y: 35, parent: 'mixamorigNeck' },
  { id: 'mixamorigNeck', x: 100, y: 60, parent: 'mixamorigSpine2' },
  { id: 'mixamorigSpine2', x: 100, y: 90, parent: 'mixamorigSpine1' },
  { id: 'mixamorigSpine1', x: 100, y: 130, parent: 'mixamorigSpine' },
  { id: 'mixamorigSpine', x: 100, y: 170, parent: 'mixamorigHips' },
  { id: 'mixamorigHips', x: 100, y: 210, parent: null },

  // Left Arm (Anatomical Left, Screen Right)
  { id: 'mixamorigLeftShoulder', x: 125, y: 80, parent: 'mixamorigSpine2' },
  { id: 'mixamorigLeftArm', x: 145, y: 95, parent: 'mixamorigLeftShoulder' },
  { id: 'mixamorigLeftForeArm', x: 160, y: 150, parent: 'mixamorigLeftArm' },
  { id: 'mixamorigLeftHand', x: 175, y: 210, parent: 'mixamorigLeftForeArm' },

  // Right Arm (Anatomical Right, Screen Left)
  { id: 'mixamorigRightShoulder', x: 75, y: 80, parent: 'mixamorigSpine2' },
  { id: 'mixamorigRightArm', x: 55, y: 95, parent: 'mixamorigRightShoulder' },
  { id: 'mixamorigRightForeArm', x: 40, y: 150, parent: 'mixamorigRightArm' },
  { id: 'mixamorigRightHand', x: 25, y: 210, parent: 'mixamorigRightForeArm' },

  // Left Leg (Anatomical Left, Screen Right)
  { id: 'mixamorigLeftUpLeg', x: 115, y: 220, parent: 'mixamorigHips' },
  { id: 'mixamorigLeftLeg', x: 125, y: 290, parent: 'mixamorigLeftUpLeg' },
  { id: 'mixamorigLeftFoot', x: 130, y: 360, parent: 'mixamorigLeftLeg' },
  { id: 'mixamorigLeftToeBase', x: 135, y: 385, parent: 'mixamorigLeftFoot' },

  // Right Leg (Anatomical Right, Screen Left)
  { id: 'mixamorigRightUpLeg', x: 85, y: 220, parent: 'mixamorigHips' },
  { id: 'mixamorigRightLeg', x: 75, y: 290, parent: 'mixamorigRightUpLeg' },
  { id: 'mixamorigRightFoot', x: 70, y: 360, parent: 'mixamorigRightLeg' },
  { id: 'mixamorigRightToeBase', x: 65, y: 385, parent: 'mixamorigRightFoot' },
];

// Helper to find bone coordinates
const getBoneCoords = (id: string) => BONES.find((b) => b.id === id);

interface SkeletonWindowProps {
  skeleton?: any; // Three.js Object3D / Bone
  selected?: string[];
  setSelected?: (boneNames: string[]) => void;
}

export default function SkeletonWindow({
  skeleton,
  selected = [],
  setSelected = () => {},
}: SkeletonWindowProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectionBox, setSelectionBox] = useState<{startX: number, startY: number, endX: number, endY: number} | null>(null);

  // If a skeleton object is provided, we can optionally filter out bones that don't exist in it.
  const existingBones = useMemo(() => {
    if (!skeleton || typeof skeleton.traverse !== 'function') return null;
    const names = new Set<string>();
    skeleton.traverse((child: any) => {
      if (child.type === 'Bone' || child.isBone) {
        names.add(child.name);
      }
    });
    return names;
  }, [skeleton]);

  const getSvgPoint = (e: React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only handle primary button (left click) or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {
      // Ignore if capture fails
    }

    const pt = getSvgPoint(e);
    setSelectionBox({ startX: pt.x, startY: pt.y, endX: pt.x, endY: pt.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!selectionBox) return;
    const pt = getSvgPoint(e);
    setSelectionBox(prev => prev ? { ...prev, endX: pt.x, endY: pt.y } : null);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!selectionBox) return;
    
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore if release fails
    }
    
    const minX = Math.min(selectionBox.startX, selectionBox.endX);
    const maxX = Math.max(selectionBox.startX, selectionBox.endX);
    const minY = Math.min(selectionBox.startY, selectionBox.endY);
    const maxY = Math.max(selectionBox.startY, selectionBox.endY);
    
    const isDrag = Math.abs(maxX - minX) > 2 || Math.abs(maxY - minY) > 2;
    
    if (isDrag) {
      const newlySelected = BONES.filter(b => {
        if (existingBones && !existingBones.has(b.id)) return false;
        return b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY;
      }).map(b => b.id);
      
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        setSelected(Array.from(new Set([...selected, ...newlySelected])));
      } else {
        setSelected(newlySelected);
      }
    } else {
      // It was just a click/tap on the background
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setSelected([]);
      }
    }
    setSelectionBox(null);
  };

  const handleBoneClick = (e: React.PointerEvent, boneId: string) => {
    e.stopPropagation(); // Prevent triggering SVG background click
    
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selected.includes(boneId)) {
        setSelected(selected.filter(id => id !== boneId));
      } else {
        setSelected([...selected, boneId]);
      }
    } else {
      // On touch devices, tapping an already selected bone will deselect it (toggle behavior)
      // since users don't have a shift key to easily deselect.
      if (e.pointerType === 'touch' && selected.includes(boneId) && selected.length === 1) {
        setSelected([]);
      } else {
        setSelected([boneId]);
      }
    }
  };

  // Sort bones so the selected ones render last (on top)
  const sortedBones = useMemo(() => {
    return [...BONES].sort((a, b) => {
      const aSel = selected.includes(a.id);
      const bSel = selected.includes(b.id);
      return aSel === bSel ? 0 : aSel ? 1 : -1;
    });
  }, [selected]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[#1e1e1e] rounded-xl border border-neutral-800 shadow-2xl w-full max-w-sm mx-auto select-none">
      <div className="relative w-full aspect-[1/2] max-w-[250px]">
        <svg
          ref={svgRef}
          viewBox="0 0 200 400"
          // touch-none prevents the browser from scrolling/zooming when dragging on the SVG
          className="w-full h-full drop-shadow-md cursor-crosshair touch-none"
          xmlns="http://www.w3.org/2000/svg"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Body Silhouette */}
          <path
            d="
              M 100 10 
              C 115 10, 120 35, 110 50 
              L 140 70 L 155 90 L 170 150 L 185 210 L 175 230 L 165 210 L 150 150 L 135 100 
              L 135 210 L 140 290 L 145 360 L 150 390 L 120 390 L 115 360 L 100 240 
              L 85 360 L 80 390 L 50 390 L 55 360 L 60 290 L 65 210 
              L 65 100 L 50 150 L 35 210 L 25 230 L 15 210 L 30 150 L 45 90 L 60 70 
              L 90 50 
              C 80 35, 85 10, 100 10 
              Z
            "
            fill="rgba(34, 197, 94, 0.15)"
            stroke="#22c55e"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Bone Connections (Lines) */}
          {BONES.map((bone) => {
            if (!bone.parent) return null;
            const parent = getBoneCoords(bone.parent);
            if (!parent) return null;

            const isMissing = existingBones && !existingBones.has(bone.id);

            return (
              <line
                key={`line-${bone.id}`}
                x1={bone.x}
                y1={bone.y}
                x2={parent.x}
                y2={parent.y}
                stroke="#22c55e"
                strokeWidth="2"
                opacity={isMissing ? 0.1 : 0.4}
              />
            );
          })}

          {/* Bone Joints (Nodes) */}
          {sortedBones.map((bone) => {
            const isSelected = selected.includes(bone.id);
            const isMissing = existingBones && !existingBones.has(bone.id);

            return (
              <g
                key={`node-${bone.id}`}
                transform={`translate(${bone.x}, ${bone.y})`}
                className={`transition-all duration-200 ${
                  isMissing ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer hover:scale-110'
                }`}
                onPointerDown={(e) => {
                  if (!isMissing) handleBoneClick(e, bone.id);
                }}
              >
                <title>{bone.id}</title>
                
                {/* Outer Ring */}
                <circle
                  r={isSelected ? "10" : "7"}
                  fill={isSelected ? "rgba(96, 165, 250, 0.2)" : "transparent"}
                  stroke={isSelected ? "#60a5fa" : "#22c55e"}
                  strokeWidth={isSelected ? "2.5" : "1.5"}
                  strokeDasharray={isSelected ? "none" : "2 2"}
                  className="transition-all duration-300"
                />
                
                {/* Inner Dot */}
                <circle
                  r="2.5"
                  fill={isSelected ? "#60a5fa" : "#22c55e"}
                  className="transition-colors duration-300"
                />
              </g>
            );
          })}

          {/* Selection Box */}
          {selectionBox && (
            <rect
              x={Math.min(selectionBox.startX, selectionBox.endX)}
              y={Math.min(selectionBox.startY, selectionBox.endY)}
              width={Math.abs(selectionBox.endX - selectionBox.startX)}
              height={Math.abs(selectionBox.endY - selectionBox.startY)}
              fill="rgba(96, 165, 250, 0.2)"
              stroke="#60a5fa"
              strokeWidth="1"
              strokeDasharray="4 4"
              pointerEvents="none"
            />
          )}
        </svg>
      </div>
      
      {/* Display currently selected bone names */}
      <div className="mt-4 h-6 text-sm font-mono text-neutral-400 text-center w-full truncate px-2" title={selected.join(', ')}>
        {selected.length === 0 ? 'Select bones' : selected.length === 1 ? selected[0] : `${selected.length} bones selected`}
      </div>
    </div>
  );
}
