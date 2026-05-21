import React, { useState } from 'react';
import { InspectorCategory } from '../components/InspectorPanel';
import { TextInput } from '../components/TextInput';
import { BooleanInput } from '../components/BooleanInput';
import { SelectInput } from '../components/SelectInput';
import { TransformNode } from './TransformNode';
import { MeshNode } from './MeshNode';
import { InstancedMeshNode } from './InstancedMeshNode';
import { SkinnedMeshNode } from './SkinnedMeshNode';
import { SpriteNode } from './SpriteNode';
import { PointsNode } from './PointsNode';
import { LightNode } from './LightNode';
import { Layers32Node } from './Layers32Node';
import { GeometryNode } from './GeometryNode';
import { MaterialNode } from './MaterialNode';
import { SceneNode } from './SceneNode';
import { CameraNode } from './CameraNode';

export const Object3DNode = ({ obj }: { obj: any }) => {
  const [selectedMaterialIndex, setSelectedMaterialIndex] = useState(0);

  const hasMaterial = obj.material !== undefined && obj.material !== null;
  const isMaterialArray = Array.isArray(obj.material);
  
  const activeMaterial = isMaterialArray 
    ? (obj.material[selectedMaterialIndex] || obj.material[0]) 
    : obj.material;

  const materialOptions = isMaterialArray 
    ? obj.material.map((mat: any, idx: number) => ({
        label: `[${idx}] ${mat.name || mat.type}`,
        value: idx
      }))
    : [];

  return (
    <div className="flex flex-col gap-1">
      <InspectorCategory title="Object3D" defaultExpanded={true}>
        <TextInput label="UUID" obj={obj} prop="uuid" disabled={true} />
        <TextInput label="Name" obj={obj} prop="name" />
        <BooleanInput label="Visible" obj={obj} prop="visible" />
        <BooleanInput label="Frustum Culled" obj={obj} prop="frustumCulled" />
      </InspectorCategory>
      
      <TransformNode obj={obj} />
      <Layers32Node obj={obj} />
      
      {obj.isScene && <SceneNode obj={obj} />}
      {obj.isCamera && <CameraNode obj={obj} />}
      {obj.isInstancedMesh && <InstancedMeshNode obj={obj} />}
      {obj.isSkinnedMesh && <SkinnedMeshNode obj={obj} />}
      {obj.isMesh && !obj.isInstancedMesh && <MeshNode obj={obj} />}
      {obj.isSprite && <SpriteNode obj={obj} />}
      {obj.isPoints && <PointsNode obj={obj} />}
      {obj.isLight && <LightNode obj={obj} />}
      
      {obj.geometry && <GeometryNode obj={obj.geometry} expanded={false}/>}
      
      {hasMaterial && (
        <div className="flex flex-col gap-1">
          {isMaterialArray && (
            <InspectorCategory title="Material Array" defaultExpanded={true}>
              <SelectInput 
                label="Selected Material" 
                options={materialOptions} 
                value={selectedMaterialIndex}
                onChange={(val) => setSelectedMaterialIndex(val)}
              />
            </InspectorCategory>
          )}
          {activeMaterial && <InspectorCategory title="Material Pack" defaultExpanded={false}><MaterialNode obj={activeMaterial} expanded={false} /></InspectorCategory>}
        </div>
      )}
    </div>
  );
};
