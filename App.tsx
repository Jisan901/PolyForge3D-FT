import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, LayoutTemplate, Settings, Hammer, FilePlus, Layers } from 'lucide-react';
import Hierarchy from './components/Hierarchy';
import Inspector from './components/Inspector';
import Viewport from './components/Viewport';
import AssetBrowser from './components/AssetBrowser';
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

  // Menu State
  const [activeMenu, setActiveMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const navGameObjectRef = useRef<HTMLDivElement>(null);

  // Resize State
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(280);
  const [bottomHeight, setBottomHeight] = useState(300);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | 'bottom' | null>(null);

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
            // Add to the main scene children
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
    
    // Select the new object
    setSelectedId(newObject.id);
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
  };

  const openGameObjectMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (navGameObjectRef.current) {
          const rect = navGameObjectRef.current.getBoundingClientRect();
          setActiveMenu({ id: 'gameobject', x: rect.left, y: rect.bottom + 4 });
      }
  };

  const getGameObjectMenuItems = (): MenuItem[] => [
    { label: 'Create Empty', action: () => handleAddObject(ObjectType.FOLDER) },
    { separator: true, label: '', action: () => {} },
    { label: 'Cube', action: () => handleAddObject(ObjectType.CUBE) },
    { label: 'Sphere', action: () => handleAddObject(ObjectType.SPHERE) },
    { label: 'Capsule', action: () => handleAddObject(ObjectType.CAPSULE) },
    { label: 'Cylinder', action: () => handleAddObject(ObjectType.CYLINDER) },
    { label: 'Plane', action: () => handleAddObject(ObjectType.PLANE) },
    { separator: true, label: '', action: () => {} },
    { label: 'Import New Asset...', action: () => console.log('Import') },
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
      e.preventDefault(); // Prevent text selection while dragging
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isResizing) return;
      // Prevent scrolling on touch devices while resizing
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
            <div className="px-3 py-1 hover:bg-white/10 rounded cursor-pointer transition-colors">File</div>
            <div className="px-3 py-1 hover:bg-white/10 rounded cursor-pointer transition-colors">Edit</div>
            <div className="px-3 py-1 hover:bg-white/10 rounded cursor-pointer transition-colors">Assets</div>
            
            {/* GameObject Menu Trigger */}
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

      {/* Render Main Menu Dropdown */}
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
              onClick={() => setIsPlaying(!isPlaying)}
            >
               <Play size={16} fill={isPlaying ? "currentColor" : "none"} />
            </button>
            <button className="p-1.5 rounded hover:bg-white/10 text-editor-textDim">
               <Pause size={16} fill="currentColor" />
            </button>
            <button className="p-1.5 rounded hover:bg-white/10 text-editor-textDim">
               <Square size={14} fill="currentColor" />
            </button>
         </div>

         <div className="absolute right-2 flex gap-1">
             <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-editor-textDim text-xs border border-transparent hover:border-editor-border">
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

        {/* Handle: Left <-> Center */}
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

           {/* Handle: Viewport <-> Assets */}
           <div 
              className="h-[2px] bg-editor-bg hover:bg-editor-accent cursor-row-resize z-20 flex-shrink-0 transition-colors border-t border-editor-border touch-none"
              onMouseDown={() => setIsResizing('bottom')}
              onTouchStart={() => setIsResizing('bottom')}
           />

           {/* Center Bottom: Asset Explorer */}
           <div style={{ height: bottomHeight }} className="flex-shrink-0 flex flex-col">
              <div className="h-full flex flex-col">
                  {/* Tabs for Bottom Panel */}
                  <div className="flex items-center bg-editor-panel border-b border-editor-border h-7 px-1 flex-shrink-0">
                      <button className="px-3 text-[10px] h-full border-b-2 border-editor-accent text-white font-medium bg-[#1e1e1e]">Project</button>
                      <button className="px-3 text-[10px] h-full border-b-2 border-transparent text-editor-textDim hover:text-white">Console</button>
                      <button className="px-3 text-[10px] h-full border-b-2 border-transparent text-editor-textDim hover:text-white">Animation</button>
                  </div>
                  <AssetBrowser assets={assets} onDelete={handleDeleteAsset} />
              </div>
           </div>
        </div>

        {/* Handle: Center <-> Right */}
        <div 
           className="w-[2px] bg-editor-bg hover:bg-editor-accent cursor-col-resize z-20 flex-shrink-0 transition-colors border-l border-editor-border touch-none"
           onMouseDown={() => setIsResizing('right')}
           onTouchStart={() => setIsResizing('right')}
        />

        {/* Right: Inspector */}
        <div style={{ width: rightWidth }} className="flex-shrink-0 z-10 flex flex-col">
           <Inspector object={selectedObject} />
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