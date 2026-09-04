import React from 'react';
import { Play, Pause } from 'lucide-react';
import { ComponentProps } from './ComponentRegistry';
import {
  SelectInput,
  SliderInput,
  BooleanInput,
  useInspector
} from '@/Plugins/Inspector/lib/inspector';

export const AnimationComponentUI: React.FC<ComponentProps> = ({
  object,
  basePath
}) => {
  const [clips] = useInspector<any[]>(object, `${basePath}.data.clips`);
  const [current, setCurrent] = useInspector<string>(object, `${basePath}.data.current`);
  const [playing, setPlaying] = useInspector<boolean>(object, `${basePath}.data.playing`);

  // Detect animation clips from object if available
  const availableClips = Array.isArray(clips) && clips.length > 0
    ? clips
    : (object.animations || []).map((a: any) => a.name || 'Unnamed');

  const clipOptions = availableClips.map((c: any) => {
    const name = typeof c === 'string' ? c : c.name || 'Clip';
    return { label: name, value: name };
  });

  return (
    <div className="flex flex-col gap-1 py-1">
      {clipOptions.length > 0 ? (
        <SelectInput
          label="Current Clip"
          options={clipOptions}
          value={current || clipOptions[0]?.value}
          onChange={(val) => setCurrent(val)}
        />
      ) : (
        <div className="text-[11px] text-gray-500 italic py-1">
          No animation clips found on object
        </div>
      )}

      <SliderInput
        label="Speed"
        obj={object}
        prop={`${basePath}.data.speed`}
        min={-3}
        max={3}
        step={0.1}
      />

      <BooleanInput
        label="Loop"
        obj={object}
        prop={`${basePath}.data.loop`}
      />

      <div className="mt-1 flex items-center justify-between border-t border-[#262626] pt-1.5">
        <span className="text-xs text-gray-400 select-none">Playback</span>
        <button
          type="button"
          onClick={() => setPlaying(!playing)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors border ${
            playing
              ? 'bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/50'
              : 'bg-blue-950/40 border-blue-800 text-blue-300 hover:bg-blue-900/50'
          }`}
        >
          {playing ? (
            <>
              <Pause size={11} className="fill-amber-300" />
              Pause
            </>
          ) : (
            <>
              <Play size={11} className="fill-blue-300" />
              Play
            </>
          )}
        </button>
      </div>
    </div>
  );
};
