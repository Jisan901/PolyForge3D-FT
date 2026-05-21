import React from 'react';
import { InspectorCategory } from '../components/InspectorPanel';
import { Vector3Input } from '../components/Vector3Input';

export const TransformNode = ({ obj }: { obj: any }) => {
  if (!obj) return null;

  return (
    <InspectorCategory title="Transform" defaultExpanded={true}>
      <Vector3Input label="Position" obj={obj} prop="position" step={0.1} />
      <Vector3Input label="Rotation" obj={obj} prop="rotation" step={0.1} />
      <Vector3Input label="Scale" obj={obj} prop="scale" step={0.1} />
    </InspectorCategory>
  );
};
