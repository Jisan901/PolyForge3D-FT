import React from 'react';
import { InspectorCategory } from '../components/InspectorPanel';
import { BooleanInput } from '../components/BooleanInput';

export const PointsNode = ({ obj }: { obj: any }) => {
  return (
    <InspectorCategory title="Points" defaultExpanded={true}>
      <BooleanInput label="Cast Shadow" obj={obj} prop="castShadow" />
      <BooleanInput label="Receive Shadow" obj={obj} prop="receiveShadow" />
    </InspectorCategory>
  );
};
