import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Square, SkipBack, SkipForward, Plus, Trash2, Clock, Settings2, Diamond, Timer, Film, ChevronDown } from 'lucide-react';
import { SceneObject } from '../types';
import ContextMenu, { MenuItem } from './ContextMenu';
import * as THREE from 'three';
import { AnimationUtils, UITrack } from './Utils/AnimationUtils';

interface TimelineEditorProps {
    selectedObject: SceneObject | null;
}

const TimelineEditor: React.FC<TimelineEditorProps> = ({ selectedObject }) => {

    const [currentTime, setCurrentTime] = useState(0); // Only for scrubbing/static UI
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(10);
    const [selectedClipIndex, setSelectedClipIndex] = useState(0);
    const [pixelsPerSecond, setPixelsPerSecond] = useState(100);
    const [showPropertyMenu, setShowPropertyMenu] = useState<{ x: number; y: number } | null>(null);
    const [showClipMenu, setShowClipMenu] = useState<{ x: number; y: number } | null>(null);
    const [updateTrigger, setUpdateTrigger] = useState(0);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const rulerRef = useRef<HTMLDivElement>(null);
    const animationUtilsRef = useRef<AnimationUtils>(new AnimationUtils());

    // PERFORMANCE: Refs for direct DOM manipulation to avoid re-renders
    const playheadRef = useRef<HTMLDivElement>(null);
    const playheadLineRef = useRef<HTMLDivElement>(null);
    const timeIndicatorRef = useRef<HTMLDivElement>(null);
    const currentTimeRef = useRef(0); // The "Real" time during playback

    // Sync refs when state changes (scrubbing)
    useEffect(() => {
        if (!isPlaying) {
            currentTimeRef.current = currentTime;
            updateVisuals(currentTime);
        }
    }, [currentTime, isPlaying]);

    // Helper to update DOM directly
    const updateVisuals = (time: number) => {
        const xPos = time * pixelsPerSecond;
        if (playheadRef.current) playheadRef.current.style.transform = `translateX(${xPos}px)`;
        if (playheadLineRef.current) playheadLineRef.current.style.transform = `translateX(${xPos}px)`;
        if (timeIndicatorRef.current) timeIndicatorRef.current.innerText = `${time.toFixed(2)}s`;
    };

    // Get active clip
    const activeClip = useMemo(() => {
        if (!selectedObject || !selectedObject.animations || selectedObject.animations.length === 0) {
            return null;
        }
        return selectedObject.animations[selectedClipIndex] || selectedObject.animations[0];
    }, [selectedObject, selectedClipIndex, updateTrigger]);

    // Convert Three.js tracks to UI tracks for rendering
    const uiTracks = useMemo((): UITrack[] => {
        return AnimationUtils.convertToUITracks(activeClip);
    }, [activeClip, updateTrigger]);

    // Initialize mixer when object changes
    useEffect(() => {
        if (!selectedObject) {
            animationUtilsRef.current.dispose();
            return;
        }
        animationUtilsRef.current.initializeMixer(selectedObject);
        return () => {
            animationUtilsRef.current.dispose();
        };
    }, [selectedObject?.uuid]);

    // Setup animation action when clip changes
    useEffect(() => {
        if (!activeClip || !selectedObject) return;
        // Don't use state currentTime here to avoid loop, use ref
        animationUtilsRef.current.setupAction(activeClip, currentTimeRef.current);
        return () => {
            animationUtilsRef.current.stopAllActions();
        };
    }, [activeClip, selectedObject, updateTrigger]);

    // Manual scrubber update
    useEffect(() => {
        if (!isPlaying) {
            animationUtilsRef.current.setTime(currentTime, false);
        }
    }, [currentTime, isPlaying]);
    // Add this inside TimelineEditor component

    // SYNC PLAY/PAUSE STATE
    useEffect(() => {
        // 1. Get the current time from your Ref (so we don't reset to 0)
        const time = currentTimeRef.current;

        // 2. If we are at the end (or past duration) and hitting play, reset to start
        if (isPlaying && time >= duration) {
            animationUtilsRef.current.setTime(0, true);
            currentTimeRef.current = 0;
            // Update the visual playhead immediately
            if (playheadRef.current) playheadRef.current.style.transform = `translateX(0px)`;
            if (playheadLineRef.current) playheadLineRef.current.style.transform = `translateX(0px)`;
        } else {
            // 3. Otherwise, just toggle the paused state
            // This sets action.paused = false when isPlaying is true
            animationUtilsRef.current.setTime(time, isPlaying);
        }
    }, [isPlaying, duration]);
    // Sync Play/Pause state with the Mixer
    useEffect(() => {
        // When isPlaying toggles, we must update the mixer's internal paused state.
        // We use currentTimeRef to ensure we don't reset the time effectively.
        animationUtilsRef.current.setTime(currentTimeRef.current, isPlaying);
    }, [isPlaying]);

    // --- OPTIMIZED ANIMATION LOOP ---
    useEffect(() => {
        if (!isPlaying) return;

        let animationId: number;
        animationUtilsRef.current.startClock();
        animationUtilsRef.current.setTime(0, true);
        // Inside your animate function in useEffect

        const animate = () => {
            if (!isPlaying) return;
            const delta = animationUtilsRef.current.getDelta();

            // Update logic ref
            let newTime = currentTimeRef.current + delta;

            // Loop or Stop check
            if (newTime >= duration) {
                newTime = duration; // or 0 if looping
                setIsPlaying(false);
                setCurrentTime(duration); // Sync React state at end
                return;
            }

            currentTimeRef.current = newTime;

            // 1. Direct DOM update (Fast, no React Render)
            updateVisuals(newTime);

            // 2. Update Three.js Mixer
            //animationUtilsRef.current.update(delta);
            animationUtilsRef.current.setTime(newTime, true);
            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            animationUtilsRef.current.stopClock();
            // Sync React state when pausing so UI controls match visual playhead
            setCurrentTime(currentTimeRef.current);
        };
    }, [isPlaying, duration, pixelsPerSecond]);
    // --------------------------------

    // Reset clip selection when object changes
    useEffect(() => {
        setSelectedClipIndex(0);
        setCurrentTime(0);
        currentTimeRef.current = 0;
    }, [selectedObject?.uuid]);

    const forceUpdate = useCallback(() => {
        setUpdateTrigger(prev => prev + 1);
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (rulerRef.current) {
            rulerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    const addClip = useCallback(() => {
        if (!selectedObject) return;

        const newClip = AnimationUtils.createClip(selectedObject);

        if (!selectedObject.animations) {
            selectedObject.animations = [];
        }
        selectedObject.animations.push(newClip);
        setSelectedClipIndex(selectedObject.animations.length - 1);
        forceUpdate();
    }, [selectedObject, forceUpdate]);

    const addTrack = useCallback((propertyPath: string, trackType: 'number' | 'vector' | 'quaternion' = 'number') => {
        if (!activeClip || !selectedObject) return;
        const existingTrack = activeClip.tracks.find(t => t.name === propertyPath);
        if (existingTrack) return;

        const newTrack = AnimationUtils.createTrack(selectedObject, propertyPath, trackType);
        activeClip.tracks.push(newTrack);
        forceUpdate();
    }, [activeClip, selectedObject, forceUpdate]);

    const addKeyframeToTrack = useCallback((uiTrack: UITrack, time: number) => {
        if (!activeClip || !selectedObject) return;
        const success = AnimationUtils.addKeyframe(uiTrack.threeTrack, selectedObject, time);
        if (success) forceUpdate();
    }, [activeClip, selectedObject, forceUpdate]);

    const deleteKeyframe = useCallback((uiTrack: UITrack, keyframeTime: number) => {
        if (!activeClip) return;
        const success = AnimationUtils.deleteKeyframe(uiTrack.threeTrack, keyframeTime);
        if (!success) {
            const trackIndex = activeClip.tracks.indexOf(uiTrack.threeTrack);
            if (trackIndex !== -1) activeClip.tracks.splice(trackIndex, 1);
        }
        forceUpdate();
    }, [activeClip, forceUpdate]);

    const propertyMenuItems = useMemo(() => {
        if (!selectedObject) return [];

        const items: MenuItem[] = [];

        // Transform properties
        items.push({
            label: '📐 Transform',
            action: () => { },
            submenu: [
                {
                    label: 'position (Vector3)',
                    action: () => addTrack(`${selectedObject.name}.position`, 'vector')
                },
                {
                    label: 'position.x',
                    action: () => addTrack(`${selectedObject.name}.position[x]`, 'number')
                },
                {
                    label: 'position.y',
                    action: () => addTrack(`${selectedObject.name}.position[y]`, 'number')
                },
                {
                    label: 'position.z',
                    action: () => addTrack(`${selectedObject.name}.position[z]`, 'number')
                },
                { separator: true, label: '', action: () => { } },
                {
                    label: 'rotation (Quaternion)',
                    action: () => addTrack(`${selectedObject.name}.quaternion`, 'quaternion')
                },
                {
                    label: 'rotation.x (Euler)',
                    action: () => addTrack(`${selectedObject.name}.rotation[x]`, 'number')
                },
                {
                    label: 'rotation.y (Euler)',
                    action: () => addTrack(`${selectedObject.name}.rotation[y]`, 'number')
                },
                {
                    label: 'rotation.z (Euler)',
                    action: () => addTrack(`${selectedObject.name}.rotation[z]`, 'number')
                },
                { separator: true, label: '', action: () => { } },
                {
                    label: 'scale (Vector3)',
                    action: () => addTrack(`${selectedObject.name}.scale`, 'vector')
                },
                {
                    label: 'scale.x',
                    action: () => addTrack(`${selectedObject.name}.scale[x]`, 'number')
                },
                {
                    label: 'scale.y',
                    action: () => addTrack(`${selectedObject.name}.scale[y]`, 'number')
                },
                {
                    label: 'scale.z',
                    action: () => addTrack(`${selectedObject.name}.scale[z]`, 'number')
                }
            ]
        });

        return items;
    }, [selectedObject, addTrack]);

    const clipMenuItems = useMemo(() => {
        const clips = selectedObject?.animations || [];
        const items: MenuItem[] = clips.map((clip, index) => ({
            label: clip.name,
            action: () => {
                setSelectedClipIndex(index);
                forceUpdate();
            },
            icon: Film
        }));
        if (items.length > 0) items.push({ separator: true, label: '', action: () => { } });
        items.push({ label: 'Create New Clip...', action: addClip, shortcut: 'Ctrl+N' });
        return items;
    }, [selectedObject?.animations, addClip, forceUpdate]);

    const handleTrackClick = (e: React.MouseEvent, uiTrack: UITrack) => {
        if (!scrollContainerRef.current) return;
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) + scrollContainerRef.current.scrollLeft;
        const time = x / pixelsPerSecond;
        addKeyframeToTrack(uiTrack, time);
    };

    const handleRulerClick = (e: React.MouseEvent) => {
        if (!rulerRef.current) return;
        const rect = rulerRef.current.getBoundingClientRect();
        const scrollLeft = rulerRef.current.scrollLeft;
        const x = (e.clientX - rect.left) + scrollLeft;
        const time = Math.max(0, Math.min(duration, x / pixelsPerSecond));
        setCurrentTime(time); // Scrubbing still triggers render, which is fine
    };

    // PERFORMANCE: Memoize ruler rendering. This is a heavy loop.
    const rulerMarkers = useMemo(() => {
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
                            style={{ left: (i + j / 10) * pixelsPerSecond }}
                        />
                    );
                }
            }
        }
        return markers;
    }, [duration, pixelsPerSecond]);

    const gridLines = useMemo(() => {
        return Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
            <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-white/[0.04] pointer-events-none"
                style={{ left: i * pixelsPerSecond }}
            />
        ));
    }, [duration, pixelsPerSecond]);

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
                    <button
                        className="p-1 hover:bg-white/10 rounded text-editor-textDim"
                        onClick={() => { currentTimeRef.current = 0; setCurrentTime(0); setIsPlaying(false); updateVisuals(0); }}
                        title="Rewind"
                    >
                        <SkipBack size={14} />
                    </button>
                    <button
                        className={`p-1 rounded transition-colors ${isPlaying ? 'bg-editor-accent text-white' : 'hover:bg-white/10 text-editor-textDim'}`}
                        onClick={() => { setIsPlaying(!isPlaying); setCurrentTime(currentTimeRef.current) }}
                        title={isPlaying ? "Stop" : "Play"}
                    >
                        {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    </button>
                    <button
                        className="p-1 hover:bg-white/10 rounded text-editor-textDim"
                        onClick={() => { currentTimeRef.current = duration; setCurrentTime(duration); setIsPlaying(false); updateVisuals(duration); }}
                        title="Fast Forward"
                    >
                        <SkipForward size={14} />
                    </button>
                </div>

                <div className="h-4 w-[1px] bg-editor-border mx-1" />

                {/* TIME DISPLAY: Ref-based text update */}
                <div className="text-[10px] font-mono text-editor-accent w-24 flex items-center gap-2 bg-black/30 px-2 py-0.5 rounded border border-white/5">
                    <Clock size={10} />
                    <span ref={timeIndicatorRef}>{currentTime.toFixed(2)}s</span>
                </div>

                {/* ... (Rest of toolbar remains mostly the same) ... */}
                <div className="flex items-center gap-2 ml-2">
                    <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-12 bg-transparent text-[10px] text-white border border-editor-border rounded px-1"
                    />
                    <span className="text-[10px] text-editor-textDim">sec</span>
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

                        <button
                            className="flex items-center gap-1 px-2 py-1 border border-editor-border hover:bg-white/5 text-[10px] rounded text-editor-text bg-editor-bg transition-all"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setShowPropertyMenu({ x: rect.left, y: rect.bottom + 4 });
                            }}
                        >
                            <Plus size={12} /> Add Track
                        </button>
                    </div>
                )}
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Track Names Panel */}
                <div className="w-56 border-r border-editor-border flex flex-col shrink-0 bg-editor-bg/30">
                    <div className="h-7 flex items-center px-3 border-b border-editor-border bg-editor-bg text-[9px] font-bold text-editor-textDim uppercase tracking-widest shrink-0">
                        Properties
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activeClip && (
                            <>
                                <div className="px-3 py-2 flex items-center gap-2 text-editor-text border-b border-editor-border/30 bg-white/5 sticky top-0 z-10 backdrop-blur-sm">
                                    <div className="w-2.5 h-2.5 bg-editor-accent rounded-sm" />
                                    <span className="text-xs font-bold truncate tracking-tight">{selectedObject.name}</span>
                                </div>
                                {uiTracks.map(track => (
                                    <div key={track.id} className="h-8 flex items-center px-3 text-[10px] text-editor-textDim border-b border-editor-border/10 group hover:bg-white/5 transition-colors">
                                        {/* ... Track controls ... */}
                                        <span className="flex-1 truncate font-mono opacity-80">{track.propertyPath}</span>
                                        <button onClick={() => {
                                            const idx = activeClip.tracks.indexOf(track.threeTrack);
                                            if (idx !== -1) { activeClip.tracks.splice(idx, 1); forceUpdate(); }
                                        }}><Trash2 size={10} /></button>
                                    </div>
                                ))}
                            </>
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
                            {rulerMarkers}

                            {/* Ruler Playhead (Small triangle) */}
                            <div
                                ref={playheadRef}
                                className="absolute top-0 h-full w-[1px] bg-red-500 z-20 pointer-events-none will-change-transform"
                                style={{ transform: `translateX(${currentTime * pixelsPerSecond}px)` }}
                            >
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-red-500" />
                            </div>
                        </div>
                    </div>

                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-auto bg-[#1a1a1a] relative custom-scrollbar"
                        onScroll={handleScroll}
                    >
                        <div style={{ width: duration * pixelsPerSecond + 100 }} className="min-h-full relative">
                            {gridLines}

                            {activeClip && (
                                <div className="flex flex-col">
                                    <div className="h-[41px] border-b border-editor-border/30 bg-white/[0.02]" />
                                    {uiTracks.map(track => (
                                        <div
                                            key={track.id}
                                            className="h-8 border-b border-editor-border/10 relative group hover:bg-white/[0.03] cursor-crosshair transition-colors"
                                            onClick={(e) => handleTrackClick(e, track)}
                                        >
                                            {track.keyframes.map(kf => (
                                                <div
                                                    key={kf.id}
                                                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-editor-accent rotate-45 border border-white/50 cursor-pointer z-10"
                                                    style={{ left: kf.time * pixelsPerSecond - 5 }}
                                                    onClick={(e) => { e.stopPropagation(); }}
                                                    onDoubleClick={(e) => { e.stopPropagation(); deleteKeyframe(track, kf.time); }}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* MAIN PLAYHEAD LINE: Ref-based transform */}
                            <div
                                ref={playheadLineRef}
                                className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.7)] will-change-transform"
                                style={{ transform: `translateX(${currentTime * pixelsPerSecond}px)` }}
                            />
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
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #18181b; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
        </div>
    );
};

export default TimelineEditor;