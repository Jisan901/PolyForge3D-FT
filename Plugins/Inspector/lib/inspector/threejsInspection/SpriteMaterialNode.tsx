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

export const SpriteMaterialNode = ({ obj }: { obj: any }) => {
  const handlePropertyChange = () => {
    obj.needsUpdate = true;
  };

  return (
    <div className="flex flex-col gap-1">
      <InspectorCategory title="Sprite Material" defaultExpanded={true}>
        <ColorInput label="Color" obj={obj} prop="color" onChange={handlePropertyChange} />
        <NumberInput label="Rotation" obj={obj} prop="rotation" step={0.01} onChange={handlePropertyChange} />
        <BooleanInput label="Size Attenuation" obj={obj} prop="sizeAttenuation" onChange={handlePropertyChange} />
      </InspectorCategory>
      
      <MaterialTexturesNode obj={obj} textureTypes={textureTypes} />
    </div>
  );
};
