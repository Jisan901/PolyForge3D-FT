import React, { useState } from 'react';
import { useInspector } from '@/Plugins/Inspector/lib/inspector';
import { InspectorCategory } from '@/Plugins/Inspector/lib/inspector/components/InspectorPanel';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';
import * as THREE from 'three';

import { NumberInput } from '@/Plugins/Inspector/lib/inspector/components/NumberInput';
import { SliderInput } from '@/Plugins/Inspector/lib/inspector/components/SliderInput';

export const MeshToolsNode = ({ obj }: { obj: any }) => {
  if (!obj || (!obj.isMesh && !obj.isGroup)) return null;

  const [isProcessing, setIsProcessing] = useState(false);

  // Mock object configuration if the actual object doesn't have these properties setup yet
  if (!obj.userData.meshToolsConfig) {
      obj.userData.meshToolsConfig = {
        lodLevels: 1,
        decimationRatio: 0.5,
        preserveBorders: true,
        spacingFactor: 1.5
      };
  }
  
  const activeObj = obj.userData.meshToolsConfig;

  // Wire up state for UI demonstration
  const [lodLevels] = useInspector<number>(activeObj, 'lodLevels');
  const [decimationRatio] = useInspector<number>(activeObj, 'decimationRatio');
  const [spacingFactor, setSpacingFactor] = useInspector<number>(activeObj, 'spacingFactor');
  const [preserveBorders, setPreserveBorders] = useInspector<boolean>(activeObj, 'preserveBorders');

  const isMeshUrl = obj.isMesh;

  const handleProcess = async () => {
    setIsProcessing(true);
    
    // Slight delay to allow UI to show "Processing..." state before blocking main thread
    setTimeout(() => {
        try {
            const meshes: THREE.Mesh[] = [];
            if (obj.isMesh) meshes.push(obj);
            else if (obj.isGroup) {
               obj.traverse((child: any) => { if (child.isMesh) meshes.push(child); });
            }
            
            const modifier = new SimplifyModifier();
            
            meshes.forEach(mesh => {
                const ogGeometry = mesh.geometry;
                const positionAttribute = ogGeometry.getAttribute('position');
                if (!positionAttribute) return;

                if (activeObj.lodLevels === 1) {
                    const verticesToRemove = Math.floor(positionAttribute.count * activeObj.decimationRatio);
                    if (verticesToRemove > 0 && positionAttribute.count - verticesToRemove > 10) {
                        const simplified = modifier.modify(ogGeometry, verticesToRemove);
                        mesh.geometry = simplified;
                    }
                } else {
                    const group = new THREE.Group();
                    group.name = `${mesh.name || 'Mesh'}_LOD_Group`;
                    mesh.parent?.add(group);
                    
                    ogGeometry.computeBoundingBox();
                    const bbox = ogGeometry.boundingBox;
                    const width = bbox ? (bbox.max.x - bbox.min.x) : 2;
                    const spacing = width * spacingFactor;

                    group.position.copy(mesh.position);
                    group.rotation.copy(mesh.rotation);
                    group.scale.copy(mesh.scale);
                    
                    mesh.parent?.remove(mesh);
                    group.add(mesh);
                    
                    mesh.position.set(0,0,0);
                    mesh.rotation.set(0,0,0);
                    mesh.scale.set(1,1,1);
                    
                    let currentGeo = ogGeometry;
                    for (let i = 1; i < activeObj.lodLevels; i++) {
                        const posAttr = currentGeo.getAttribute('position');
                        if (!posAttr) break;
                        const toRemove = Math.floor(posAttr.count * activeObj.decimationRatio);
                        if (posAttr.count - toRemove < 12) break; // Arbitrary safety limit
                        
                        const simplified = modifier.modify(currentGeo, toRemove);
                        const lowResMesh = new THREE.Mesh(simplified, mesh.material);
                        lowResMesh.name = `${mesh.name || 'Mesh'}_LOD${i}`;
                        lowResMesh.position.set(spacing * i, 0, 0);
                        group.add(lowResMesh);
                        
                        currentGeo = simplified;
                    }
                }
            });
        } catch (e) {
            console.error('Mesh simplification failed:', e);
            alert('Failed to simplify mesh. Ensure geometry is valid.');
        } finally {
            setIsProcessing(false);
        }
    }, 50);
  };

  const handleComputeNormals = () => {
      const meshes: THREE.Mesh[] = [];
      if (obj.isMesh) meshes.push(obj);
      else if (obj.isGroup) obj.traverse((c: any) => { if (c.isMesh) meshes.push(c); });
      meshes.forEach(m => m.geometry && m.geometry.computeVertexNormals());
  };

  const handleComputeTangents = () => {
      const meshes: THREE.Mesh[] = [];
      if (obj.isMesh) meshes.push(obj);
      else if (obj.isGroup) obj.traverse((c: any) => { if (c.isMesh) meshes.push(c); });
      meshes.forEach(m => m.geometry && m.geometry.computeTangents());
  };

  return (
    <div className="flex flex-col gap-1">
      <InspectorCategory title="Mesh Simplification (LOD)" defaultExpanded={true}>
        <div className="bg-[#1e1e1e] p-2 rounded border border-[#333] mb-2">
          <div className="text-[10px] text-gray-400 mb-2">
            Target elements: {isMeshUrl ? '1 Mesh' : 'Children Meshes'}
          </div>
          
          <div className="grid grid-cols-1 gap-2 mb-3">
            <NumberInput label="Levels" obj={activeObj} prop="lodLevels" min={1} max={5} step={1} />
            <div className="pt-2">
               <SliderInput label="Iteration Decimation (%)" obj={activeObj} prop="decimationRatio" min={0.1} max={0.9} step={0.05} />
            </div>
            <div className="pt-2">
               <SliderInput label="Spacing" obj={activeObj} prop="spacingFactor" min={0} max={5} step={0.05} />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3 p-1.5 bg-[#252525] rounded border border-[#333]">
             <input type="checkbox" id="preserveBorders" checked={preserveBorders} onChange={(e) => setPreserveBorders(e.target.checked)} className="accent-blue-500 rounded-sm" />
             <label htmlFor="preserveBorders" className="text-[10px] text-gray-300 select-none cursor-pointer">
               Preserve Borders (avoid holes)
             </label>
          </div>

          <button 
            disabled={isProcessing}
            onClick={handleProcess}
            className="w-full bg-indigo-600/90 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs py-2 px-2 rounded border border-indigo-700 shadow-sm transition-colors flex justify-center items-center gap-1.5"
          >
            {isProcessing ? (
                <span className="animate-pulse">Processing...</span>
            ) : (
                <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {lodLevels === 1 ? 'Simplify Mesh' : 'Generate LOD hierarchy'}
                </>
            )}
          </button>
        </div>
      </InspectorCategory>

      <InspectorCategory title="Normals & Tangents" defaultExpanded={false}>
         <div className="bg-[#1e1e1e] p-2 rounded border border-[#333] grid grid-cols-2 gap-2">
             <button onClick={handleComputeNormals} className="w-full bg-[#252525] hover:bg-[#333] text-gray-200 text-[10px] py-1.5 px-2 rounded border border-[#333] transition-colors text-center">
                 Compute Normals
             </button>
             <button onClick={handleComputeTangents} className="w-full bg-[#252525] hover:bg-[#333] text-gray-200 text-[10px] py-1.5 px-2 rounded border border-[#333] transition-colors text-center">
                 Compute Tangents
             </button>
             <button className="w-full bg-[#252525] hover:bg-[#333] text-gray-200 text-[10px] p-1.5 rounded border border-[#333] transition-colors text-center col-span-2">
                 Compute Vertex Colors
             </button>
         </div>
      </InspectorCategory>
    </div>
  );
};
