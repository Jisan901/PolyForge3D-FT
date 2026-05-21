import React, { useState, useEffect, useCallback } from 'react';
import {
  globalInspector,
  InspectorPanel,
  DefinedInspector,
  SelectInput,
  GUIInspector
} from './lib/inspector';
import { ThreeScene } from './components/ThreeScene';

export default function App() {
  const [objects, setObjects] = useState<Record<string, any>>({});
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [, setTick] = useState(0);

  // Force re-render when global inspector changes its target or structure
  useEffect(() => {
    const unsubInspect = globalInspector.onInspect(() => setTick(t => t + 1));
    const unsubStructure = globalInspector.onStructureChange(() => setTick(t => t + 1));
    return () => {
      unsubInspect();
      unsubStructure();
    };
  }, []);

  const handleObjectsReady = useCallback((objs: Record<string, any>) => {
    setObjects(objs);
    const firstKey = Object.keys(objs)[0];
    if (firstKey) {
      setSelectedKey(firstKey);
      globalInspector.inspect(objs[firstKey]);
    }
  }, []);

  const handleSelect = (key: string) => {
    setSelectedKey(key);
    globalInspector.inspect(objects[key]);
  };

  const options = Object.keys(objects).map(key => ({
    label: objects[key].name || key,
    value: key
  }));

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 flex gap-8 font-sans">
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4">Three.js Inspector</h1>
        <p className="text-gray-400 mb-8">
          A custom inspector built specifically for Three.js objects. Select an object from the dropdown to view its properties.
        </p>
        
        <div className="mb-4">
          <ThreeScene onObjectsReady={handleObjectsReady} />
        </div>
      </div>

      <div className="w-80 flex flex-col gap-4">
        <InspectorPanel title="Object Selection">
          <SelectInput 
            label="Inspect" 
            options={options} 
            value={selectedKey}
            onChange={handleSelect}
          />
        </InspectorPanel>

        {globalInspector.folders.length > 0 && (
          <InspectorPanel title="Custom GUI">
            <GUIInspector />
          </InspectorPanel>
        )}

        <InspectorPanel title="Defined Inspector">
          <DefinedInspector obj={globalInspector.currentObject} />
        </InspectorPanel>
      </div>
    </div>
  );
}
