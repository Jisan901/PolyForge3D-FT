import React, { useCallback } from 'react';
import { NumberInput } from './NumberInput';
import { useInspector } from '../hooks/useInspector';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
  isVector3?: boolean;
}

export interface Vector3InputProps {
  label: string;
  value?: Vector3;
  onChange?: (val: Vector3) => void;
  step?: number;
  
  obj?: any;
  prop?: string;
}

export const Vector3Input = React.memo(({ label, value, onChange, step = 0.1, obj, prop }: Vector3InputProps) => {
  const [inspectorValue, setInspectorValue] = useInspector<any>(obj, prop);

  const current = (obj && prop) ? inspectorValue : value;
  const currentX = Number(current?.x ?? 0);
  const currentY = Number(current?.y ?? 0);
  const currentZ = Number(current?.z ?? 0);

  const handleX = useCallback((newX: number) => {
    const curr = (obj && prop) ? inspectorValue : value;
    let nextVal: any;

    if (curr && typeof curr === 'object' && ('set' in curr) && typeof curr.set === 'function') {
      curr.x = newX;
      nextVal = curr;
      if (obj && prop) setInspectorValue(curr);
    } else {
      nextVal = {
        ...(typeof curr === 'object' && curr !== null ? curr : {}),
        isVector3: true,
        x: newX,
        y: Number(curr?.y ?? 0),
        z: Number(curr?.z ?? 0)
      };
      if (obj && prop) setInspectorValue(nextVal);
    }

    if (onChange) onChange(nextVal);
  }, [obj, prop, inspectorValue, value, setInspectorValue, onChange]);

  const handleY = useCallback((newY: number) => {
    const curr = (obj && prop) ? inspectorValue : value;
    let nextVal: any;

    if (curr && typeof curr === 'object' && ('set' in curr) && typeof curr.set === 'function') {
      curr.y = newY;
      nextVal = curr;
      if (obj && prop) setInspectorValue(curr);
    } else {
      nextVal = {
        ...(typeof curr === 'object' && curr !== null ? curr : {}),
        isVector3: true,
        x: Number(curr?.x ?? 0),
        y: newY,
        z: Number(curr?.z ?? 0)
      };
      if (obj && prop) setInspectorValue(nextVal);
    }

    if (onChange) onChange(nextVal);
  }, [obj, prop, inspectorValue, value, setInspectorValue, onChange]);

  const handleZ = useCallback((newZ: number) => {
    const curr = (obj && prop) ? inspectorValue : value;
    let nextVal: any;

    if (curr && typeof curr === 'object' && ('set' in curr) && typeof curr.set === 'function') {
      curr.z = newZ;
      nextVal = curr;
      if (obj && prop) setInspectorValue(curr);
    } else {
      nextVal = {
        ...(typeof curr === 'object' && curr !== null ? curr : {}),
        isVector3: true,
        x: Number(curr?.x ?? 0),
        y: Number(curr?.y ?? 0),
        z: newZ
      };
      if (obj && prop) setInspectorValue(nextVal);
    }

    if (onChange) onChange(nextVal);
  }, [obj, prop, inspectorValue, value, setInspectorValue, onChange]);

  return (
    <div className="flex flex-col w-full text-xs mb-[2px]">
      <div className="text-gray-400 truncate select-none py-1">
        {label}
      </div>
      <div className="flex gap-1">
        <div className="flex-1">
          <NumberInput 
            value={currentX} 
            onChange={handleX} 
            step={step} 
            prefix={<div className="w-6 h-full flex items-center justify-center bg-red-900/30 text-red-400 font-bold border-r border-[#333]">X</div>} 
          />
        </div>
        <div className="flex-1">
          <NumberInput 
            value={currentY} 
            onChange={handleY} 
            step={step} 
            prefix={<div className="w-6 h-full flex items-center justify-center bg-green-900/30 text-green-400 font-bold border-r border-[#333]">Y</div>} 
          />
        </div>
        <div className="flex-1">
          <NumberInput 
            value={currentZ} 
            onChange={handleZ} 
            step={step} 
            prefix={<div className="w-6 h-full flex items-center justify-center bg-blue-900/30 text-blue-400 font-bold border-r border-[#333]">Z</div>} 
          />
        </div>
      </div>
    </div>
  );
});
