import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Settings, Volume2, VolumeX, Repeat } from 'lucide-react';
import { Editor } from "@/Editor/Editor";
import { THREE } from '@/Core/lib/THREE';
const editor = Editor;
import { AnimationUtils } from '@/Ui/components/Utils/AnimationUtils';




export const AnimationPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isRepeating, setIsRepeating] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [animations, setAnimations] = useState<THREE.AnimationClip[]>([]);
  const animationUtilsRef = useRef<AnimationUtils>(new AnimationUtils());
  const currentTimeRef = useRef(0);
  
  
  useEffect(() => {
        const unsub =  editor.api.buses.selectionUpdate.subscribe((target) => {
            
            if (!target) {
            animationUtilsRef.current.dispose();
            
            }
            
        
            
            setProgress(0)
            setAnimations([])
            if (!target&&!target?.isObject3D) return;
            const targetClips = target.animations;
            if(!(targetClips.length>0)) return;
            animationUtilsRef.current.initializeMixer(target);
            
            setAnimations(targetClips);
            
            
            
        });
        
        return () => {
            unsub()
            animationUtilsRef.current.dispose();
        };
  }, []);
  
  useEffect(() => {
      if (animationUtilsRef.current?.action) animationUtilsRef.current.action.paused = true;
        if (!isPlaying) return;

        let animationId: number;
        //animationUtilsRef.current.setTime(0, true);
        // Inside your animate function in useEffect
        
        animationUtilsRef.current.action.paused = false;
        const animate = (ft) => {
            if (!isPlaying) return;
        
            animationUtilsRef.current.update(editor.core.time.deltaTime)
            setProgress(animationUtilsRef.current.action.time);
            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [isPlaying]);
  
  
  

  const selectedClip = animations.find((a) => a.uuid === selectedClipId) ?? null;
  
  
  
      useEffect(() => {
          animationUtilsRef.current.stopAllActions();
        if (!selectedClip) return;        
        animationUtilsRef.current.action = animationUtilsRef.current.mixer?.clipAction?.(selectedClip);
        animationUtilsRef.current.action?.play?.()
        if (animationUtilsRef.current.action)animationUtilsRef.current.action.paused = true;

        return () => {
            animationUtilsRef.current.stopAllActions();
        };
    }, [selectedClip]);

    
    useEffect(()=>{
        animationUtilsRef.current.action && animationUtilsRef.current.action.setLoop(isRepeating?THREE.LoopRepeat:THREE.LoopOnce)
    },[isRepeating])
  
  useEffect(()=>{
      animationUtilsRef.current?.action?.paused&&animationUtilsRef.current.setTime(progress, false)
  },[progress])
  useEffect(()=>{
      if(animationUtilsRef.current?.action) animationUtilsRef.current.action.timeScale=playbackSpeed
  },[playbackSpeed])
  
  

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(0).padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentTime = selectedClip
    ? (progress / 100) * selectedClip.duration
    : 0;

  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <div className="h-full w-full flex flex-col bg-editor-panel text-editor-text font-sans">
      {/* Toolbar */}
      <div className="h-8 border-b border-editor-border bg-editor-bg flex items-center px-2 justify-between shrink-0">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-semibold text-white">Animation Player</span>
          {selectedClip && (
            <span className="text-editor-textDim px-2 py-0.5 bg-black/20 rounded">
              {selectedClip.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="bg-[#2a2a2a] border border-editor-border rounded text-[10px] text-white px-1 py-0.5 outline-none"
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2.0x</option>
          </select>
          <button className="p-1 rounded hover:bg-white/10 text-editor-textDim transition-colors">
            <Settings size={12} />
          </button>
        </div>
      </div>

      {/* Clip List */}
      <div className="flex-1 overflow-y-auto bg-[#111]">
        {animations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-xs text-editor-textDim">No animation clips loaded</p>
          </div>
        ) : (
          <ul className="divide-y divide-editor-border/30">
            {animations.map((clip) => (
              <li
                key={clip.uuid}
                onClick={() => {
                  setSelectedClipId(clip.uuid);
                  setProgress(0);
                  setIsPlaying(false);
                }}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer text-[11px] transition-colors ${
                  selectedClipId === clip.id
                    ? 'bg-editor-accent/20 text-white'
                    : 'hover:bg-white/5 text-editor-textDim'
                }`}
              >
                <span className="truncate">{clip.name}</span>
                <span className="ml-2 font-mono text-[10px] shrink-0 text-editor-textDim">
                  {formatTime(clip.duration)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Transport Controls */}
      <div className="h-14 border-t border-editor-border bg-editor-panel flex flex-col justify-center px-4 shrink-0 gap-1">
        {/* Scrubber */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-editor-textDim font-mono w-8 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={selectedClip? selectedClip.duration:100}
            step={0.01}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            disabled={!selectedClip}
            className="flex-1 h-1.5 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent disabled:opacity-40"
          />
          <span className="text-[9px] text-editor-textDim font-mono w-8">
            {selectedClip ? formatTime(selectedClip.duration) : '0:00'}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 rounded hover:bg-white/10 text-editor-textDim transition-colors"
          >
            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          <button
            className="p-1 rounded hover:bg-white/10 text-editor-textDim transition-colors"
            onClick={() => {setProgress(0);setIsPlaying(false)}}
          >
            <SkipBack size={14} fill="currentColor" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!selectedClip}
            className="p-1.5 rounded bg-editor-accent hover:bg-editor-accent/90 text-white transition-colors disabled:opacity-40"
          >
            {isPlaying ? (
              <Pause size={14} fill="currentColor" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
          </button>

          <button
            className="p-1 rounded hover:bg-white/10 text-editor-textDim transition-colors"
            onClick={() => {setProgress(selectedClip?selectedClip.duration:100);setIsPlaying(false)}}
          >
            <SkipForward size={14} fill="currentColor" />
          </button>

          <button
            onClick={() => setIsRepeating(!isRepeating)}
            className={`p-1 rounded transition-colors ${
              isRepeating
                ? 'text-editor-accent bg-editor-accent/10'
                : 'hover:bg-white/10 text-editor-textDim'
            }`}
            title="Toggle Repeat"
          >
            <Repeat size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnimationPlayer;