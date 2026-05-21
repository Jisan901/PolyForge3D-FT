import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '../hooks/useThree';
import { MousePointer2, ListPlus, Focus, MousePointerClick, Hand, ZoomIn } from 'lucide-react';

interface SkeletonWindow3DProps {
  skeletonObject?: THREE.Object3D | null;
  selected?: string[];
  setSelected?: (boneNames: string[]) => void;
}

export default function SkeletonWindow3D({
  skeletonObject,
  selected = [],
  setSelected = () => {},
}: SkeletonWindow3DProps) {
  const { scene, camera, orbit, canvas } = useThree();
  const [selectMode, setSelectMode] = useState<'single' | 'multi'>('single');
  
  const bonesRef = useRef<THREE.Bone[]>([]);
  const boneMeshesRef = useRef<Map<string, THREE.Sprite>>(new Map());
  const linesRef = useRef<THREE.LineSegments | null>(null);
  const pointerDownPos = useRef<{x: number, y: number} | null>(null);

  const resetCamera = useCallback(() => {
    if (!skeletonObject || !camera || !orbit) return;

    const box = new THREE.Box3().setFromObject(skeletonObject);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 100;
    
    camera.near = maxDim * 0.01;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();

    orbit.minDistance = maxDim * 0.1;
    orbit.maxDistance = maxDim * 10;
    orbit.target.copy(center);
    
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5;
    camera.position.set(center.x, center.y, center.z + cameraZ);
    orbit.update();
  }, [skeletonObject, camera, orbit]);

  useEffect(() => {
    resetCamera();
  }, [resetCamera]);

  useEffect(() => {
    if (!skeletonObject) return;

    const boneMeshes = new Map<string, THREE.Sprite>();
    const bones: THREE.Bone[] = [];
    
    const lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({ color: 0x525252, transparent: true, opacity: 0.8, depthTest: false });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    lines.frustumCulled = false;
    scene.add(lines);
    linesRef.current = lines;

    // Create circular texture for sprites
    const canvasTexture = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      if (context) {
        // Outer ring
        context.beginPath();
        context.arc(32, 32, 30, 0, 2 * Math.PI);
        context.fillStyle = '#ffffff';
        context.fill();
        
        // Inner core
        context.beginPath();
        context.arc(32, 32, 20, 0, 2 * Math.PI);
        context.fillStyle = '#d4d4d4';
        context.fill();
      }
      return new THREE.CanvasTexture(canvas);
    })();

    scene.add(skeletonObject);
    
    // Add 3D Helpers (Grid and Axes)
    const box = new THREE.Box3().setFromObject(skeletonObject);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 100;

    const gridHelper = new THREE.GridHelper(maxDim * 2, 20, 0x444444, 0x222222);
    gridHelper.position.y = box.min.y;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(maxDim * 0.5);
    axesHelper.position.y = box.min.y;
    scene.add(axesHelper);
    
    skeletonObject.traverse((child) => {
      child.frustumCulled = false;
      if ((child as THREE.Bone).isBone) {
        const bone = child as THREE.Bone;
        bones.push(bone);
        
        const mat = new THREE.SpriteMaterial({ 
          map: canvasTexture,
          color: 0xa3a3a3, 
          depthTest: false,
          transparent: true,
          opacity: 0.9
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(5, 5, 1); // Fixed big sprite for better selection
        sprite.userData.boneId = bone.name;
        sprite.frustumCulled = false;
        scene.add(sprite);
        boneMeshes.set(bone.name, sprite);
      }
    });
    
    const numLines = bones.filter(b => b.parent && (b.parent as THREE.Bone).isBone).length;
    const positions = new Float32Array(numLines * 6);
    lines.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    bonesRef.current = bones;
    boneMeshesRef.current = boneMeshes;

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      if (bonesRef.current.length > 0 && linesRef.current?.geometry.attributes.position) {
        const positions = linesRef.current.geometry.attributes.position.array as Float32Array;
        let i = 0;
        
        bonesRef.current.forEach(bone => {
          const sprite = boneMeshesRef.current.get(bone.name);
          if (sprite) {
            bone.getWorldPosition(sprite.position);
          }
          
          if (bone.parent && (bone.parent as THREE.Bone).isBone) {
            const parentPos = new THREE.Vector3();
            bone.parent.getWorldPosition(parentPos);
            const childPos = new THREE.Vector3();
            bone.getWorldPosition(childPos);
            
            positions[i++] = parentPos.x;
            positions[i++] = parentPos.y;
            positions[i++] = parentPos.z;
            positions[i++] = childPos.x;
            positions[i++] = childPos.y;
            positions[i++] = childPos.z;
          }
        });
        
        linesRef.current.geometry.attributes.position.needsUpdate = true;
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      scene.remove(lines);
      lines.geometry.dispose();
      lines.material.dispose();
      
      scene.remove(gridHelper);
      gridHelper.geometry.dispose();
      (gridHelper.material as THREE.Material).dispose();
      
      scene.remove(axesHelper);
      axesHelper.geometry.dispose();
      (axesHelper.material as THREE.Material).dispose();
      
      scene.remove(skeletonObject);
      
      boneMeshes.forEach(sprite => {
        scene.remove(sprite);
        (sprite.material as THREE.Material).dispose();
      });
      canvasTexture.dispose();
    };
  }, [scene, skeletonObject]);

  // Update colors based on selection
  useEffect(() => {
    boneMeshesRef.current.forEach((sprite, boneName) => {
      const mat = sprite.material as THREE.SpriteMaterial;
      if (selected.includes(boneName)) {
        mat.color.setHex(0x3b82f6); // Blue-500
        sprite.scale.set(8, 8, 1);
      } else {
        mat.color.setHex(0xa3a3a3); // Neutral-400
        sprite.scale.set(5, 5, 1);
      }
    });
  }, [selected]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!pointerDownPos.current) return;

    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    pointerDownPos.current = null;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) return; // It was a drag

    const rect = canvas.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(Array.from(boneMeshesRef.current.values()));
    
    if (intersects.length > 0) {
      const clickedBone = intersects[0].object.userData.boneId;
      
      if (selectMode === 'multi') {
        if (selected.includes(clickedBone)) {
          setSelected(selected.filter(id => id !== clickedBone));
        } else {
          setSelected([...selected, clickedBone]);
        }
      } else {
        // single select mode
        if (selected.includes(clickedBone) && selected.length === 1) {
          setSelected([]);
        } else {
          setSelected([clickedBone]);
        }
      }
    } else {
      if (selectMode === 'single') {
        setSelected([]);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-1 bg-[#1e1e1e] rounded-md border border-neutral-800 shadow-2xl w-full h-full select-none">
      <div 
        className="relative w-full h-full bg-neutral-900 rounded overflow-hidden touch-none"
        ref={canvas}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/* Instructions Overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 text-[10px] text-neutral-300 pointer-events-none bg-neutral-950/60 backdrop-blur-md p-2 rounded-md border border-neutral-800/80 shadow-xl">
          <div className="flex items-center gap-1.5">
            <MousePointerClick size={12} className="text-blue-400" />
            <span>Click to Select</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hand size={12} className="text-green-400" />
            <span>Drag to Rotate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ZoomIn size={12} className="text-purple-400" />
            <span>Scroll to Zoom</span>
          </div>
        </div>

        {/* Selection Mode Switch & Reset Camera */}
        <div className="absolute top-1 right-1 flex bg-neutral-950/80 rounded p-0.5 border border-neutral-800 backdrop-blur-sm pointer-events-auto gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); resetCamera(); }}
            className="p-1 rounded-sm transition-colors text-neutral-400 hover:text-white hover:bg-neutral-800"
            title="Reset Camera"
          >
            <Focus size={14} />
          </button>
          <div className="w-px bg-neutral-800 mx-0.5" />
          <button
            onClick={(e) => { e.stopPropagation(); setSelectMode('single'); }}
            className={`p-1 rounded-sm transition-colors ${selectMode === 'single' ? 'bg-blue-500 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
            title="Single Select"
          >
            <MousePointer2 size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectMode('multi'); }}
            className={`p-1 rounded-sm transition-colors ${selectMode === 'multi' ? 'bg-blue-500 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
            title="Multi Select"
          >
            <ListPlus size={14} />
          </button>
        </div>
      </div>
      
      {/* Display currently selected bone names */}
      <div className="mt-1 h-4 text-[10px] font-mono text-neutral-400 text-center w-full truncate px-1" title={selected.join(', ')}>
        {selected.length === 0 ? 'Select bones' : selected.length === 1 ? selected[0] : `${selected.length} bones selected`}
      </div>
    </div>
  );
}
