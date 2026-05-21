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
  { prop: 'emissiveMap', label: 'Emissive Map' },
  { prop: 'specularMap', label: 'Specular Map' },
  { prop: 'alphaMap', label: 'Alpha Map' },
  { prop: 'envMap', label: 'Env Map' },
];

export const MeshLambertMaterialNode = ({ obj }: { obj: any }) => {
  const handlePropertyChange = () => {
    obj.needsUpdate = true;
  };

  return (
    <div className="flex flex-col gap-1">
      <InspectorCategory title="Lambert Material" defaultExpanded={true}>
        <ColorInput label="Color" obj={obj} prop="color" onChange={handlePropertyChange} />
        <ColorInput label="Emissive" obj={obj} prop="emissive" onChange={handlePropertyChange} />
        <BooleanInput label="Wireframe" obj={obj} prop="wireframe" onChange={handlePropertyChange} />
      </InspectorCategory>
      
      <MaterialTexturesNode obj={obj} textureTypes={textureTypes} />
    </div>
  );
};
