import React from 'react';
import { InspectorCategory } from '../components/InspectorPanel';
import { useInspector } from '../hooks/useInspector';

export const Layers32Node = ({ obj }: { obj: any }) => {
  // Ensure the object has a layers property (THREE.Layers)
  if (!obj || !obj.layers) return null;

  const [mask, setMask] = useInspector<number>(obj.layers, 'mask');

  const toggleLayer = (i: number) => {
    obj.layers.toggle(i);
    setMask(obj.layers.mask);
  };

  return (
    <InspectorCategory title="Layers" defaultExpanded={false}>
      <div className="grid grid-cols-8 gap-1 p-1">
        {Array.from({ length: 32 }).map((_, i) => {
          const isActive = (mask & (1 << i)) !== 0;
          return (
            <button
              key={i}
              onClick={() => toggleLayer(i)}
              className={`h-5 text-[9px] font-mono rounded border flex items-center justify-center transition-colors ${
                isActive 
                  ? 'bg-blue-600 border-blue-400 text-white' 
                  : 'bg-[#141414] border-[#333] text-gray-500 hover:border-gray-500 hover:text-gray-300'
              }`}
              title={`Layer ${i}`}
            >
              {i}
            </button>
          );
        })}
      </div>
    </InspectorCategory>
  );
};
