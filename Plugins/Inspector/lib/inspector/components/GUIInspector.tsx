import React, { useEffect, useState } from 'react';
import { InspectorCategory } from './InspectorPanel';
import { NumberInput } from './NumberInput';
import { BooleanInput } from './BooleanInput';
import { TextInput } from './TextInput';
import { SelectInput } from './SelectInput';
import { ColorInput } from './ColorInput';
import { SliderInput } from './SliderInput';
import { GUIFolder, GUIController, globalInspector } from '../Inspector';

const ControllerNode: React.FC<{ controller: GUIController }> = ({ controller }) => {
  const { name, object, property, options } = controller;
  const value = object[property];
  const type = typeof value;

  const handleChange = (val: any) => {
    controller.setValue(val);
  };

  // If options are provided, use SelectInput
  if (options && Array.isArray(options)) {
    const formattedOptions = options.map(opt => 
      typeof opt === 'object' ? opt : { label: String(opt), value: opt }
    );
    return <SelectInput label={name} obj={object} prop={property} options={formattedOptions} onChange={handleChange} />;
  }
  
  if (options && typeof options === 'object' && !Array.isArray(options)) {
    // If options is an object like { min, max, step }
    if (type === 'number' || 'min' in options || 'max' in options || 'step' in options) {
      if ('min' in options && 'max' in options) {
        return (
          <SliderInput 
            label={name} 
            obj={object} 
            prop={property} 
            min={options.min} 
            max={options.max} 
            step={options.step} 
            onChange={handleChange} 
          />
        );
      }
      return (
        <NumberInput 
          label={name} 
          obj={object} 
          prop={property} 
          min={options.min} 
          max={options.max} 
          step={options.step} 
          onChange={handleChange} 
        />
      );
    }
  }

  // Fallback to type inference
  if (type === 'number') {
    return <NumberInput label={name} obj={object} prop={property} onChange={handleChange} />;
  }
  if (type === 'boolean') {
    return <BooleanInput label={name} obj={object} prop={property} onChange={handleChange} />;
  }
  if (type === 'string') {
    // Check if it looks like a color
    if (value && (value.startsWith('#') || value.startsWith('rgb'))) {
      return <ColorInput label={name} obj={object} prop={property} onChange={handleChange} />;
    }
    return <TextInput label={name} obj={object} prop={property} onChange={handleChange} />;
  }
  
  // If it's an object with r,g,b (like THREE.Color), use ColorInput
  if (value && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
    return <ColorInput label={name} obj={object} prop={property} onChange={handleChange} />;
  }

  return <div className="text-xs text-gray-500 pl-2">Unsupported type for {name}</div>;
};

const FolderNode: React.FC<{ folder: GUIFolder }> = ({ folder }) => {
  return (
    <InspectorCategory title={folder.title}>
      {folder.controllers.map((ctrl, i) => (
        <ControllerNode key={`ctrl-${i}`} controller={ctrl} />
      ))}
      {folder.folders.map((subFolder, i) => (
        <FolderNode key={`folder-${i}`} folder={subFolder} />
      ))}
    </InspectorCategory>
  );
};

export const GUIInspector = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = globalInspector.onStructureChange(() => {
      setTick(t => t + 1);
    });
    return unsub;
  }, []);

  if (globalInspector.folders.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      {globalInspector.folders.map((folder, i) => (
        <FolderNode key={`root-folder-${i}`} folder={folder} />
      ))}
    </div>
  );
};
