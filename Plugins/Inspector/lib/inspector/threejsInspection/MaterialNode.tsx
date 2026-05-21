import React from 'react';
import * as THREE from 'three';
import { InspectorCategory } from '../components/InspectorPanel';
import { TextInput } from '../components/TextInput';
import { BooleanInput } from '../components/BooleanInput';
import { NumberInput } from '../components/NumberInput';
import { SelectInput } from '../components/SelectInput';
import { MeshStandardMaterialNode } from './MeshStandardMaterialNode';
import { MeshPhysicalMaterialNode } from './MeshPhysicalMaterialNode';
import { MeshBasicMaterialNode } from './MeshBasicMaterialNode';
import { MeshPhongMaterialNode } from './MeshPhongMaterialNode';
import { MeshLambertMaterialNode } from './MeshLambertMaterialNode';
import { SpriteMaterialNode } from './SpriteMaterialNode';
import { PointsMaterialNode } from './PointsMaterialNode';

const sideOptions = [
  { label: 'FrontSide', value: THREE.FrontSide },
  { label: 'BackSide', value: THREE.BackSide },
  { label: 'DoubleSide', value: THREE.DoubleSide },
];

const blendingOptions = [
  { label: 'NoBlending', value: THREE.NoBlending },
  { label: 'NormalBlending', value: THREE.NormalBlending },
  { label: 'AdditiveBlending', value: THREE.AdditiveBlending },
  { label: 'SubtractiveBlending', value: THREE.SubtractiveBlending },
  { label: 'MultiplyBlending', value: THREE.MultiplyBlending },
  { label: 'CustomBlending', value: THREE.CustomBlending },
];

const depthFuncOptions = [
  { label: 'NeverDepth', value: THREE.NeverDepth },
  { label: 'AlwaysDepth', value: THREE.AlwaysDepth },
  { label: 'LessDepth', value: THREE.LessDepth },
  { label: 'LessEqualDepth', value: THREE.LessEqualDepth },
  { label: 'EqualDepth', value: THREE.EqualDepth },
  { label: 'GreaterEqualDepth', value: THREE.GreaterEqualDepth },
  { label: 'GreaterDepth', value: THREE.GreaterDepth },
  { label: 'NotEqualDepth', value: THREE.NotEqualDepth },
];

export const MaterialNode = ({ obj, expanded = true }: { obj: any, expanded?: boolean }) => {
  const handlePropertyChange = () => {
    obj.needsUpdate = true;
  };

  return (
    <div className="flex flex-col gap-1">
      <InspectorCategory title="Material" defaultExpanded={expanded}>
        <TextInput label="UUID" obj={obj} prop="uuid" disabled={true} />
        <TextInput label="Type" obj={obj} prop="type" disabled={true} />
        <TextInput label="Name" obj={obj} prop="name" />
        
        <BooleanInput label="Transparent" obj={obj} prop="transparent" onChange={handlePropertyChange} />
        <NumberInput label="Opacity" obj={obj} prop="opacity" step={0.01} min={0} max={1} onChange={handlePropertyChange} />
        <BooleanInput label="Visible" obj={obj} prop="visible" onChange={handlePropertyChange} />
        
        <SelectInput label="Side" obj={obj} prop="side" options={sideOptions} onChange={handlePropertyChange} />
        <SelectInput label="Blending" obj={obj} prop="blending" options={blendingOptions} onChange={handlePropertyChange} />
        
        <BooleanInput label="Depth Test" obj={obj} prop="depthTest" onChange={handlePropertyChange} />
        <BooleanInput label="Depth Write" obj={obj} prop="depthWrite" onChange={handlePropertyChange} />
        <SelectInput label="Depth Func" obj={obj} prop="depthFunc" options={depthFuncOptions} onChange={handlePropertyChange} />
        
        <BooleanInput label="Alpha Test" obj={obj} prop="alphaTest" onChange={handlePropertyChange} />
        <BooleanInput label="Alpha To Coverage" obj={obj} prop="alphaToCoverage" onChange={handlePropertyChange} />
        
        <BooleanInput label="Color Write" obj={obj} prop="colorWrite" onChange={handlePropertyChange} />
        <BooleanInput label="Polygon Offset" obj={obj} prop="polygonOffset" onChange={handlePropertyChange} />
        <BooleanInput label="Dithering" obj={obj} prop="dithering" onChange={handlePropertyChange} />
        <BooleanInput label="Tone Mapped" obj={obj} prop="toneMapped" onChange={handlePropertyChange} />
      </InspectorCategory>

      {obj.type === 'MeshStandardMaterial' && <MeshStandardMaterialNode obj={obj} />}
      {obj.type === 'MeshPhysicalMaterial' && <MeshPhysicalMaterialNode obj={obj} />}
      {obj.type === 'MeshBasicMaterial' && <MeshBasicMaterialNode obj={obj} />}
      {obj.type === 'MeshPhongMaterial' && <MeshPhongMaterialNode obj={obj} />}
      {obj.type === 'MeshLambertMaterial' && <MeshLambertMaterialNode obj={obj} />}
      {obj.type === 'SpriteMaterial' && <SpriteMaterialNode obj={obj} />}
      {obj.type === 'PointsMaterial' && <PointsMaterialNode obj={obj} />}
    </div>
  );
};
