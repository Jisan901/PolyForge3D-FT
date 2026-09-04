import React from 'react';
import { ComponentProps } from './ComponentRegistry';
import {
  BooleanInput,
  NumberInput,
  AssetInput
} from '@/Plugins/Inspector/lib/inspector';

export const LODComponentUI: React.FC<ComponentProps> = ({
  object,
  basePath
}) => {
  const levels = [0, 1, 2, 3];

  return (
    <div className="flex flex-col gap-1 py-1">
      <BooleanInput
        label="Enabled"
        obj={object}
        prop={`${basePath}.data.enabled`}
      />

      <div className="mt-1 flex flex-col gap-2">
        {levels.map((lvl) => (
          <div
            key={lvl}
            className="p-1.5 rounded bg-[#161616] border border-[#2a2a2a] flex flex-col gap-1"
          >
            <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
              Level {lvl}
            </div>
            <NumberInput
              label="Distance"
              obj={object}
              prop={`${basePath}.data.level ${lvl}.distance`}
              min={0}
              step={1}
            />
            <AssetInput
              label="Mesh File"
              obj={object}
              prop={`${basePath}.data.level ${lvl}.file`}
              placeholder="Drop model (.gltf, .glb, .fbx, .obj)"
              accept={['.gltf', '.glb', '.fbx', '.obj']}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
