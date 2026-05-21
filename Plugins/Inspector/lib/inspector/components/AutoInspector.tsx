import React, { useEffect, useState } from 'react';
import { NumberInput } from './NumberInput';
import { TextInput } from './TextInput';
import { BooleanInput } from './BooleanInput';
import { Vector2Input } from './Vector2Input';
import { Vector3Input } from './Vector3Input';
import { ButtonInput } from './ButtonInput';
import { InspectorCategory } from './InspectorPanel';
import { globalInspector, Inspector } from '../Inspector';

const isVector2 = (val: any) => {
  return val && typeof val === 'object' && 'x' in val && 'y' in val && !('z' in val) && Object.keys(val).length === 2;
};

const isVector3 = (val: any) => {
  return val && typeof val === 'object' && 'x' in val && 'y' in val && 'z' in val && Object.keys(val).length === 3;
};

export const AutoMappedNode = ({ obj, propName, label }: { key?: React.Key, obj: any, propName: string, label: string }) => {
  const value = obj[propName];

  if (typeof value === 'function') {
    return <ButtonInput label={label} obj={obj} prop={propName} />;
  }
  if (typeof value === 'number') {
    return <NumberInput label={label} obj={obj} prop={propName} />;
  }
  if (typeof value === 'string') {
    return <TextInput label={label} obj={obj} prop={propName} />;
  }
  if (typeof value === 'boolean') {
    return <BooleanInput label={label} obj={obj} prop={propName} />;
  }
  if (isVector2(value)) {
    return <Vector2Input label={label} obj={obj} prop={propName} />;
  }
  if (isVector3(value)) {
    return <Vector3Input label={label} obj={obj} prop={propName} />;
  }
  if (typeof value === 'object' && value !== null) {
    return (
      <InspectorCategory title={label}>
        {Object.keys(value).map(key => (
          <AutoMappedNode key={key} obj={value} propName={key} label={key} />
        ))}
      </InspectorCategory>
    );
  }
  return null;
};

export const SerializedNode = ({ propName, label, inspector = globalInspector }: { key?: React.Key, propName: string, label: string, inspector?: Inspector }) => {
  return <AutoMappedNode obj={inspector.serializedObject} propName={propName} label={label} />;
};

export const AutoInspector = ({ obj, inspector = globalInspector }: { obj: any, inspector?: Inspector }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub1 = inspector.onInspect(() => setTick(t => t + 1));
    const unsub2 = inspector.onStructureChange(() => setTick(t => t + 1));
    return () => {
      unsub1();
      unsub2();
    };
  }, [inspector]);

  if (!obj) return <div className="p-2 text-gray-500">No object selected</div>;

  const serializedKeys = Object.keys(inspector.serializedObject);

  return (
    <div className="flex flex-col gap-1">
      {Object.keys(obj).map(key => (
        <AutoMappedNode key={key} obj={obj} propName={key} label={key} />
      ))}
      
      {serializedKeys.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#333]">
          <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Serialized Fields</div>
          {serializedKeys.map(key => (
            <SerializedNode key={`ser_${key}`} propName={key} label={key} inspector={inspector} />
          ))}
        </div>
      )}
    </div>
  );
};
