import React from 'react';
import * as THREE from 'three';
import { InspectorCategory } from '../components/InspectorPanel';
import { BooleanInput } from '../components/BooleanInput';
import { ColorInput } from '../components/ColorInput';
import { MaterialTexturesNode } from './MaterialTexturesNode';

const textureTypes = [
  { prop: 'map', label: 'Map' },
  { prop: 'lightMap', label: 'Light Map' },
  { prop: 'aoMap', label: 'AO Map' },
  { prop: 'specularMap', label: 'Specular Map' },
  { prop: 'alphaMap', label: 'Alpha Map' },
  { prop: 'envMap', label: 'Env Map' },
];

export const MeshBasicMaterialNode = ({ obj }: { obj: any }) => {
  const handlePropertyChange = () => {
    obj.needsUpdate = true;
  };

  return (
    <div className="flex flex-col gap-1">
      <InspectorCategory title="Basic Material" defaultExpanded={true}>
        <ColorInput label="Color" obj={obj} prop="color" onChange={handlePropertyChange} />
        <BooleanInput label="Wireframe" obj={obj} prop="wireframe" onChange={handlePropertyChange} />
      </InspectorCategory>
      
      <MaterialTexturesNode obj={obj} textureTypes={textureTypes} />
    </div>
  );
};
