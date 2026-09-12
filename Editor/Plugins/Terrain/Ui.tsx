import {
  globalInspector,
} from '@/Plugins/Inspector/lib/inspector';

import React, { useState, useRef } from 'react';
import { InspectorCategory } from '@/Plugins/Inspector/lib/inspector/components/InspectorPanel';
import { NumberInput } from '@/Plugins/Inspector/lib/inspector/components/NumberInput';
import { BooleanInput } from '@/Plugins/Inspector/lib/inspector/components/BooleanInput';
import { SliderInput } from '@/Plugins/Inspector/lib/inspector/components/SliderInput';
import { useInspector } from '@/Plugins/Inspector/lib/inspector/hooks/useInspector';
import { toast } from '@/Editor/Mutation';
import { Editor } from '@/Editor/Editor';
import { TerrainGenerationService } from './TerrainGenerationService';
import { TerrainChunkManager } from './TerrainChunkManager';

export const TerrainNode = ({ obj }: { obj?: any }) => {
  // If no object is passed, try to use a local state mock
  const [mockObj] = useState(() => obj || {
    width: 128,
    depth: 128,
    widthSegments: 64,
    depthSegments: 64,
    enableChunking: true,
    chunkSize: 32,
    minLod: 0,
    maxLod: 4,
    lodLevels: 4,
    maxDistance: 1000,
    maxHeight: 12,
    minHeight: -2,
    roughness: 0.8,
    seed: 12345,
    noiseOffsetX: 0,
    noiseOffsetZ: 0,
    enablePhysics: true,
    autoUpdate: true,
    paintMode: 'None',
    brushSize: 5,
    brushOpacity: 0.8,
    foliageType: 'Pine Tree',
    foliageDensity: 0.5,
    objectType: 'Rock Large',
    heightMapData: 'Perlin Noise',
  });

  const activeObj = obj || mockObj;
  if (activeObj.minLod === undefined) activeObj.minLod = 0;
  if (activeObj.maxLod === undefined) activeObj.maxLod = activeObj.lodLevels ? Math.max(0, activeObj.lodLevels - 1) : 4;
  if (activeObj.noiseOffsetX === undefined) activeObj.noiseOffsetX = 0;
  if (activeObj.noiseOffsetZ === undefined) activeObj.noiseOffsetZ = 0;
  if (activeObj.enablePhysics === undefined) activeObj.enablePhysics = true;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [textureFileName, setTextureFileName] = useState<string>('');

  // Hook up states with useInspector
  const [enableChunking] = useInspector<boolean>(activeObj, 'enableChunking');
  const [chunkSize] = useInspector<number>(activeObj, 'chunkSize');
  const [minLod] = useInspector<number>(activeObj, 'minLod');
  const [maxLod] = useInspector<number>(activeObj, 'maxLod');
  const [lodLevels] = useInspector<number>(activeObj, 'lodLevels');
  const [maxDistance] = useInspector<number>(activeObj, 'maxDistance');
  const [noiseOffsetX] = useInspector<number>(activeObj, 'noiseOffsetX');
  const [noiseOffsetZ] = useInspector<number>(activeObj, 'noiseOffsetZ');
  const [enablePhysics] = useInspector<boolean>(activeObj, 'enablePhysics');
  
  const [paintMode, setPaintMode] = useInspector<string>(activeObj, 'paintMode');
  const [brushSize] = useInspector<number>(activeObj, 'brushSize');
  const [brushOpacity] = useInspector<number>(activeObj, 'brushOpacity');
  const [foliageType, setFoliageType] = useInspector<string[]>(activeObj, 'foliageType');
  const [foliageDensity] = useInspector<number>(activeObj, 'foliageDensity');
  const [objectType, setObjectType] = useInspector<string[]>(activeObj, 'objectType');
  const [heightMapData, setHeightMapData] = useInspector<string>(activeObj, 'heightMapData');

  // Fallback to initialize if undefined
  const currentPaintMode = paintMode || 'None';
  const currentFoliageType = Array.isArray(foliageType) ? foliageType : [foliageType || 'Pine Tree'];
  const currentObjectType = Array.isArray(objectType) ? objectType : [objectType || 'Rock Large'];
  const currentHeightMapData = heightMapData || 'Perlin Noise';

  const toggleFoliage = (val: string) => {
    let newTypes = [...currentFoliageType];
    if (newTypes.includes(val)) {
      newTypes = newTypes.filter(t => t !== val);
    } else {
      newTypes.push(val);
    }
    setFoliageType(newTypes);
  };

  const toggleObject = (val: string) => {
    let newTypes = [...currentObjectType];
    if (newTypes.includes(val)) {
      newTypes = newTypes.filter(t => t !== val);
    } else {
      newTypes.push(val);
    }
    setObjectType(newTypes);
  };

  const handleTextureFileSelect = (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      toast('Please select a valid image file for heightmap');
      return;
    }
    setTextureFileName(file.name);
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        activeObj._textureData = imgData;
        toast(`Loaded heightmap: ${file.name} (${img.width}x${img.height})`);
      }
    };
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setProgressText('Initializing terrain generation...');
      toast('Starting terrain generation & LOD baking...');

      const curMinLod = Math.max(0, activeObj.minLod !== undefined ? Number(activeObj.minLod) : 0);
      const curMaxLod = Math.max(curMinLod, activeObj.maxLod !== undefined ? Number(activeObj.maxLod) : 4);
      const offX = activeObj.noiseOffsetX !== undefined ? Number(activeObj.noiseOffsetX) : 0;
      const offZ = activeObj.noiseOffsetZ !== undefined ? Number(activeObj.noiseOffsetZ) : 0;

      const result = await TerrainGenerationService.generate({
        width: Number(activeObj.width) || 128,
        depth: Number(activeObj.depth) || 128,
        chunkSize: Number(activeObj.chunkSize) || 32,
        minLod: curMinLod,
        maxLod: curMaxLod,
        lodLevels: curMaxLod - curMinLod + 1,
        noiseOffsetX: offX,
        noiseOffsetZ: offZ,
        maxDistance: Number(activeObj.maxDistance) || 1000,
        maxHeight: activeObj.maxHeight !== undefined ? Number(activeObj.maxHeight) : 12,
        minHeight: activeObj.minHeight !== undefined ? Number(activeObj.minHeight) : -2,
        roughness: activeObj.roughness !== undefined ? Number(activeObj.roughness) : 0.8,
        seed: activeObj.seed !== undefined ? Number(activeObj.seed) : 12345,
        heightMapType: currentHeightMapData,
        heightMapData: activeObj._textureData,
        outputDir: '/Game/files/Terrain',
        prefix: 'Terrain',
        onProgress: (progress, message) => {
          setProgressText(message);
        }
      });

      // Attach or update TerrainChunkManager in active scene
      const sceneManager = Editor?.core?.sceneManager;
      const scene = sceneManager?.activeScene;

      let manager: TerrainChunkManager | null = null;
      if (activeObj && activeObj.isTerrainChunkManager) {
        manager = activeObj as TerrainChunkManager;
      } else if (scene) {
        const existing = scene.getObjectByName('Terrain');
        if (existing && (existing as any).isTerrainChunkManager) {
          manager = existing as TerrainChunkManager;
        }
      }

      if (!manager) {
        manager = new TerrainChunkManager();
        if (scene) {
          Editor.addObject(scene, manager);
        }
      }

      manager.enablePhysics = activeObj.enablePhysics !== false;

      // Initialize chunk manager with newly baked geometries
      manager.initFromGenerated(result.manifest, result.geometries);

      toast(`Terrain generated! ${result.manifest.chunks.length} chunks baked with LOD range ${curMinLod}-${curMaxLod} (${result.manifest.lodLevels} levels).`);
    } catch (err: any) {
      console.error('[Terrain UI] Error during generation:', err);
      toast(`Generation failed: ${err?.message || err}`);
    } finally {
      setIsGenerating(false);
      setProgressText('');
    }
  };

  const paintModes = [
    { label: 'None', value: 'None', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Foliage', value: 'Paint Foliage', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
    { label: 'Object', value: 'Place Object', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  ];

  const heightMapTypes = [
    { label: 'All Combined (Final)', value: 'All Combined (Final Noise)', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
    { label: 'Voronoi Noise', value: 'Voronoi Noise', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { label: 'Ridged Mountains', value: 'Ridged Mountains', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { label: 'Hydraulic Erosion', value: 'Hydraulic Erosion', icon: 'M19 14l-7 7m0 0l-7-7m7 7V3' },
    { label: 'Billow Noise', value: 'Billow Noise', icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z' },
    { label: 'Domain Warp', value: 'Domain Warp', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
    { label: 'Perlin Noise', value: 'Perlin Noise', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { label: 'Simplex Noise', value: 'Simplex Noise', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
    { label: 'Texture Map', value: 'Texture Map', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Flat', value: 'Flat', icon: 'M20 12H4' },
  ];

  const foliageTypes = [
    { label: 'Pine Tree', value: 'Pine Tree', color: '#2E5A35', shape: 'border-l-transparent border-r-transparent border-b-[#2E5A35] border-l-[12px] border-r-[12px] border-b-[20px] w-0 h-0' },
    { label: 'Oak Tree', value: 'Oak Tree', color: '#4CAF50', shape: 'rounded-full bg-[#4CAF50] w-6 h-6' },
    { label: 'Bush', value: 'Bush', color: '#8BC34A', shape: 'rounded-full bg-[#8BC34A] w-6 h-4' },
    { label: 'Grass', value: 'Grass', color: '#C5E1A5', shape: 'border-b-[#C5E1A5] border-l-transparent border-r-transparent border-b-[20px] border-l-[4px] border-r-[4px] w-0 h-0' },
  ];

  const objectTypes = [
    { label: 'Rock Large', value: 'Rock Large', color: '#7f8c8d', shape: 'rounded-md bg-[#7f8c8d] w-6 h-5' },
    { label: 'Rock Small', value: 'Rock Small', color: '#bdc3c7', shape: 'rounded-sm bg-[#bdc3c7] w-4 h-3' },
    { label: 'Log', value: 'Log', color: '#8e44ad', shape: 'rounded-sm bg-[#8b4513] w-6 h-2' },
    { label: 'Mushroom', value: 'Mushroom', color: '#e74c3c', shape: 'rounded-t-full bg-[#e74c3c] w-5 h-4' },
  ];

  return (
    <div className="flex flex-col gap-1">
      <InspectorCategory title="Terrain Solver" defaultExpanded={true}>
        
        {/* Height Data Generator Grid */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
             <div className="text-xs font-semibold text-gray-400">Height Algorithm</div>
          </div>
          <div className="grid grid-cols-2 gap-1 mb-2">
            {heightMapTypes.map((type) => (
              <button
                 key={type.value}
                 onClick={() => setHeightMapData(type.value)}
                 className={`flex flex-col items-center justify-center p-2 rounded border text-[10px] transition-colors truncate ${
                   currentHeightMapData === type.value
                     ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-semibold'
                     : 'bg-[#252525] border-[#333] text-gray-400 hover:bg-[#333]'
                 }`}
                 title={type.label}
               >
                 <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={type.icon} />
                 </svg>
                 <span className="truncate w-full text-center">{type.label}</span>
               </button>
            ))}
          </div>
        </div>

        {/* Global Dimensions */}
        <div className="bg-[#1e1e1e] p-2 rounded border border-[#333] mb-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Dimensions</div>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="Width" obj={activeObj} prop="width" step={16} min={16} max={2048} />
            <NumberInput label="Depth" obj={activeObj} prop="depth" step={16} min={16} max={2048} />
          </div>
        </div>

        {/* Chunking & Discrete LODs */}
        <div className="bg-[#1e1e1e] p-2 rounded border border-[#333] mb-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2 flex items-center justify-between">
            <span>Chunking & Discrete LODs</span>
            <BooleanInput label="" obj={activeObj} prop="enableChunking" />
          </div>
          {activeObj.enableChunking !== false && (
             <div className="flex flex-col gap-2 mt-2">
                 <div className="grid grid-cols-2 gap-2">
                   <NumberInput label="Chunk Size" obj={activeObj} prop="chunkSize" step={16} min={16} max={128} />
                   <NumberInput label="Max Dist" obj={activeObj} prop="maxDistance" step={50} min={100} max={10000} />
                 </div>
                 <div className="pt-2 border-t border-[#333]">
                   <div className="text-[10px] text-gray-400 font-semibold mb-1 flex justify-between items-center">
                     <span>LOD Range</span>
                     <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 font-mono">
                       {`LOD ${activeObj.minLod ?? 0} → ${activeObj.maxLod ?? 4} (${Math.max(1, (activeObj.maxLod ?? 4) - (activeObj.minLod ?? 0) + 1)} levels)`}
                     </span>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <NumberInput label="Min LOD" obj={activeObj} prop="minLod" step={1} min={0} max={8} />
                     <NumberInput label="Max LOD" obj={activeObj} prop="maxLod" step={1} min={0} max={8} />
                   </div>
                 </div>
                 <div className="pt-2 border-t border-[#333] flex items-center justify-between">
                   <span className="text-[10px] text-gray-400 font-semibold">Physics (First LODs)</span>
                   <BooleanInput label="" obj={activeObj} prop="enablePhysics" />
                 </div>
             </div>
          )}
        </div>

        {/* Displacement Parameters */}
        <div className="bg-[#1e1e1e] p-2 rounded border border-[#333] mb-3">
           <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Displacement</div>
           <div className="grid grid-cols-2 gap-2 mb-2">
             <NumberInput label="Max Height" obj={activeObj} prop="maxHeight" step={1} />
             <NumberInput label="Min Height" obj={activeObj} prop="minHeight" step={1} />
           </div>

           {/* Noise Offset */}
           <div className="mb-2 pt-2 border-t border-[#333]">
             <div className="text-[10px] text-gray-400 font-semibold mb-1">Noise Offset</div>
             <div className="grid grid-cols-2 gap-2">
               <NumberInput label="Offset X" obj={activeObj} prop="noiseOffsetX" step={10} />
               <NumberInput label="Offset Z" obj={activeObj} prop="noiseOffsetZ" step={10} />
             </div>
           </div>
           
           {currentHeightMapData !== 'Texture Map' && currentHeightMapData !== 'Flat' && (
             <>
               <div className="mb-2">
                 <SliderInput label="Roughness" obj={activeObj} prop="roughness" min={0.1} max={2} step={0.05} />
               </div>
               <NumberInput label="Seed" obj={activeObj} prop="seed" step={1} />
             </>
           )}
           {currentHeightMapData === 'Texture Map' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleTextureFileSelect(file);
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleTextureFileSelect(file);
                  }}
                  className="mt-2 text-[10px] text-gray-400 p-4 border-2 border-dashed border-[#444] hover:border-blue-500 hover:text-gray-300 rounded-md text-center transition-colors cursor-pointer bg-[#252525] flex flex-col items-center justify-center gap-2"
                >
                   <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                   </svg>
                   <span>
                     {textureFileName ? (
                       <span className="text-blue-400 font-semibold">{textureFileName}</span>
                     ) : (
                       'Click or drag & drop heightmap image (PNG/JPG)'
                     )}
                   </span>
                </div>
              </div>
           )}
        </div>

        {/* Generate / Bake Button */}
        <div className="mt-2">
          {isGenerating && progressText && (
            <div className="text-[10px] text-blue-300 mb-2 truncate animate-pulse">
              {progressText}
            </div>
          )}
          <button
            disabled={isGenerating}
            className={`w-full text-white text-xs py-2 px-2 rounded border shadow-sm transition-colors flex justify-center items-center gap-1 ${
              isGenerating
                ? 'bg-blue-800 border-blue-900 cursor-not-allowed opacity-75'
                : 'bg-blue-600 hover:bg-blue-500 border-blue-700 cursor-pointer'
            }`}
            onClick={handleGenerate}
          >
            <svg
              className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isGenerating ? 'Baking Chunks...' : 'Generate Terrain'}
          </button>
        </div>
      </InspectorCategory>

      <InspectorCategory title="Terrain Editor" defaultExpanded={false}>
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-400 mb-2">Tool Mode</div>
          <div className="grid grid-cols-3 gap-1">
            {paintModes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setPaintMode(mode.value)}
                className={`flex flex-col items-center justify-center p-2 rounded border text-[10px] transition-colors ${
                  currentPaintMode === mode.value
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                    : 'bg-[#252525] border-[#333] text-gray-400 hover:bg-[#333]'
                }`}
                title={mode.label}
              >
                <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mode.icon} />
                </svg>
                <span className="truncate w-full text-center">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {currentPaintMode !== 'None' && (
          <>
            <div className="h-px bg-gray-800 my-2" />
            <div className="text-xs font-semibold text-gray-400 mb-2">Brush Settings</div>
            <SliderInput label="Size" obj={activeObj} prop="brushSize" min={1} max={100} step={1} />
            <SliderInput label="Opacity/Strength" obj={activeObj} prop="brushOpacity" min={0.01} max={1} step={0.01} />
          </>
        )}

        {currentPaintMode === 'Paint Foliage' && (
          <>
            <div className="h-px bg-gray-800 my-2" />
            <div className="text-xs font-semibold text-gray-400 mb-2">Foliage Asset</div>
            <div className="flex gap-1 mb-2 overflow-x-auto pb-1 custom-scrollbar relative">
              {foliageTypes.map((ft) => {
                const isSelected = currentFoliageType.includes(ft.value);
                return (
                <button
                  key={ft.value}
                  onClick={() => toggleFoliage(ft.value)}
                  className={`flex-shrink-0 w-16 flex flex-col items-center justify-center p-2 rounded border transition-colors ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500'
                      : 'bg-[#252525] border-[#333] hover:bg-[#333]'
                  }`}
                  title={ft.label}
                >
                  <div className="h-6 flex items-center justify-center mb-1">
                    <div className={ft.shape}></div>
                  </div>
                  <span className="text-[9px] text-gray-400 text-center truncate w-full">{ft.label}</span>
                </button>
              )})}
            </div>
            <SliderInput label="Density" obj={activeObj} prop="foliageDensity" min={0.1} max={10} step={0.1} />
            <div className="mt-2 text-[10px] text-yellow-500/80 bg-yellow-500/10 p-2 rounded text-center border border-yellow-500/20">
              Click and drag on terrain to paint foliage
            </div>
          </>
        )}

        {currentPaintMode === 'Place Object' && (
          <>
            <div className="h-px bg-gray-800 my-2" />
            <div className="text-xs font-semibold text-gray-400 mb-2">Object Asset</div>
            <div className="flex gap-1 mb-2 overflow-x-auto pb-1 custom-scrollbar relative">
              {objectTypes.map((ot) => {
                const isSelected = currentObjectType.includes(ot.value);
                return (
                <button
                  key={ot.value}
                  onClick={() => toggleObject(ot.value)}
                  className={`flex-shrink-0 w-16 flex flex-col items-center justify-center p-2 rounded border transition-colors ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500'
                      : 'bg-[#252525] border-[#333] hover:bg-[#333]'
                  }`}
                  title={ot.label}
                >
                  <div className="h-6 flex items-center justify-center mb-1">
                    <div className={ot.shape}></div>
                  </div>
                  <span className="text-[9px] text-gray-400 text-center truncate w-full">{ot.label}</span>
                </button>
              )})}
            </div>
            <div className="mt-2 text-[10px] text-blue-400/80 bg-blue-500/10 p-2 rounded text-center border border-blue-500/20">
              Click on terrain to place object
            </div>
          </>
        )}
      </InspectorCategory>
    </div>
  );
};

export default TerrainNode;