import React from 'react';
import { InspectorCategory } from '../components/InspectorPanel';
import { NumberInput } from '../components/NumberInput';

export const CameraNode = ({ obj }: { obj: any }) => {
  if (!obj || !obj.isCamera) return null;

  const handleUpdate = () => {
    if (obj.updateProjectionMatrix) {
      obj.updateProjectionMatrix();
    }
  };

  const cameraType = obj.type || 'Camera';

  return (
    <InspectorCategory title={cameraType} defaultExpanded={true}>
      {obj.isPerspectiveCamera && (
        <>
          <NumberInput label="FOV" obj={obj} prop="fov" step={1} min={1} max={180} onChange={handleUpdate} />
          <NumberInput label="Near" obj={obj} prop="near" step={0.1} min={0.001} onChange={handleUpdate} />
          <NumberInput label="Far" obj={obj} prop="far" step={1} min={0.1} onChange={handleUpdate} />
          <NumberInput label="Zoom" obj={obj} prop="zoom" step={0.1} min={0.01} onChange={handleUpdate} />
          <NumberInput label="Focus" obj={obj} prop="focus" step={1} min={0} onChange={handleUpdate} />
          <NumberInput label="Film Gauge" obj={obj} prop="filmGauge" step={1} min={1} onChange={handleUpdate} />
          <NumberInput label="Film Offset" obj={obj} prop="filmOffset" step={0.1} onChange={handleUpdate} />
        </>
      )}

      {obj.isOrthographicCamera && (
        <>
          <NumberInput label="Left" obj={obj} prop="left" step={0.1} onChange={handleUpdate} />
          <NumberInput label="Right" obj={obj} prop="right" step={0.1} onChange={handleUpdate} />
          <NumberInput label="Top" obj={obj} prop="top" step={0.1} onChange={handleUpdate} />
          <NumberInput label="Bottom" obj={obj} prop="bottom" step={0.1} onChange={handleUpdate} />
          <NumberInput label="Near" obj={obj} prop="near" step={0.1} onChange={handleUpdate} />
          <NumberInput label="Far" obj={obj} prop="far" step={1} onChange={handleUpdate} />
          <NumberInput label="Zoom" obj={obj} prop="zoom" step={0.1} min={0.01} onChange={handleUpdate} />
        </>
      )}
      
      {!obj.isPerspectiveCamera && !obj.isOrthographicCamera && (
        <>
          <NumberInput label="Near" obj={obj} prop="near" step={0.1} onChange={handleUpdate} />
          <NumberInput label="Far" obj={obj} prop="far" step={1} onChange={handleUpdate} />
          <NumberInput label="Zoom" obj={obj} prop="zoom" step={0.1} min={0.01} onChange={handleUpdate} />
        </>
      )}
    </InspectorCategory>
  );
};
