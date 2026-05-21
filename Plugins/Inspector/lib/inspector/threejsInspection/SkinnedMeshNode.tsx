import React from 'react';
import { InspectorCategory } from '../components/InspectorPanel';
import { BooleanInput } from '../components/BooleanInput';
import { SelectInput } from '../components/SelectInput';

export const SkinnedMeshNode = ({ obj }: { obj: any }) => {
  if (!obj || !obj.isSkinnedMesh) return null;
  
  
  const handleAction = (action: string) => {
    if (action === 'computeBoundingBox' && obj.computeBoundingBox) obj.computeBoundingBox();
    if (action === 'computeBoundingSphere' && obj.computeBoundingSphere) obj.computeBoundingSphere();
    if (action === 'normalizeSkinWeights' && obj.normalizeSkinWeights) obj.normalizeSkinWeights();
    if (action === 'pose' && obj.pose) obj.pose();
  };


  return (
    <InspectorCategory title="SkinnedMesh" defaultExpanded={true}>
      <SelectInput 
        label="Bind Mode" 
        obj={obj} 
        prop="bindMode" 
        options={[
          { label: 'Attached', value: 'attached' },
          { label: 'Detached', value: 'detached' }
        ]} 
      />
     <div className="mt-3">
        <div className="text-xs text-gray-400 mb-1">Actions</div>
        <div className="grid grid-cols-2 gap-1">
          <button
            className="bg-[#252525] hover:bg-[#333] text-gray-200 text-xs py-1 px-2 rounded border border-[#333] transition-colors"
            onClick={() => handleAction('computeBoundingBox')}
          >
            Compute BBox
          </button>
          <button
            className="bg-[#252525] hover:bg-[#333] text-gray-200 text-xs py-1 px-2 rounded border border-[#333] transition-colors"
            onClick={() => handleAction('computeBoundingSphere')}
          >
            Compute BSphere
          </button>
          <button
            className="bg-[#252525] hover:bg-[#333] text-gray-200 text-xs py-1 px-2 rounded border border-[#333] transition-colors"
            onClick={() => handleAction('normalizeSkinWeights')}
          >
            Normalize Weights
          </button>
          <button
            className="bg-[#252525] hover:bg-[#333] text-gray-200 text-xs py-1 px-2 rounded border border-[#333] transition-colors"
            onClick={() => handleAction('pose')}
          >
            Pose
          </button>
        </div>
      </div>
    </InspectorCategory>
  );
};
