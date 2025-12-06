import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, LayoutTemplate, Settings, Hammer, FilePlus, Layers } from 'lucide-react';
import Hierarchy from './components/Hierarchy';
import Inspector from './components/Inspector';
import Viewport from './components/Viewport';
import AssetBrowser from './components/AssetBrowser';
import ConsolePanel, { LogEntry } from './components/ConsolePanel';
import ContextMenu, { MenuItem } from './components/ContextMenu';
import { INITIAL_SCENE, MOCK_ASSETS } from './constants';
import { SceneObject, ViewMode, AssetFile, ObjectType } from './types';

function App() {
  // Application State
  const [sceneData, setSceneData] = useState<SceneObject[]>(INITIAL_SCENE);
  const [assets, setAssets] = useState<AssetFile[]>(MOCK_ASSETS);
  const [selectedId, setSelectedId] = useState<string | null>('cam-1');
  const [viewMode, setViewMode] = useState<ViewMode>('SCENE');
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'Project' | 'Console' | 'Animation'>('Project');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Menu State
  const [activeMenu, setActiveMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const navFileRef = useRef<HTMLDivElement>(null);
  const navEditRef = useRef<HTMLDivElement>(null);
  const navGameObjectRef = useRef<HTMLDivElement>(null);

  // Resize State
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(280);
  const [bottomHeight, setBottomHeight] = useState(300);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | 'bottom' | null>(null);

  // --- Console Logging Effect ---
  useEffect(() => {
    // Preserve original console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (type: 'log' | 'warn' | 'error', args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

      setLogs(prev => {
        const newLogs = [...prev, { type, message, timestamp, count: 1 }];
        // Keep max 25
        if (newLogs.length > 25) return newLogs.slice(newLogs.length - 25);
        return newLogs;
      });
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    return () => {
      // Restore original console methods
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  // Helper to find object by ID (simple DFS)
  const findObject = (nodes: SceneObject[], id: string): SceneObject | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findObject(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedObject = selectedId ? findObject(sceneData, selectedId) : null;

  const toggleExpand = (id: string) => {
    const updateNodes = (nodes: SceneObject[]): SceneObject[] => {
      return nodes.map(node => {
        if (node.id === id) return { ...node, expanded: !node.expanded };
        if (node.children) return { ...node, children: updateNodes(node.children) };
        return node;
      });
    };
    setSceneData(updateNodes(sceneData));
  };

  // Actions
  const handleAddComponent = (componentName: string) => {
    if (!selectedId) return;

    console.log(`Adding component: ${componentName} to object ${selectedId}`);

    const getComponentData = (name: string) => {
        switch(name) {
            case 'RigidBody': return { mass: 1, drag: 0, useGravity: true, isKinematic: false };
            case 'BoxCollider': return { isTrigger: false, center: {x:0, y:0, z:0}, size: {x:1, y:1, z:1} };
            case 'SphereCollider': return { isTrigger: false, center: {x:0, y:0, z:0}, radius: 0.5 };
            case 'Light': return { color: '#ffffff', intensity: 1, range: 10, type: 'Point' };
            case 'Camera': return { fov: 60, near: 0.1, far: 1000 };
            case 'Script': return { name: 'NewScript.cs', enabled: true };
            default: return { enabled: true };
        }
    };

    const updateObject = (nodes: SceneObject[]): SceneObject[] => {
        return nodes.map(node => {
            if (node.id === selectedId) {
                // Ensure unique key for component if multiple of same type allowed (simplified here)
                const newKey = componentName.charAt(0).toLowerCase() + componentName.slice(1);
                return {
                    ...node,
                    properties: {
                        ...node.properties,
                        [newKey]: getComponentData(componentName)
                    }
                };
            }
            if (node.children) {
                return { ...node, children: updateObject(node.children) };
            }
            return node;
        });
    };

    setSceneData(updateObject(sceneData));
  };

  const handleAddObject = (type: ObjectType, parentId?: string) => {
    const newObject: SceneObject = {
        id: `${type.toLowerCase()}-${Date.now()}`,
        name: type.charAt(0) + type.slice(1).toLowerCase(),
        type: type,
        transform: { 
            position: { x: 0, y: 0, z: 0 }, 
            rotation: { x: 0, y: 0, z: 0 }, 
            scale: { x: 1, y: 1, z: 1 } 
        },
        properties: { 
            active: true,
            color: '#ffffff'
        }
    };

    if (!parentId || parentId === 'root') {
        // Add to first scene root or append
        const rootScene = sceneData.find(n => n.type === ObjectType.SCENE);
        if (rootScene) {
             const updateRoot = (nodes: SceneObject[]): SceneObject[] => {
                return nodes.map(node => {
                    if (node.type === ObjectType.SCENE) {
                        return { ...node, children: [...(node.children || []), newObject] };
                    }
                    return node;
                });
            };
            setSceneData(updateRoot(sceneData));
        } else {
             setSceneData([...sceneData, newObject]);
        }
    } else {
        // Add to specific parent
        const addToParent = (nodes: SceneObject[]): SceneObject[] => {
            return nodes.map(node => {
                if (node.id === parentId) {
                    return { 
                        ...node, 
                        children: [...(node.children || []), newObject], 
                        expanded: true 
                    };
                }
                if (node.children) {
                    return { ...node, children: addToParent(node.children) };
                }
                return node;
            });
        };
        setSceneData(addToParent(sceneData));
    }
    
    setSelectedId(newObject.id);
    console.log(`Created new ${type}`);
  };

  const handleDeleteObject = (id: string) => {
    const deleteRecursive = (nodes: SceneObject[]): SceneObject[] => {
      return nodes.filter(node => node.id !== id).map(node => ({
        ...node,
        children: node.children ? deleteRecursive(node.children) : undefined
      }));
    };
    setSceneData(deleteRecursive(sceneData));
    if (selectedId === id) setSelectedId(null);
    console.log(`Deleted object ${id}`);
  };

  const handleDuplicateObject = (id: string) => {
    const duplicateRecursive = (nodes: SceneObject[]): SceneObject[] => {
      let newNodes = [...nodes];
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          const original = nodes[i];
          const copy = {
            ...original,
            id: original.id + '_copy_' + Date.now(),
            name: original.name + ' (Copy)'
          };
          newNodes.splice(i + 1, 0, copy);
          console.log(`Duplicated ${original.name}`);
          return newNodes;
        }
        if (nodes[i].children) {
          newNodes[i] = {
            ...nodes[i],
            children: duplicateRecursive(nodes[i].children!)
          };
        }
      }
      return newNodes;
    };
    setSceneData(duplicateRecursive(sceneData));
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
    console.log(`Deleted asset ${id}`);
  };

  // --- Menu Handlers ---

  const openFileMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (navFileRef.current) {
          const rect = navFileRef.current.getBoundingClientRect();
          setActiveMenu({ id: 'file', x: rect.left, y: rect.bottom + 4 });
      }
  };

  const openEditMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (navEditRef.current) {
          const rect = navEditRef.current.getBoundingClientRect();
          setActiveMenu({ id: 'edit', x: rect.left, y: rect.bottom + 4 });
      }
  };

  const openGameObjectMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (navGameObjectRef.current) {
          const rect = navGameObjectRef.current.getBoundingClientRect();
          setActiveMenu({ id: 'gameobject', x: rect.left, y: rect.bottom + 4 });
      }
  };

  // --- Menu Items ---

  const getFileMenuItems = (): MenuItem[] => [
    { label: 'New Scene', shortcut: 'Ctrl+N', action: () => console.log('New Scene') },
    { label: 'Open Scene', shortcut: 'Ctrl+O', action: () => console.log('Open Scene') },
    { separator: true, label: '', action: () => {} },
    { label: 'Save Scene', shortcut: 'Ctrl+S', action: () => console.log('Save Scene') },
    { label: 'Save Scene As...', shortcut: 'Ctrl+Shift+S', action: () => console.log('Save Scene As') },
    { separator: true, label: '', action: () => {} },
    { label: 'Build Settings', shortcut: 'Ctrl+Shift+B', action: () => console.log('Build Settings') },
    { label: 'Build And Run', shortcut: 'Ctrl+B', action: () => console.log('Build And Run') },
    { separator: true, label: '', action: () => {} },
    { label: 'Exit', action: () => console.log('Exit') },
  ];

  const getEditMenuItems = (): MenuItem[] => [
    { label: 'Undo', shortcut: 'Ctrl+Z', action: () => console.log('Undo') },
    { label: 'Redo', shortcut: 'Ctrl+Y', action: () => console.log('Redo') },
    { separator: true, label: '', action: () => {} },
    { label: 'Cut', shortcut: 'Ctrl+X', action: () => console.log('Cut') },
    { label: 'Copy', shortcut: 'Ctrl+C', action: () => console.log('Copy') },
    { label: 'Paste', shortcut: 'Ctrl+V', action: () => console.log('Paste') },
    { separator: true, label: '', action: () => {} },
    { label: 'Duplicate', shortcut: 'Ctrl+D', action: () => selectedId && handleDuplicateObject(selectedId) },
    { label: 'Delete', shortcut: 'Del', danger: true, action: () => selectedId && handleDeleteObject(selectedId) },
    { separator: true, label: '', action: () => {} },
    { label: 'Play', shortcut: 'Ctrl+P', action: () => setIsPlaying(true) },
    { label: 'Pause', shortcut: 'Ctrl+Shift+P', action: () => setIsPlaying(false) },
  ];

  const getGameObjectMenuItems = (): MenuItem[] => [
    { label: 'Create Empty', action: () => handleAddObject(ObjectType.FOLDER) },
    { separator: true, label: '', action: () => {} },
    { label: 'Cube', action: () => handleAddObject(ObjectType.CUBE) },
    { label: 'Sphere', action: () => handleAddObject(ObjectType.SPHERE) },
    { label: 'Capsule', action: () => handleAddObject(ObjectType.CAPSULE) },
    { label: 'Cylinder', action: () => handleAddObject(ObjectType.CYLINDER) },
    { label: 'Plane', action: () => handleAddObject(ObjectType.PLANE) },
    { separator: true, label: '', action: () => {} },
    { label: 'Import New Asset...', action: () => console.log('Import triggered') },
  ];

  // Resize Handlers
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (isResizing === 'left') {
        const newWidth = Math.max(150, Math.min(clientX, 600));
        setLeftWidth(newWidth);
      } else if (isResizing === 'right') {
        const newWidth = Math.max(200, Math.min(window.innerWidth - clientX, 600));
        setRightWidth(newWidth);
      } else if (isResizing === 'bottom') {
        const newHeight = Math.max(100, Math.min(window.innerHeight - clientY - 24, window.innerHeight - 200));
        setBottomHeight(newHeight);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault(); 
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isResizing) return;
      if (e.cancelable) e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const handleEnd = () => {
      setIsResizing(null);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isResizing]);

  return (
    <div className={`h-screen w-screen flex flex-col bg-editor-bg text-editor-text overflow-hidden font-sans ${isResizing === 'left' || isResizing === 'right' ? 'cursor-col-resize' : isResizing === 'bottom' ? 'cursor-row-resize' : ''}`}>
      
      {/* 1. Main Menu Bar */}
      <div className="h-8 flex items-center px-2 bg-editor-bg border-b border-editor-border select-none text-xs flex-shrink-0 relative z-30">
         <div className="flex items-center mr-4">
             <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded mr-2" />
             <span className="font-bold tracking-wide">PolyForge</span>
         </div>
         <div className="flex gap-1 text-editor-textDim">
            <div 
                ref={navFileRef}
                className={`px-3 py-1 rounded cursor-pointer transition-colors ${activeMenu?.id === 'file' ? 'bg-white/10 text-white' : 'hover:bg-white/10 hover:text-white'}`}
                onClick={openFileMenu}
            >
                File
            </div>
            <div 
                ref={navEditRef}
                className={`px-3 py-1 rounded cursor-pointer transition-colors ${activeMenu?.id === 'edit' ? 'bg-white/10 text-white' : 'hover:bg-white/10 hover:text-white'}`}
                onClick={openEditMenu}
            >
                Edit
            </div>
            <div className="px-3 py-1 hover:bg-white/10 rounded cursor-pointer transition-colors">Assets</div>
            
            <div 
                ref={navGameObjectRef}
                className={`px-3 py-1 rounded cursor-pointer transition-colors ${activeMenu?.id === 'gameobject' ? 'bg-white/10 text-white' : 'hover:bg-white/10 hover:text-white'}`}
                onClick={openGameObjectMenu}
            >
                GameObject
            </div>

            <div className="px-3 py-1 hover:bg-white/10 rounded cursor-pointer transition-colors">Component</div>
            <div className="px-3 py-1 hover:bg-white/10 rounded cursor-pointer transition-colors">Window</div>
            <div className="px-3 py-1 hover:bg-white/10 rounded cursor-pointer transition-colors">Help</div>
         </div>
         <div className="flex-1" />
         <div className="flex items-center gap-3 text-editor-textDim">
            <div className="flex items-center gap-1 hover:text-white cursor-pointer bg-editor-panel px-2 py-0.5 rounded border border-editor-border">
                <LayoutTemplate size={12} />
                <span>Layout</span>
            </div>
            <div className="flex items-center gap-1 hover:text-white cursor-pointer">
                <Layers size={12} />
                <span>Layers</span>
            </div>
         </div>
      </div>

      {activeMenu && activeMenu.id === 'file' && (
          <ContextMenu 
            x={activeMenu.x} 
            y={activeMenu.y} 
            items={getFileMenuItems()} 
            onClose={() => setActiveMenu(null)} 
          />
      )}
      
      {activeMenu && activeMenu.id === 'edit' && (
          <ContextMenu 
            x={activeMenu.x} 
            y={activeMenu.y} 
            items={getEditMenuItems()} 
            onClose={() => setActiveMenu(null)} 
          />
      )}

      {activeMenu && activeMenu.id === 'gameobject' && (
          <ContextMenu 
            x={activeMenu.x} 
            y={activeMenu.y} 
            items={getGameObjectMenuItems()} 
            onClose={() => setActiveMenu(null)} 
          />
      )}

      {/* 2. Toolbar & Play Controls */}
      <div className="h-10 flex items-center justify-center bg-editor-panel border-b border-editor-border relative px-4 flex-shrink-0">
         <div className="absolute left-2 flex gap-1">
            <button className="p-1.5 rounded hover:bg-white/10 text-editor-textDim"><Hammer size={16} /></button>
            <button className="p-1.5 rounded hover:bg-white/10 text-editor-textDim"><Settings size={16} /></button>
         </div>

         <div className="flex items-center bg-black/20 rounded p-1 gap-1 border border-editor-border/50">
            <button 
              className={`p-1.5 rounded ${isPlaying ? 'bg-editor-accent text-white' : 'hover:bg-white/10 text-editor-textDim'}`}
              onClick={() => {
                  setIsPlaying(!isPlaying);
                  console.log(isPlaying ? "Game Stopped" : "Game Started");
              }}
            >
               <Play size={16} fill={isPlaying ? "currentColor" : "none"} />
            </button>
            <button className="p-1.5 rounded hover:bg-white/10 text-editor-textDim" onClick={() => console.log('Paused')}>
               <Pause size={16} fill="currentColor" />
            </button>
            <button className="p-1.5 rounded hover:bg-white/10 text-editor-textDim" onClick={() => setIsPlaying(false)}>
               <Square size={14} fill="currentColor" />
            </button>
         </div>

         <div className="absolute right-2 flex gap-1">
             <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-editor-textDim text-xs border border-transparent hover:border-editor-border" onClick={() => console.log('Build started...')}>
                 <FilePlus size={14} />
                 <span>Build</span>
             </button>
         </div>
      </div>

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Hierarchy */}
        <div style={{ width: leftWidth }} className="flex-shrink-0 z-10 flex flex-col">
           <Hierarchy 
              data={sceneData} 
              selectedId={selectedId} 
              onSelect={setSelectedId} 
              onToggleExpand={toggleExpand}
              onDelete={handleDeleteObject}
              onDuplicate={handleDuplicateObject}
              onAddObject={handleAddObject}
           />
        </div>

        <div 
          className="w-[2px] bg-editor-bg hover:bg-editor-accent cursor-col-resize z-20 flex-shrink-0 transition-colors border-r border-editor-border touch-none"
          onMouseDown={() => setIsResizing('left')}
          onTouchStart={() => setIsResizing('left')}
        />

        {/* Center: Viewport & Assets */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
           
           {/* Center Top: Tab Bar */}
           <div className="h-8 flex items-center bg-editor-panel border-b border-editor-border px-1 gap-1 flex-shrink-0">
              <button 
                className={`px-3 py-1 text-[11px] rounded-t-sm flex items-center gap-2 ${viewMode === 'SCENE' ? 'bg-[#1e1e1e] text-white font-medium border-t-2 border-editor-accent' : 'text-editor-textDim hover:bg-white/5'}`}
                onClick={() => setViewMode('SCENE')}
              >
                  # Scene
              </button>
              <button 
                className={`px-3 py-1 text-[11px] rounded-t-sm flex items-center gap-2 ${viewMode === 'GAME' ? 'bg-[#1e1e1e] text-white font-medium border-t-2 border-editor-accent' : 'text-editor-textDim hover:bg-white/5'}`}
                onClick={() => setViewMode('GAME')}
              >
                  Game
              </button>
              <button className="px-3 py-1 text-[11px] text-editor-textDim hover:bg-white/5 rounded-t-sm">Asset Store</button>
           </div>

           {/* Center Middle: Viewport */}
           <div className="flex-1 relative overflow-hidden">
               <Viewport 
                  mode={viewMode} 
                  setMode={setViewMode} 
                  selectedObject={selectedObject} 
               />
           </div>

           <div 
              className="h-[2px] bg-editor-bg hover:bg-editor-accent cursor-row-resize z-20 flex-shrink-0 transition-colors border-t border-editor-border touch-none"
              onMouseDown={() => setIsResizing('bottom')}
              onTouchStart={() => setIsResizing('bottom')}
           />

           {/* Center Bottom: Asset Explorer / Console */}
           <div style={{ height: bottomHeight }} className="flex-shrink-0 flex flex-col">
              <div className="h-full flex flex-col">
                  {/* Tabs for Bottom Panel */}
                  <div className="flex items-center bg-editor-panel border-b border-editor-border h-7 px-1 flex-shrink-0 select-none">
                      <button 
                        className={`px-3 text-[10px] h-full border-b-2 font-medium ${activeBottomTab === 'Project' ? 'border-editor-accent text-white bg-[#1e1e1e]' : 'border-transparent text-editor-textDim hover:text-white'}`}
                        onClick={() => setActiveBottomTab('Project')}
                      >
                        Project
                      </button>
                      <button 
                        className={`px-3 text-[10px] h-full border-b-2 font-medium ${activeBottomTab === 'Console' ? 'border-editor-accent text-white bg-[#1e1e1e]' : 'border-transparent text-editor-textDim hover:text-white'}`}
                        onClick={() => setActiveBottomTab('Console')}
                      >
                        Console
                      </button>
                      <button 
                        className={`px-3 text-[10px] h-full border-b-2 font-medium ${activeBottomTab === 'Animation' ? 'border-editor-accent text-white bg-[#1e1e1e]' : 'border-transparent text-editor-textDim hover:text-white'}`}
                        onClick={() => setActiveBottomTab('Animation')}
                      >
                        Animation
                      </button>
                  </div>
                  
                  {activeBottomTab === 'Project' ? (
                     <AssetBrowser assets={assets} onDelete={handleDeleteAsset} />
                  ) : activeBottomTab === 'Console' ? (
                     <ConsolePanel logs={logs} onClear={() => setLogs([])} />
                  ) : (
                     <div className="flex items-center justify-center h-full text-editor-textDim text-xs">Animation Timeline (Placeholder)</div>
                  )}
              </div>
           </div>
        </div>

        <div 
           className="w-[2px] bg-editor-bg hover:bg-editor-accent cursor-col-resize z-20 flex-shrink-0 transition-colors border-l border-editor-border touch-none"
           onMouseDown={() => setIsResizing('right')}
           onTouchStart={() => setIsResizing('right')}
        />

        {/* Right: Inspector */}
        <div style={{ width: rightWidth }} className="flex-shrink-0 z-10 flex flex-col">
           <Inspector object={selectedObject} onAddComponent={handleAddComponent} />
        </div>
      </div>

      {/* 4. Footer Status Bar */}
      <div className="h-6 bg-editor-accent/10 border-t border-editor-border flex items-center px-2 justify-between text-[10px] text-editor-textDim select-none flex-shrink-0">
          <div className="flex items-center gap-4">
              <span>Ready</span>
              <span className="text-editor-text/50">Auto-save enabled</span>
          </div>
          <div className="flex items-center gap-4">
               <span>Baking: 0%</span>
               <span>v1.0.4</span>
          </div>
      </div>
    </div>
  );
}

export default App;