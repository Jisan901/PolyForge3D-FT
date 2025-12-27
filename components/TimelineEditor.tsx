import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Square, SkipBack, SkipForward, Plus, Trash2, Clock, Settings2, Diamond, Timer, Film, ChevronDown } from 'lucide-react';
import { SceneObject, AnimationClip, AnimationTrack, Keyframe } from '../types';
import ContextMenu, { MenuItem } from './ContextMenu';

interface TimelineEditorProps {
  selectedObject: SceneObject | null;
}

const TimelineEditor: React.FC<TimelineEditorProps> = ({ selectedObject }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(10); 
  const [clips, setClips] = useState<AnimationClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(100);
  const [showPropertyMenu, setShowPropertyMenu] = useState<{ x: number; y: number } | null>(null);
  const [showClipMenu, setShowClipMenu] = useState<{ x: number; y: number } | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  // Synchronize horizontal scrolling between ruler and tracks
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (rulerRef.current) {
      rulerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Filter clips belonging to the selected object
  const objectClips = useMemo(() => {
    if (!selectedObject) return [];
    return clips.filter(c => c.objectId === selectedObject.id);
  }, [selectedObject, clips]);

  // Find the active clip based on selection or fallback to first
  const activeClip = useMemo(() => {
    if (!selectedObject) return null;
    if (selectedClipId) {
      const found = clips.find(c => c.id === selectedClipId && c.objectId === selectedObject.id);
      if (found) return found;
    }
    return objectClips[0] || null;
  }, [selectedObject, selectedClipId, objectClips, clips]);

  // Reset selected clip ID when object changes
  useEffect(() => {
    if (objectClips.length > 0) {
      setSelectedClipId(objectClips[0].id);
    } else {
      setSelectedClipId(null);
    }
  }, [selectedObject?.id]);

  const addClip = useCallback(() => {
    if (!selectedObject) return;
    const clipCount = objectClips.length;
    const newId = `clip-${Date.now()}`;
    const newClip: AnimationClip = {
      id: newId,
      name: clipCount === 0 ? `${selectedObject.name}_Anim` : `${selectedObject.name}_Anim_${clipCount + 1}`,
      objectId: selectedObject.id,
      tracks: []
    };
    setClips(prev => [...prev, newClip]);
    setSelectedClipId(newId);
  }, [selectedObject, objectClips]);

  const addTrack = useCallback((propertyPath: string) => {
    if (!activeClip) return;
    setClips(prev => prev.map(clip => {
      if (clip.id !== activeClip.id) return clip;
      if (clip.tracks.some(t => t.propertyPath === propertyPath)) return clip;

      const newTrack: AnimationTrack = {
        id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        propertyPath,
        keyframes: []
      };
      return { ...clip, tracks: [...clip.tracks, newTrack] };
    }));
  }, [activeClip]);

  const addKeyframeToTrack = useCallback((trackId: string, time: number) => {
    if (!activeClip) return;
    const snappedTime = Math.round(time * 10) / 10;
    setClips(prev => prev.map(clip => {
      if (clip.id !== activeClip.id) return clip;
      return {
        ...clip,
        tracks: clip.tracks.map(track => {
          if (track.id !== trackId) return track;
          const exists = track.keyframes.some(k => Math.abs(k.time - snappedTime) < 0.05);
          if (exists) return track;

          const newKey: Keyframe = {
            id: `key-${Date.now()}-${Math.random()}`,
            time: snappedTime,
            value: 0 
          };
          return { ...track, keyframes: [...track.keyframes, newKey].sort((a, b) => a.time - b.time) };
        })
      };
    }));
  }, [activeClip]);

  const addKeyframeToAllTracks = useCallback(() => {
    if (!activeClip) return;
    const snappedTime = Math.round(currentTime * 10) / 10;
    
    setClips(prev => prev.map(clip => {
      if (clip.id !== activeClip.id) return clip;
      return {
        ...clip,
        tracks: clip.tracks.map(track => {
          const exists = track.keyframes.some(k => Math.abs(k.time - snappedTime) < 0.05);
          if (exists) return track;
          
          const newKey: Keyframe = {
            id: `key-${Date.now()}-${Math.random()}`,
            time: snappedTime,
            value: 0
          };
          return {
            ...track,
            keyframes: [...track.keyframes, newKey].sort((a, b) => a.time - b.time)
          };
        })
      };
    }));
  }, [activeClip, currentTime]);

  const getPropertyItems = useCallback((obj: any, prefix = ''): MenuItem[] => {
    if (!obj || typeof obj !== 'object' || obj === null) return [];
    
    return Object.entries(obj).flatMap(([key, value]): MenuItem[] => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (['id', 'children', 'expanded', 'type', 'name'].includes(key)) return [];

      if (value !== null && typeof value === 'object' && 'x' in value && 'y' in value) {
        return [
          { label: `${key}.X`, action: () => addTrack(`${path}.x`) },
          { label: `${key}.Y`, action: () => addTrack(`${path}.y`) },
          { label: `${key}.Z`, action: () => addTrack(`${path}.z`) }
        ];
      }
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const subItems = getPropertyItems(value, path);
        if (subItems.length === 0) return [];
        return [{
          label: key.charAt(0).toUpperCase() + key.slice(1),
          action: () => {},
          submenu: subItems
        }];
      } 
      
      return [{ label: key, action: () => addTrack(path) }];
    });
  }, [addTrack]);

  const propertyMenuItems = useMemo(() => {
    if (!selectedObject) return [];
    return getPropertyItems(selectedObject);
  }, [selectedObject, getPropertyItems]);

  const clipMenuItems = useMemo(() => {
    const items: MenuItem[] = objectClips.map(clip => ({
      label: clip.name,
      action: () => setSelectedClipId(clip.id),
      icon: Film
    }));

    if (items.length > 0) items.push({ separator: true, label: '', action: () => {} });
    
    items.push({
      label: 'Create New Clip...',
      action: addClip,
      shortcut: 'Ctrl+N'
    });

    return items;
  }, [objectClips, addClip]);

  const deleteKeyframe = useCallback((trackId: string, keyframeId: string) => {
    if (!activeClip) return;
    setClips(prev => prev.map(clip => {
      if (clip.id !== activeClip.id) return clip;
      return {
        ...clip,
        tracks: clip.tracks.map(track => {
          if (track.id !== trackId) return track;
          return { ...track, keyframes: track.keyframes.filter(k => k.id !== keyframeId) };
        })
      };
    }));
  }, [activeClip]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      const fps = 30;
      const step = 1 / fps;
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return prev + step;
        });
      }, 1000 / fps);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const handleTrackClick = (e: React.MouseEvent, trackId: string) => {
    if (!scrollContainerRef.current) return;
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) + scrollContainerRef.current.scrollLeft;
    const time = x / pixelsPerSecond;
    addKeyframeToTrack(trackId, time);
  };

  const handleRulerClick = (e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const scrollLeft = rulerRef.current.scrollLeft;
    const x = (e.clientX - rect.left) + scrollLeft;
    const time = Math.max(0, Math.min(duration, x / pixelsPerSecond));
    setCurrentTime(time);
  };

  const renderRuler = () => {
    const markers = [];
    for (let i = 0; i <= duration; i++) {
      markers.push(
        <div 
          key={i} 
          className="absolute h-full border-l border-editor-border flex flex-col justify-end pb-1 pointer-events-none"
          style={{ left: i * pixelsPerSecond }}
        >
          <span className="text-[9px] ml-1 text-editor-textDim select-none font-mono">{i}s</span>
        </div>
      );
      if (i < duration) {
        for (let j = 1; j < 10; j++) {
            markers.push(
                <div 
                  key={`${i}.${j}`} 
                  className={`absolute bottom-0 border-l border-editor-border/20 ${j === 5 ? 'h-2' : 'h-1'}`}
                  style={{ left: (i + j/10) * pixelsPerSecond }}
                />
              );
        }
      }
    }
    return markers;
  };

  if (!selectedObject) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-editor-panel text-editor-textDim">
        <Clock size={32} className="mb-2 opacity-20" />
        <span className="text-xs">Select an object to edit animations</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-editor-panel overflow-hidden border-t border-editor-border">
      {/* Timeline Toolbar */}
      <div className="h-8 flex items-center px-3 border-b border-editor-border bg-editor-bg shrink-0 gap-3">
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-white/10 rounded text-editor-textDim" onClick={() => setCurrentTime(0)} title="Rewind"><SkipBack size={14} /></button>
          <button 
            className={`p-1 rounded transition-colors ${isPlaying ? 'bg-editor-accent text-white' : 'hover:bg-white/10 text-editor-textDim'}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Stop" : "Play"}
          >
            {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
          <button className="p-1 hover:bg-white/10 rounded text-editor-textDim" onClick={() => setCurrentTime(duration)} title="Fast Forward"><SkipForward size={14} /></button>
        </div>

        <div className="h-4 w-[1px] bg-editor-border mx-1" />

        <div className="text-[10px] font-mono text-editor-accent w-24 flex items-center gap-2 bg-black/30 px-2 py-0.5 rounded border border-white/5">
          <Clock size={10} />
          {currentTime.toFixed(2)}s
        </div>

        <div className="flex items-center gap-2 ml-2">
            <Timer size={12} className="text-editor-textDim" />
            <div className="flex items-center bg-editor-input border border-editor-border rounded overflow-hidden h-5">
                <input 
                  type="number" 
                  min="1" 
                  max="300" 
                  value={duration} 
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 bg-transparent text-[10px] text-white px-1 focus:outline-none no-spinner text-center"
                />
                <span className="text-[9px] text-editor-textDim pr-1.5 border-l border-editor-border/30 pl-1 bg-white/5">sec</span>
            </div>
        </div>

        <div className="flex-1" />

        {!activeClip ? (
          <button 
            className="flex items-center gap-1 px-3 py-1 bg-editor-accent hover:bg-editor-accentHover text-white text-[10px] rounded transition-colors font-medium shadow-lg"
            onClick={addClip}
          >
            <Plus size={12} />
            Create Animation Clip
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {/* Clip Selector */}
            <button 
               className="flex items-center gap-2 px-3 py-1 bg-editor-panel border border-editor-border hover:bg-white/5 rounded text-[10px] text-editor-text group transition-all"
               onClick={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect();
                 setShowClipMenu({ x: rect.left, y: rect.bottom + 4 });
               }}
            >
               <Film size={12} className="text-editor-accent" />
               <span className="max-w-[120px] truncate font-bold">{activeClip.name}</span>
               <ChevronDown size={10} className="text-editor-textDim group-hover:text-white" />
            </button>
            
{/*            <button 
              className="flex items-center gap-1 px-2 py-1 border border-editor-border hover:bg-white/5 text-[10px] rounded text-editor-text bg-editor-bg transition-all ml-2"
              onClick={addKeyframeToAllTracks}
            >
              <Diamond size={10} className="text-editor-accent fill-editor-accent" />
              Key All
            </button>*/}

            <button 
              className="flex items-center gap-1 px-2 py-1 border border-editor-border hover:bg-white/5 text-[10px] rounded text-editor-text bg-editor-bg transition-all"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setShowPropertyMenu({ x: rect.left, y: rect.bottom + 4 });
              }}
            >
              <Plus size={12} /> Add
            </button>
          </div>
        )}
        
        <div className="h-4 w-[1px] bg-editor-border mx-1" />
        <button className="p-1 hover:bg-white/10 rounded text-editor-textDim"><Settings2 size={14} /></button>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Track Names Panel */}
        <div className="w-56 border-r border-editor-border flex flex-col shrink-0 bg-editor-bg/30">
          <div className="h-7 flex items-center px-3 border-b border-editor-border bg-editor-bg text-[9px] font-bold text-editor-textDim uppercase tracking-widest shrink-0">
            Properties
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeClip ? (
              <>
                <div className="px-3 py-2 flex items-center gap-2 text-editor-text border-b border-editor-border/30 bg-white/5 sticky top-0 z-10 backdrop-blur-sm">
                  <div className="w-2.5 h-2.5 bg-editor-accent rounded-sm" />
                  <span className="text-xs font-bold truncate tracking-tight">{selectedObject.name}</span>
                </div>
                {activeClip.tracks.map(track => (
                  <div key={track.id} className="h-8 flex items-center px-3 text-[10px] text-editor-textDim border-b border-editor-border/10 group hover:bg-white/5 transition-colors">
                    <button 
                      className="p-1 hover:bg-white/10 rounded mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => addKeyframeToTrack(track.id, currentTime)}
                    >
                      <Diamond size={10} className="hover:text-editor-accent transition-colors" />
                    </button>
                    <span className="flex-1 truncate font-mono opacity-80">{track.propertyPath}</span>
                    <button 
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded transition-all"
                      onClick={() => {
                         setClips(prev => prev.map(c => c.id === activeClip.id ? {
                           ...c,
                           tracks: c.tracks.filter(t => t.id !== track.id)
                         } : c));
                      }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <div className="p-4 text-center text-[10px] text-editor-textDim italic opacity-40">Create a clip to start animating</div>
            )}
          </div>
        </div>

        {/* Right Tracks View */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div 
            ref={rulerRef}
            className="h-7 bg-editor-bg border-b border-editor-border relative overflow-hidden shrink-0 cursor-pointer"
            onClick={handleRulerClick}
          >
            <div style={{ width: duration * pixelsPerSecond + 100 }} className="h-full relative">
              {renderRuler()}
            </div>
          </div>

          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-auto bg-[#1a1a1a] relative custom-scrollbar" 
            onScroll={handleScroll}
          >
             <div style={{ width: duration * pixelsPerSecond + 100 }} className="min-h-full relative">
                {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute top-0 bottom-0 border-l border-white/[0.04] pointer-events-none"
                    style={{ left: i * pixelsPerSecond }}
                  />
                ))}

                {activeClip && (
                  <div className="flex flex-col">
                    <div className="h-[41px] border-b border-editor-border/30 bg-white/[0.02]" />
                    {activeClip.tracks.map(track => (
                      <div 
                        key={track.id} 
                        className="h-8 border-b border-editor-border/10 relative group hover:bg-white/[0.03] cursor-crosshair transition-colors"
                        onClick={(e) => handleTrackClick(e, track.id)}
                      >
                         {track.keyframes.map(kf => (
                           <div
                             key={kf.id}
                             className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-editor-accent rotate-45 border border-white/50 cursor-pointer z-10 hover:scale-125 hover:bg-white transition-all"
                             style={{ left: kf.time * pixelsPerSecond - 5 }}
                             onClick={(e) => e.stopPropagation()}
                             onDoubleClick={(e) => {
                               e.stopPropagation();
                               deleteKeyframe(track.id, kf.id);
                             }}
                           />
                         ))}
                      </div>
                    ))}
                  </div>
                )}

                <div 
                  className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                  style={{ left: currentTime * pixelsPerSecond }}
                >
                  <div className="absolute -top-[1.25rem] left-1/2 -translate-x-1/2 w-3 h-4 bg-red-500 clip-playhead shadow-lg" />
                </div>
             </div>
          </div>
        </div>
      </div>

      {showPropertyMenu && (
        <ContextMenu 
           x={showPropertyMenu.x}
           y={showPropertyMenu.y}
           items={propertyMenuItems}
           onClose={() => setShowPropertyMenu(null)}
        />
      )}

      {showClipMenu && (
        <ContextMenu 
           x={showClipMenu.x}
           y={showClipMenu.y}
           items={clipMenuItems}
           onClose={() => setShowClipMenu(null)}
        />
      )}
      
      <style>{`
        .clip-playhead { clip-path: polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%); }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #18181b; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
        .no-spinner::-webkit-inner-spin-button, .no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
};
export default  TimelineEditor;