import React from 'react';
import * as THREE from 'three';
import { InspectorCategory } from '../components/InspectorPanel';
import { ColorInput } from '../components/ColorInput';
import { NumberInput } from '../components/NumberInput';
import { SelectInput } from '../components/SelectInput';
import { TextureNode } from './TextureNode';
import { globalInspector } from '../Inspector';

export const SceneNode = ({ obj }: { obj: any }) => {
  const handlePropertyChange = () => {
    // No specific needsUpdate for scene properties, but good for consistency
  };

  const getBgEnvType = (val: any) => {
    if (!val) return 'none';
    if (val.isColor) return 'color';
    if (val.isTexture) return 'texture';
    return 'none';
  };

  const getFogType = (val: any) => {
    if (!val) return 'none';
    if (val.isFogExp2) return 'exp2';
    if (val.isFog) return 'linear';
    return 'none';
  };

  const handleBgChange = (type: string) => {
    if (type === 'none') obj.background = null;
    else if (type === 'color') obj.background = new THREE.Color(0x000000);
    else if (type === 'texture') {
      const tex = new THREE.Texture();
      tex.name = "New Texture";
      obj.background = tex;
    }
    globalInspector.notifyStructureChange();
  };

  const handleEnvChange = (type: string) => {
    if (type === 'none') obj.environment = null;
    else if (type === 'color') obj.environment = new THREE.Color(0x000000);
    else if (type === 'texture') {
      const tex = new THREE.Texture();
      tex.name = "New Texture";
      obj.environment = tex;
    }
    globalInspector.notifyStructureChange();
  };

  const handleFogChange = (type: string) => {
    if (type === 'none') obj.fog = null;
    else if (type === 'linear') obj.fog = new THREE.Fog(0xcccccc, 1, 1000);
    else if (type === 'exp2') obj.fog = new THREE.FogExp2(0xcccccc, 0.001);
    globalInspector.notifyStructureChange();
  };

  const bgEnvOptions = [
    { label: 'None', value: 'none' },
    { label: 'Color', value: 'color' },
    { label: 'Texture', value: 'texture' }
  ];

  const fogOptions = [
    { label: 'None', value: 'none' },
    { label: 'Linear', value: 'linear' },
    { label: 'Exponential', value: 'exp2' }
  ];

  return (
    <InspectorCategory title="Scene" defaultExpanded={true}>
      <SelectInput label="Background Type" value={getBgEnvType(obj.background)} options={bgEnvOptions} onChange={handleBgChange} />
      {obj.background && obj.background.isColor && (
        <ColorInput label="Background Color" obj={obj} prop="background" onChange={handlePropertyChange} />
      )}
      {obj.background && obj.background.isTexture && (
        <div className="flex flex-col gap-1 border border-[#333] rounded p-1 bg-[#141414] mt-1 mb-1">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-semibold text-gray-300">Background Texture</span>
          </div>
          <TextureNode obj={obj.background} title="Settings" expanded={false} />
        </div>
      )}
      <NumberInput label="Background Blurriness" obj={obj} prop="backgroundBlurriness" step={0.01} min={0} max={1} onChange={handlePropertyChange} />
      <NumberInput label="Background Intensity" obj={obj} prop="backgroundIntensity" step={0.1} min={0} onChange={handlePropertyChange} />
      
      <div className="h-px bg-gray-800 my-1" />

      <SelectInput label="Environment Type" value={getBgEnvType(obj.environment)} options={bgEnvOptions} onChange={handleEnvChange} />
      {obj.environment && obj.environment.isColor && (
        <ColorInput label="Environment Color" obj={obj} prop="environment" onChange={handlePropertyChange} />
      )}
      {obj.environment && obj.environment.isTexture && (
        <div className="flex flex-col gap-1 border border-[#333] rounded p-1 bg-[#141414] mt-1 mb-1">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-semibold text-gray-300">Environment Texture</span>
          </div>
          <TextureNode obj={obj.environment} title="Settings" expanded={false} />
        </div>
      )}
      <NumberInput label="Environment Intensity" obj={obj} prop="environmentIntensity" step={0.1} min={0} onChange={handlePropertyChange} />

      <div className="h-px bg-gray-800 my-1" />

      <SelectInput label="Fog Type" value={getFogType(obj.fog)} options={fogOptions} onChange={handleFogChange} />
      {obj.fog && (
        <div className="flex flex-col gap-1 border border-[#333] rounded p-1 bg-[#141414] mt-1">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-semibold text-gray-300">Fog ({obj.fog.isFogExp2 ? 'Exp2' : 'Linear'})</span>
          </div>
          <ColorInput label="Color" obj={obj.fog} prop="color" onChange={handlePropertyChange} />
          {obj.fog.isFogExp2 ? (
            <NumberInput label="Density" obj={obj.fog} prop="density" step={0.001} min={0} onChange={handlePropertyChange} />
          ) : (
            <>
              <NumberInput label="Near" obj={obj.fog} prop="near" step={0.1} onChange={handlePropertyChange} />
              <NumberInput label="Far" obj={obj.fog} prop="far" step={0.1} onChange={handlePropertyChange} />
            </>
          )}
        </div>
      )}
    </InspectorCategory>
  );
};
