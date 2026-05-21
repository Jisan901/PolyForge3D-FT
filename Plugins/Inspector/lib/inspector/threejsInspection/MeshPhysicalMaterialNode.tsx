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
  { prop: 'roughnessMap', label: 'Roughness Map' },
  { prop: 'metalnessMap', label: 'Metalness Map' },
  { prop: 'alphaMap', label: 'Alpha Map' },
  { prop: 'envMap', label: 'Env Map' },
  { prop: 'clearcoatMap', label: 'Clearcoat Map' },
  { prop: 'clearcoatRoughnessMap', label: 'Clearcoat Roughness Map' },
  { prop: 'clearcoatNormalMap', label: 'Clearcoat Normal Map' },
  { prop: 'iridescenceMap', label: 'Iridescence Map' },
  { prop: 'iridescenceThicknessMap', label: 'Iridescence Thickness Map' },
  { prop: 'sheenColorMap', label: 'Sheen Color Map' },
  { prop: 'sheenRoughnessMap', label: 'Sheen Roughness Map' },
  { prop: 'transmissionMap', label: 'Transmission Map' },
  { prop: 'thicknessMap', label: 'Thickness Map' },
  { prop: 'specularIntensityMap', label: 'Specular Intensity Map' },
  { prop: 'specularColorMap', label: 'Specular Color Map' },
];

export const MeshPhysicalMaterialNode = ({ obj }: { obj: any }) => {
  const handlePropertyChange = () => {
    obj.needsUpdate = true;
  };

  return (
    <div className="flex flex-col gap-1">
      <InspectorCategory title="Physical Material" defaultExpanded={true}>
        <ColorInput label="Color" obj={obj} prop="color" onChange={handlePropertyChange} />
        <ColorInput label="Emissive" obj={obj} prop="emissive" onChange={handlePropertyChange} />
        <NumberInput label="Emissive Intensity" obj={obj} prop="emissiveIntensity" step={0.1} min={0} onChange={handlePropertyChange} />
        <NumberInput label="Roughness" obj={obj} prop="roughness" step={0.01} min={0} max={1} onChange={handlePropertyChange} />
        <NumberInput label="Metalness" obj={obj} prop="metalness" step={0.01} min={0} max={1} onChange={handlePropertyChange} />
        
        <div className="mt-2 mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Clearcoat</div>
        <NumberInput label="Clearcoat" obj={obj} prop="clearcoat" step={0.01} min={0} max={1} onChange={handlePropertyChange} />
        <NumberInput label="Clearcoat Roughness" obj={obj} prop="clearcoatRoughness" step={0.01} min={0} max={1} onChange={handlePropertyChange} />
        
        <div className="mt-2 mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Iridescence</div>
        <NumberInput label="Iridescence" obj={obj} prop="iridescence" step={0.01} min={0} max={1} onChange={handlePropertyChange} />
        <NumberInput label="Iridescence IOR" obj={obj} prop="iridescenceIOR" step={0.01} min={1} max={5} onChange={handlePropertyChange} />
        
        <div className="mt-2 mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Sheen</div>
        <NumberInput label="Sheen" obj={obj} prop="sheen" step={0.01} min={0} max={1} onChange={handlePropertyChange} />
        <NumberInput label="Sheen Roughness" obj={obj} prop="sheenRoughness" step={0.01} min={0} max={1} onChange={handlePropertyChange} />
        <ColorInput label="Sheen Color" obj={obj} prop="sheenColor" onChange={handlePropertyChange} />
        
        <div className="mt-2 mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Transmission</div>
        <NumberInput label="Transmission" obj={obj} prop="transmission" step={0.01} min={0} max={1} onChange={handlePropertyChange} />
        <NumberInput label="IOR" obj={obj} prop="ior" step={0.01} min={1} max={5} onChange={handlePropertyChange} />
        <NumberInput label="Thickness" obj={obj} prop="thickness" step={0.01} min={0} onChange={handlePropertyChange} />
        <NumberInput label="Attenuation Dist" obj={obj} prop="attenuationDistance" step={0.1} min={0} onChange={handlePropertyChange} />
        <ColorInput label="Attenuation Color" obj={obj} prop="attenuationColor" onChange={handlePropertyChange} />
        
        <div className="mt-2 mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Specular</div>
        <NumberInput label="Specular Intensity" obj={obj} prop="specularIntensity" step={0.01} min={0} max={1} onChange={handlePropertyChange} />
        <ColorInput label="Specular Color" obj={obj} prop="specularColor" onChange={handlePropertyChange} />
        
        <div className="mt-2 mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Other</div>
        <BooleanInput label="Wireframe" obj={obj} prop="wireframe" onChange={handlePropertyChange} />
        <BooleanInput label="Flat Shading" obj={obj} prop="flatShading" onChange={handlePropertyChange} />
        <NumberInput label="Env Map Intensity" obj={obj} prop="envMapIntensity" step={0.1} min={0} onChange={handlePropertyChange} />
      </InspectorCategory>
      
      <MaterialTexturesNode obj={obj} textureTypes={textureTypes} />
    </div>
  );
};
