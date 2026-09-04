import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
import { ComponentProps } from './ComponentRegistry';
import {
  AssetInput,
  SliderInput,
  BooleanInput,
  useInspector
} from '@/Plugins/Inspector/lib/inspector';

export const AudioComponentUI: React.FC<ComponentProps> = ({
  object,
  basePath
}) => {
  const [clip] = useInspector<any>(object, `${basePath}.data.clip`);
  const [volume] = useInspector<number>(object, `${basePath}.data.volume`);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clipPath = typeof clip === 'string' ? clip : clip?.value;

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePreview = () => {
    if (!clipPath) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = () => setIsPlaying(false);
      }
      audioRef.current.src = clipPath;
      audioRef.current.volume = volume ?? 1;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  return (
    <div className="flex flex-col gap-1 py-1">
      <AssetInput
        label="Audio Clip"
        obj={object}
        prop={`${basePath}.data.clip`}
        placeholder="Drop audio file (.mp3, .ogg, .wav)"
        accept={['.mp3', '.ogg', '.wav']}
      />

      <SliderInput
        label="Volume"
        obj={object}
        prop={`${basePath}.data.volume`}
        min={0}
        max={1}
        step={0.01}
      />

      <BooleanInput
        label="Loop"
        obj={object}
        prop={`${basePath}.data.loop`}
      />

      <BooleanInput
        label="Play On Start"
        obj={object}
        prop={`${basePath}.data.playOnStart`}
      />

      {clipPath && (
        <div className="mt-1 flex items-center justify-end">
          <button
            type="button"
            onClick={togglePreview}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-[#252525] hover:bg-[#333] text-gray-200 transition-colors border border-[#333]"
          >
            {isPlaying ? (
              <>
                <Square size={11} className="text-red-400 fill-red-400" />
                Stop Preview
              </>
            ) : (
              <>
                <Play size={11} className="text-green-400 fill-green-400" />
                Play Preview
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
