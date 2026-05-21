import React from 'react';
import { InspectorCategory } from '../components/InspectorPanel';
import { Vector2Input } from '../components/Vector2Input';

export const SpriteNode = ({ obj }: { obj: any }) => {
  return (
    <InspectorCategory title="Sprite" defaultExpanded={true}>
      <Vector2Input label="Center" obj={obj} prop="center" />
    </InspectorCategory>
  );
};
