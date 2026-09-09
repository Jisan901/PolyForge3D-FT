import React from 'react';
import { ComponentProps } from './ComponentRegistry';
import {
  NumberInput,
  BooleanInput,
  useInspector
} from '@/Plugins/Inspector/lib/inspector';

export const RigidbodyComponentUI: React.FC<ComponentProps> = ({
  object,
  basePath
}) => {
  const [useGravity] = useInspector<boolean>(object, `${basePath}.data.useGravity`);
  const [isStatic] = useInspector<boolean>(object, `${basePath}.data.isStatic`);
  const [isKinematic] = useInspector<boolean>(object, `${basePath}.data.isKinematic`);

  const [lockX, setLockX] = useInspector<boolean>(object, `${basePath}.data.lockTranslationX`);
  const [lockY, setLockY] = useInspector<boolean>(object, `${basePath}.data.lockTranslationY`);
  const [lockZ, setLockZ] = useInspector<boolean>(object, `${basePath}.data.lockTranslationZ`);

  const [lockRotX, setLockRotX] = useInspector<boolean>(object, `${basePath}.data.lockRotationX`);
  const [lockRotY, setLockRotY] = useInspector<boolean>(object, `${basePath}.data.lockRotationY`);
  const [lockRotZ, setLockRotZ] = useInspector<boolean>(object, `${basePath}.data.lockRotationZ`);

  return (
    <div className="flex flex-col gap-2 py-1 text-xs">
      {/* Basic Settings */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-0.5">
          Body Settings
        </span>
        <NumberInput
          label="Mass"
          obj={object}
          prop={`${basePath}.data.mass`}
          min={0.001}
          step={0.1}
        />
        <BooleanInput
          label="Use Gravity"
          obj={object}
          prop={`${basePath}.data.useGravity`}
        />
        {useGravity !== false && (
          <NumberInput
            label="Gravity Scale"
            obj={object}
            prop={`${basePath}.data.gravityScale`}
            step={0.1}
          />
        )}
      </div>

      {/* Body Types */}
      <div className="flex flex-col gap-1 border-t border-[#262626] pt-1.5">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-0.5">
          Body Type
        </span>
        <BooleanInput
          label="Is Static"
          obj={object}
          prop={`${basePath}.data.isStatic`}
        />
        <BooleanInput
          label="Is Kinematic"
          obj={object}
          prop={`${basePath}.data.isKinematic`}
        />
        {isKinematic && (
          <BooleanInput
            label="Update Kinematic"
            obj={object}
            prop={`${basePath}.data.updateKinematic`}
          />
        )}
      </div>

      {/* Damping */}
      {!isStatic && (
        <div className="flex flex-col gap-1 border-t border-[#262626] pt-1.5">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-0.5">
            Damping
          </span>
          <NumberInput
            label="Linear Drag"
            obj={object}
            prop={`${basePath}.data.drag`}
            min={0}
            step={0.01}
          />
          <NumberInput
            label="Angular Drag"
            obj={object}
            prop={`${basePath}.data.angularDrag`}
            min={0}
            step={0.01}
          />
        </div>
      )}

      {/* Constraints (Freeze Axis) */}
      {!isStatic && (
        <div className="flex flex-col gap-1 border-t border-[#262626] pt-1.5">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-0.5">
            Constraints
          </span>

          {/* Freeze Position */}
          <div className="flex items-center justify-between py-0.5">
            <span className="text-gray-400 text-xs">Freeze Position</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer text-gray-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={!!lockX}
                  onChange={(e) => setLockX(e.target.checked)}
                  className="rounded bg-[#1a1a1a] border-[#333] text-blue-500 focus:ring-0 w-3 h-3 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-red-400">X</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-gray-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={!!lockY}
                  onChange={(e) => setLockY(e.target.checked)}
                  className="rounded bg-[#1a1a1a] border-[#333] text-blue-500 focus:ring-0 w-3 h-3 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-green-400">Y</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-gray-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={!!lockZ}
                  onChange={(e) => setLockZ(e.target.checked)}
                  className="rounded bg-[#1a1a1a] border-[#333] text-blue-500 focus:ring-0 w-3 h-3 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-blue-400">Z</span>
              </label>
            </div>
          </div>

          {/* Freeze Rotation */}
          <div className="flex items-center justify-between py-0.5">
            <span className="text-gray-400 text-xs">Freeze Rotation</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer text-gray-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={!!lockRotX}
                  onChange={(e) => setLockRotX(e.target.checked)}
                  className="rounded bg-[#1a1a1a] border-[#333] text-blue-500 focus:ring-0 w-3 h-3 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-red-400">X</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-gray-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={!!lockRotY}
                  onChange={(e) => setLockRotY(e.target.checked)}
                  className="rounded bg-[#1a1a1a] border-[#333] text-blue-500 focus:ring-0 w-3 h-3 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-green-400">Y</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-gray-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={!!lockRotZ}
                  onChange={(e) => setLockRotZ(e.target.checked)}
                  className="rounded bg-[#1a1a1a] border-[#333] text-blue-500 focus:ring-0 w-3 h-3 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-blue-400">Z</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings */}
      <div className="flex flex-col gap-1 border-t border-[#262626] pt-1.5">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-0.5">
          Advanced
        </span>
        <BooleanInput
          label="Continuous Detection (CCD)"
          obj={object}
          prop={`${basePath}.data.ccdEnabled`}
        />
        <BooleanInput
          label="Allow Sleep"
          obj={object}
          prop={`${basePath}.data.canSleep`}
        />
        <NumberInput
          label="Dominance Group"
          obj={object}
          prop={`${basePath}.data.dominance`}
          step={1}
          min={-127}
          max={127}
        />
      </div>
    </div>
  );
};
