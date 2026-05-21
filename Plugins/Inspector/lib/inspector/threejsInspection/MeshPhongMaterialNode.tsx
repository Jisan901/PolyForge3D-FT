import React from 'react';
import * as THREE from 'three';
import { InspectorCategory } from '../components/InspectorPanel';
import { BooleanInput } from '../components/BooleanInput';
import { NumberInput } from '../components/NumberInput';
import { ColorInput } from '../components/ColorInput';
import { MaterialTexturesNode } from './MaterialTexturesNode';

const textureTypes = [
  { prop: 'map', label: 'Map' },
  { prop: 'lightMap', label: 'Light Map' },
  { prop: 'aoMap', label: 'AO Map' },
  { prop: 'emissiveMap', label: 'Emissive Map' },
  { prop: 'bumpMap', label: 'Bump Map' },
  { prop: 'normalMap', label: 'Normal Map' },
  { prop: 'displacementMap', label: 'Displacement Map' },
  { prop: 'specularMap', label: 'Specular Map' },
  { prop: 'alphaMap', label: 'Alpha Map' },
  { prop: 'envMap', label: 'Env Map' },
];

export const MeshPhongMaterialNode = ({ obj }: { obj: any }) => {
  const handlePropertyChange = () => {
    obj.needsUpdate = true;
  };

  return (
    <div className="flex flex-col gap-1">
      <InspectorCategory title="Phong Material" defaultExpanded={true}>
        <ColorInput label="Color" obj={obj} prop="color" onChange={handlePropertyChange} />
        <ColorInput label="Emissive" obj={obj} prop="emissive" onChange={handlePropertyChange} />
        <ColorInput label="Specular" obj={obj} prop="specular" onChange={handlePropertyChange} />
        <NumberInput label="Shininess" obj={obj} prop="shininess" step={1} min={0} onChange={handlePropertyChange} />
        <BooleanInput label="Wireframe" obj={obj} prop="wireframe" onChange={handlePropertyChange} />
        <BooleanInput label="Flat Shading" obj={obj} prop="flatShading" onChange={handlePropertyChange} />
      </InspectorCategory>
      
      <MaterialTexturesNode obj={obj} textureTypes={textureTypes} />
    </div>
  );
};
