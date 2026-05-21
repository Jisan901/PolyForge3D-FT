import React, { useReducer } from 'react';
import * as THREE from 'three';
import { InspectorCategory } from '../components/InspectorPanel';
import { TextureNode } from './TextureNode';

export const MaterialTexturesNode = ({ obj, textureTypes }: { obj: any, textureTypes: { prop: string, label: string }[] }) => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const handleAddTexture = (prop: string) => {
    obj[prop] = new THREE.Texture();
    obj.needsUpdate = true;
    forceUpdate();
  };

  const handleRemoveTexture = (prop: string) => {
    if (obj[prop]) {
      obj[prop].dispose();
      obj[prop] = null;
      obj.needsUpdate = true;
      forceUpdate();
    }
  };

  return (
    <InspectorCategory title="Textures" defaultExpanded={false}>
      <div className="flex flex-col gap-1">
        {textureTypes.map(({ prop, label }) => {
          const hasTex = !!obj[prop];
          if (hasTex) {
            return (
              <div key={prop} className="flex flex-col gap-1 border border-[#333] rounded p-1 bg-[#141414]">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-semibold text-gray-300">{label}</span>
                  <button 
                    onClick={() => handleRemoveTexture(prop)}
                    className="text-[10px] bg-red-900/30 text-red-400 hover:bg-red-900/50 px-2 py-0.5 rounded border border-red-900/50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <TextureNode obj={obj[prop]} title="Settings" expanded={false} />
              </div>
            );
          } else {
            return (
              <div key={prop} className="flex justify-between items-center px-2 py-1 bg-[#141414] border border-[#333] rounded">
                <span className="text-xs text-gray-400">{label}</span>
                <button 
                  onClick={() => handleAddTexture(prop)}
                  className="text-[10px] bg-[#252525] text-gray-300 hover:bg-[#333] px-2 py-0.5 rounded border border-[#333] transition-colors"
                >
                  Add
                </button>
              </div>
            );
          }
        })}
      </div>
    </InspectorCategory>
  );
};
