import React from 'react';
import { InspectorCategory } from '../components/InspectorPanel';
import { ColorInput } from '../components/ColorInput';
import { NumberInput } from '../components/NumberInput';
import { BooleanInput } from '../components/BooleanInput';
import { LightShadowNode } from './LightShadowNode';

export const LightNode = ({ obj }: { obj: any }) => {
  if (!obj || !obj.isLight) return null;

  const lightType = obj.type || 'Light';

  return (
    <div className="flex flex-col gap-1">
      <InspectorCategory title={lightType} defaultExpanded={true}>
        <ColorInput label="Color" obj={obj} prop="color" />
        <NumberInput label="Intensity" obj={obj} prop="intensity" step={0.1} min={0} />

        {/* HemisphereLight specific */}
        {obj.isHemisphereLight && (
          <ColorInput label="Ground Color" obj={obj} prop="groundColor" />
        )}

        {/* Properties for PointLight, SpotLight, DirectionalLight */}
        {(obj.isPointLight || obj.isSpotLight || obj.isDirectionalLight) && (
          <BooleanInput label="Cast Shadow" obj={obj} prop="castShadow" />
        )}

        {/* Properties for PointLight, SpotLight */}
        {(obj.isPointLight || obj.isSpotLight) && (
          <>
            <NumberInput label="Distance" obj={obj} prop="distance" step={0.1} min={0} />
            <NumberInput label="Decay" obj={obj} prop="decay" step={0.1} min={0} />
          </>
        )}

        {/* SpotLight specific */}
        {obj.isSpotLight && (
          <>
            <NumberInput label="Angle" obj={obj} prop="angle" step={0.01} min={0} max={Math.PI / 2} />
            <NumberInput label="Penumbra" obj={obj} prop="penumbra" step={0.01} min={0} max={1} />
          </>
        )}

        {/* RectAreaLight specific */}
        {obj.isRectAreaLight && (
          <>
            <NumberInput label="Width" obj={obj} prop="width" step={0.1} min={0} />
            <NumberInput label="Height" obj={obj} prop="height" step={0.1} min={0} />
          </>
        )}
      </InspectorCategory>
      
      {obj.shadow && <LightShadowNode obj={obj.shadow} />}
    </div>
  );
};
