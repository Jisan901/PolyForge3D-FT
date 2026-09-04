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
  { label: 'Mesh', value: 'mesh' }
];

export const ColliderComponentUI: React.FC<ComponentProps> = ({
  object,
  basePath
}) => {
  const [shape, setShape] = useInspector<string>(object, `${basePath}.data.shape`);
  const currentShape = shape || 'box';

  return (
    <div className="flex flex-col gap-1 py-1">
      <SelectInput
        label="Shape"
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

      {(currentShape === 'sphere' || currentShape === 'capsule' || currentShape === 'cylinder') && (
        <NumberInput
          label="Radius"
          obj={object}
          prop={`${basePath}.data.radius`}
          min={0.01}
          step={0.05}
        />
      )}

      {(currentShape === 'capsule' || currentShape === 'cylinder') && (
        <NumberInput
          label="Height"
          obj={object}
          prop={`${basePath}.data.height`}
          min={0.01}
          step={0.1}
        />
      )}

      <BooleanInput
        label="Is Trigger"
        obj={object}
        prop={`${basePath}.data.isTrigger`}
      />
    </div>
  );
};
