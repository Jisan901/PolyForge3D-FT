import React from 'react';
import { ComponentProps } from './ComponentRegistry';
import {
  Vector2Input,
  SelectInput,
  ColorInput,
  useInspector
} from '@/Plugins/Inspector/lib/inspector';

const ANCHOR_OPTIONS = [
  { label: 'Top Left', value: 'top-left' },
  { label: 'Top Center', value: 'top-center' },
  { label: 'Top Right', value: 'top-right' },
  { label: 'Center Left', value: 'center-left' },
  { label: 'Center', value: 'center' },
  { label: 'Center Right', value: 'center-right' },
  { label: 'Bottom Left', value: 'bottom-left' },
  { label: 'Bottom Center', value: 'bottom-center' },
  { label: 'Bottom Right', value: 'bottom-right' }
];

export const UIElementComponentUI: React.FC<ComponentProps> = ({
  object,
  basePath
}) => {
  const [anchor, setAnchor] = useInspector<string>(object, `${basePath}.data.anchor`);

  return (
    <div className="flex flex-col gap-1 py-1">
      <Vector2Input
        label="Size"
        obj={object}
        prop={`${basePath}.data.size`}
      />

      <SelectInput
        label="Anchor"
        options={ANCHOR_OPTIONS}
        value={anchor || 'top-left'}
        onChange={(val) => setAnchor(val)}
      />

      <Vector2Input
        label="Pivot"
        obj={object}
        prop={`${basePath}.data.pivot`}
      />

      <ColorInput
        label="Color"
        obj={object}
        prop={`${basePath}.data.color`}
      />
    </div>
  );
};
