import React from 'react';
import { InspectorCategory } from '../components/InspectorPanel';
import { NumberInput } from '../components/NumberInput';
import { Vector2Input } from '../components/Vector2Input';
import { CameraNode } from './CameraNode';

export const LightShadowNode = ({ obj }: { obj: any }) => {
  if (!obj) return null;

  const handleMapSizeChange = () => {
    if (obj.map) {
      obj.map.dispose();
      obj.map = null;
    }
  };

  return (
    <InspectorCategory title="Shadow" defaultExpanded={false}>
      <NumberInput label="Bias" obj={obj} prop="bias" step={0.0001} />
      <NumberInput label="Normal Bias" obj={obj} prop="normalBias" step={0.001} />
      <NumberInput label="Radius" obj={obj} prop="radius" step={0.1} min={0} />
      <NumberInput label="Blur Samples" obj={obj} prop="blurSamples" step={1} min={1} />
      <Vector2Input label="Map Size" obj={obj} prop="mapSize" step={1} onChange={handleMapSizeChange} />
      
      {obj.camera && (
        <div className="mt-2 border border-[#333] rounded p-1 bg-[#141414]">
          <div className="text-xs font-semibold text-gray-300 px-1 mb-1">Shadow Camera</div>
          <CameraNode obj={obj.camera} />
        </div>
      )}
    </InspectorCategory>
  );
};
