import {
  globalInspector,
} from '@/Plugins/Inspector/lib/inspector';

    


import React, { useState } from 'react';
import { InspectorCategory } from '@/Plugins/Inspector/lib/inspector/components/InspectorPanel';
import { NumberInput } from '@/Plugins/Inspector/lib/inspector/components/NumberInput';
import { BooleanInput } from '@/Plugins/Inspector/lib/inspector/components/BooleanInput';
import { SliderInput } from '@/Plugins/Inspector/lib/inspector/components/SliderInput';
import { useInspector } from '@/Plugins/Inspector/lib/inspector/hooks/useInspector';



export const TerrainNode = ({ obj }: { obj?: any }) => {
  // If no object is passed, try to use a local state mock
  const [mockObj] = useState(() => obj || {
    width: 100,
    depth: 100,
    widthSegments: 64,
    depthSegments: 64,
    enableChunking: true,
    chunkSize: 32,
    lodLevels: 4,
    maxDistance: 1000,
    maxHeight: 10,
    minHeight: -2,
    roughness: 0.8,
    seed: 12345,
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
  
  // Hook up states with useInspector
  const [enableChunking] = useInspector<boolean>(activeObj, 'enableChunking');
  const [chunkSize] = useInspector<number>(activeObj, 'chunkSize');
  const [lodLevels] = useInspector<number>(activeObj, 'lodLevels');
  const [maxDistance] = useInspector<number>(activeObj, 'maxDistance');
  
  const [paintMode, setPaintMode] = useInspector<string>(activeObj, 'paintMode');
  const [brushSize] = useInspector<number>(activeObj, 'brushSize');
  const [brushOpacity] = useInspector<number>(activeObj, 'brushOpacity');
  const [foliageType, setFoliageType] = useInspector<string[]>(activeObj, 'foliageType');
  const [foliageDensity] = useInspector<number>(activeObj, 'foliageDensity');
  const [objectType, setObjectType] = useInspector<string[]>(activeObj, 'objectType');
  const [heightMapData, setHeightMapData] = useInspector<string>(activeObj, 'heightMapData');

  // fallback to initialize if undefined
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
    // ensure at least one remains selected if desired, or allow empty
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

  const handleGenerate = () => {
    if (activeObj.generate) {
      activeObj.generate();
    } else {
      console.log("Generating terrain with: ", activeObj);
    }
  };

  const paintModes = [
    { label: 'None', value: 'None', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' }, // off
    { label: 'Foliage', value: 'Paint Foliage', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' }, // paint
    { label: 'Object', value: 'Place Object', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' }, // cube
  ];

  const heightMapTypes = [
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
      <InspectorCategory title="Terrain Solver" defaultExpanded={false}>
        
        {/* Height Data Generator Grid */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
             <div className="text-xs font-semibold text-gray-400">Height Data</div>
          </div>
          <div className="grid grid-cols-2 gap-1 mb-2">
            {heightMapTypes.map((type) => (
              <button
                 key={type.value}
                 onClick={() => setHeightMapData(type.value)}
                 className={`flex flex-col items-center justify-center p-2 rounded border text-[10px] transition-colors truncate ${
                   currentHeightMapData === type.value
                     ? 'bg-blue-600/30 border-blue-500 text-blue-300'
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
            <NumberInput label="Width" obj={activeObj} prop="width" step={1} min={10} max={1000} />
            <NumberInput label="Depth" obj={activeObj} prop="depth" step={1} min={10} max={1000} />
          </div>
        </div>
        
        {/* Resolution */}
        <div className="bg-[#1e1e1e] p-2 rounded border border-[#333] mb-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2 flex items-center justify-between">
            <span>Resolution Vertex Count</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
             <NumberInput label="W. Segs" obj={activeObj} prop="widthSegments" step={1} min={1} max={256} />
             <NumberInput label="D. Segs" obj={activeObj} prop="depthSegments" step={1} min={1} max={256} />
          </div>
        </div>

        {/* Chunking & LOD */}
        <div className="bg-[#1e1e1e] p-2 rounded border border-[#333] mb-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2 flex items-center justify-between">
            <span>Chunking & LOD</span>
            <BooleanInput label="" obj={activeObj} prop="enableChunking" />
          </div>
          {activeObj.enableChunking !== false && (
             <div className="grid grid-cols-2 gap-2 mt-2">
                 <NumberInput label="Chunk Size" obj={activeObj} prop="chunkSize" step={1} min={8} max={256} />
                 <NumberInput label="LOD Levels" obj={activeObj} prop="lodLevels" step={1} min={1} max={8} />
                 <div className="col-span-2 pt-1 border-t border-[#333] mt-1">
                   <NumberInput label="Max Distance" obj={activeObj} prop="maxDistance" step={10} min={100} max={10000} />
                 </div>
             </div>
          )}
        </div>

        {/* Displacement Parameters based on Generator type */}
        <div className="bg-[#1e1e1e] p-2 rounded border border-[#333] mb-3">
           <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Displacement</div>
           <div className="grid grid-cols-2 gap-2 mb-2">
             <NumberInput label="Max" obj={activeObj} prop="maxHeight" step={0.1} />
             <NumberInput label="Min" obj={activeObj} prop="minHeight" step={0.1} />
           </div>
           
           {(currentHeightMapData === 'Perlin Noise' || currentHeightMapData === 'Simplex Noise') && (
             <>
               <div className="mb-2">
                 <SliderInput label="Roughness" obj={activeObj} prop="roughness" min={0} max={2} step={0.01} />
               </div>
               <NumberInput label="Seed" obj={activeObj} prop="seed" step={1} />
             </>
           )}
           {currentHeightMapData === 'Texture Map' && (
              <div className="mt-2 text-[10px] text-gray-400 p-4 border-2 border-dashed border-[#444] hover:border-[#666] hover:text-gray-300 rounded-md text-center transition-colors cursor-pointer bg-[#252525] flex flex-col items-center justify-center gap-2">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                 <span>Drag & drop heightmap image here or click to browse</span>
              </div>
           )}
        </div>

        <div className="flex items-center justify-between bg-[#1e1e1e] p-2 rounded border border-[#333] mb-2">
          <span className="text-xs text-gray-300">Auto Update</span>
          <BooleanInput label="" obj={activeObj} prop="autoUpdate" />
        </div>

        <div className="mt-2">
          <button
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 px-2 rounded border border-blue-700 shadow-sm transition-colors flex justify-center items-center gap-1"
            onClick={handleGenerate}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Generate Terrain
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
              <div className="sticky right-0 flex-shrink-0 bg-[#1e1e1e] pl-1 flex items-center justify-center">
                 <button className="w-16 h-full min-h-[50px] flex flex-col items-center justify-center p-2 rounded border border-dashed border-[#555] text-gray-400 hover:text-white hover:border-gray-400 transition-colors bg-[#252525] hover:bg-[#333]">
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    <span className="text-[9px]">Add</span>
                 </button>
              </div>
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
              <div className="sticky right-0 flex-shrink-0 bg-[#1e1e1e] pl-1 flex items-center justify-center">
                 <button className="w-16 h-full min-h-[50px] flex flex-col items-center justify-center p-2 rounded border border-dashed border-[#555] text-gray-400 hover:text-white hover:border-gray-400 transition-colors bg-[#252525] hover:bg-[#333]">
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    <span className="text-[9px]">Add</span>
                 </button>
              </div>
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