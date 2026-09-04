import React from 'react';
import { ComponentProps } from './ComponentRegistry';
import {
  NumberInput,
  BooleanInput
} from '@/Plugins/Inspector/lib/inspector';

export const RigidbodyComponentUI: React.FC<ComponentProps> = ({
  object,
  basePath
}) => {
  return (
    <div className="flex flex-col gap-1 py-1">
      <NumberInput
        label="Mass"
        obj={object}
        prop={`${basePath}.data.mass`}
        min={0}
        step={0.1}
      />
      <BooleanInput
        label="Use Gravity"
        obj={object}
        prop={`${basePath}.data.useGravity`}
      />
      <BooleanInput
        label="Is Static"
        obj={object}
        prop={`${basePath}.data.isStatic`}
      />
      <BooleanInput
        label="Is Kinematic"
        obj={object}
        prop={`${basePath}.data.isKinematic`}
      />
      <BooleanInput
        label="Update Kinematic"
        obj={object}
        prop={`${basePath}.data.updateKinematic`}
      />
      <NumberInput
        label="Linear Drag"
        obj={object}
        prop={`${basePath}.data.drag`}
        min={0}
        step={0.01}
      />
      <NumberInput
        label="Angular Drag"
        obj={object}
        prop={`${basePath}.data.angularDrag`}
        min={0}
        step={0.01}
      />
    </div>
  );
};
