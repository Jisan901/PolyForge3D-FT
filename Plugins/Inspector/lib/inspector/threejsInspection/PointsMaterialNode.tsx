import React from 'react';
import * as THREE from 'three';
import { InspectorCategory } from '../components/InspectorPanel';
import { BooleanInput } from '../components/BooleanInput';
import { NumberInput } from '../components/NumberInput';
import { ColorInput } from '../components/ColorInput';
import { MaterialTexturesNode } from './MaterialTexturesNode';

const textureTypes = [
  { prop: 'map', label: 'Map' },
  { prop: 'alphaMap', label: 'Alpha Map' },
];

export const PointsMaterialNode = ({ obj }: { obj: any }) => {
  const handlePropertyChange = () => {
    obj.needsUpdate = true;
  };

  return (
    <div className="flex flex-col gap-1">
      <InspectorCategory title="Points Material" defaultExpanded={true}>
        <ColorInput label="Color" obj={obj} prop="color" onChange={handlePropertyChange} />
        <NumberInput label="Size" obj={obj} prop="size" step={0.01} min={0} onChange={handlePropertyChange} />
        <BooleanInput label="Size Attenuation" obj={obj} prop="sizeAttenuation" onChange={handlePropertyChange} />
      </InspectorCategory>
      
      <MaterialTexturesNode obj={obj} textureTypes={textureTypes} />
    </div>
  );
};
