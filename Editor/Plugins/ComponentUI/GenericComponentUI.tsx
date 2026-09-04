import React from 'react';
import { ComponentProps } from './ComponentRegistry';
import {
  NumberInput,
  TextInput,
  BooleanInput,
  Vector3Input,
  Vector2Input,
  ColorInput,
  AssetInput,
  RefInput
} from '@/Plugins/Inspector/lib/inspector';

export const GenericComponentUI: React.FC<ComponentProps> = ({
  object,
  componentData,
  basePath
}) => {
  const data = componentData?.data || {};

  const renderField = (key: string, val: any, currentPath: string): React.ReactNode => {
    const propPath = `${currentPath}.${key}`;
    const displayLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

    if (typeof val === 'boolean') {
      return (
        <BooleanInput
          key={propPath}
          label={displayLabel}
          obj={object}
          prop={propPath}
        />
      );
    }

    if (typeof val === 'number') {
      return (
        <NumberInput
          key={propPath}
          label={displayLabel}
          obj={object}
          prop={propPath}
        />
      );
    }

    if (typeof val === 'string') {
      return (
        <TextInput
          key={propPath}
          label={displayLabel}
          obj={object}
          prop={propPath}
        />
      );
    }

    if (typeof val === 'object' && val !== null) {
      if (val.isVector3 || ('x' in val && 'y' in val && 'z' in val)) {
        return (
          <Vector3Input
            key={propPath}
            label={displayLabel}
            obj={object}
            prop={propPath}
          />
        );
      }

      if (val.isVector2 || ('x' in val && 'y' in val && !('z' in val))) {
        return (
          <Vector2Input
            key={propPath}
            label={displayLabel}
            obj={object}
            prop={propPath}
          />
        );
      }

      if (val.isColor || ('r' in val && 'g' in val && 'b' in val)) {
        return (
          <ColorInput
            key={propPath}
            label={displayLabel}
            obj={object}
            prop={propPath}
          />
        );
      }

      if (val.isFile) {
        return (
          <AssetInput
            key={propPath}
            label={displayLabel}
            obj={object}
            prop={propPath}
          />
        );
      }

      if (val.isRef) {
        return (
          <RefInput
            key={propPath}
            label={displayLabel}
            obj={object}
            prop={propPath}
          />
        );
      }

      // Nested object grouping
      return (
        <div key={propPath} className="mt-1 pl-2 border-l border-[#333] flex flex-col gap-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold py-0.5">
            {displayLabel}
          </div>
          {Object.entries(val).map(([subKey, subVal]) =>
            renderField(subKey, subVal, propPath)
          )}
        </div>
      );
    }

    return null;
  };

  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <div className="text-[11px] text-gray-500 italic py-1">
        No configurable properties
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-1">
      {entries.map(([key, val]) => renderField(key, val, `${basePath}.data`))}
    </div>
  );
};
