import React from 'react';
import { ComponentProps } from './ComponentRegistry';
import {
  SelectInput,
  Vector3Input,
  NumberInput,
  BooleanInput,
  useInspector
} from '@/Plugins/Inspector/lib/inspector';

const SHAPE_OPTIONS = [
  { label: 'Box', value: 'box' },
  { label: 'Sphere', value: 'sphere' },
  { label: 'Capsule', value: 'capsule' },
  { label: 'Cylinder', value: 'cylinder' },
  { label: 'Cone', value: 'cone' },
  { label: 'Mesh', value: 'mesh' }
];

const MESH_TYPE_OPTIONS = [
  { label: 'Convex Hull (Dynamic / Static)', value: 'convexHull' },
  { label: 'Trimesh (Static Only)', value: 'trimesh' },
  { label: 'Bounding Box', value: 'boundingBox' }
];

const COMBINE_RULE_OPTIONS = [
  { label: 'Average', value: 'average' },
  { label: 'Minimum', value: 'min' },
  { label: 'Multiply', value: 'multiply' },
  { label: 'Maximum', value: 'max' }
];

export const ColliderComponentUI: React.FC<ComponentProps> = ({
  object,
  basePath
}) => {
  const [shape, setShape] = useInspector<string>(object, `${basePath}.data.shape`);
  const currentShape = shape || 'box';

  const [meshType, setMeshType] = useInspector<string>(object, `${basePath}.data.meshType`);
  const currentMeshType = meshType || 'convexHull';

  const [frictionCombine, setFrictionCombine] = useInspector<string>(
    object,
    `${basePath}.data.frictionCombineRule`
  );
  const currentFrictionCombine = frictionCombine || 'average';

  const [restitutionCombine, setRestitutionCombine] = useInspector<string>(
    object,
    `${basePath}.data.restitutionCombineRule`
  );
  const currentRestitutionCombine = restitutionCombine || 'average';

  return (
    <div className="flex flex-col gap-2 py-1 text-xs">
      {/* Shape Settings */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-0.5">
          Shape
        </span>
        <SelectInput
          label="Shape Type"
          options={SHAPE_OPTIONS}
          value={currentShape}
          onChange={(val) => setShape(val)}
        />

        {currentShape === 'box' && (
          <Vector3Input
            label="Size"
            obj={object}
            prop={`${basePath}.data.size`}
            step={0.1}
          />
        )}

        {(currentShape === 'sphere' ||
          currentShape === 'capsule' ||
          currentShape === 'cylinder' ||
          currentShape === 'cone') && (
          <NumberInput
            label="Radius"
            obj={object}
            prop={`${basePath}.data.radius`}
            min={0.01}
            step={0.05}
          />
        )}

        {(currentShape === 'capsule' ||
          currentShape === 'cylinder' ||
          currentShape === 'cone') && (
          <NumberInput
            label="Height"
            obj={object}
            prop={`${basePath}.data.height`}
            min={0.01}
            step={0.1}
          />
        )}

        {currentShape === 'mesh' && (
          <SelectInput
            label="Mesh Mode"
            options={MESH_TYPE_OPTIONS}
            value={currentMeshType}
            onChange={(val) => setMeshType(val)}
          />
        )}

        <Vector3Input
          label="Center Offset"
          obj={object}
          prop={`${basePath}.data.center`}
          step={0.05}
        />
      </div>

      {/* Physics Material */}
      <div className="flex flex-col gap-1 border-t border-[#262626] pt-1.5">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-0.5">
          Material & Friction
        </span>
        <NumberInput
          label="Friction"
          obj={object}
          prop={`${basePath}.data.friction`}
          min={0}
          step={0.05}
        />
        <SelectInput
          label="Friction Combine"
          options={COMBINE_RULE_OPTIONS}
          value={currentFrictionCombine}
          onChange={(val) => setFrictionCombine(val)}
        />
        <NumberInput
          label="Restitution (Bounciness)"
          obj={object}
          prop={`${basePath}.data.restitution`}
          min={0}
          max={1}
          step={0.05}
        />
        <SelectInput
          label="Restitution Combine"
          options={COMBINE_RULE_OPTIONS}
          value={currentRestitutionCombine}
          onChange={(val) => setRestitutionCombine(val)}
        />
        <NumberInput
          label="Density"
          obj={object}
          prop={`${basePath}.data.density`}
          min={0.001}
          step={0.1}
        />
      </div>

      {/* Trigger & Collision Filtering */}
      <div className="flex flex-col gap-1 border-t border-[#262626] pt-1.5">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-0.5">
          Trigger & Filtering
        </span>
        <BooleanInput
          label="Is Trigger (Sensor)"
          obj={object}
          prop={`${basePath}.data.isTrigger`}
        />
        <NumberInput
          label="Collision Layer (0-15)"
          obj={object}
          prop={`${basePath}.data.collisionLayer`}
          min={0}
          max={15}
          step={1}
        />
        <NumberInput
          label="Collision Mask"
          obj={object}
          prop={`${basePath}.data.collisionMask`}
          min={0}
          max={65535}
          step={1}
        />
      </div>
    </div>
  );
};
