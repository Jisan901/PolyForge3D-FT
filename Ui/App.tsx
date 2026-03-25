import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Settings, Hammer, FilePlus, Cpu, Gamepad2, Clock, ListTree } from 'lucide-react';
import { FileText, Box, BoxSelect, Image as ImageIcon } from 'lucide-react';


import HierarchyImport from './components/Hierarchy';
import InspectorImport from './components/Inspector';
import ViewportImport from './components/Viewport';
import AssetBrowserImport from './components/AssetBrowser';
import AssetStoreImport from './components/AssetStore';
import ResourceBrowserImport from './components/RuntimeResourceBrowser';
import ConsolePanelImport from './components/ConsolePanel';
import TimelineEditorImport from './components/TimelineEditor';
import TextureEditorImport from './components/TextureEditor';
import SettingsModalImport from './components/SettingsModal';
import {UVEditorApp} from "@/Plugins/uv-editor/UVEditorApp";
import MenuBar from "./MenuBar";

import { SceneObject, ViewMode } from '../types';
import { Editor } from "@/Editor/Editor";
import { useEditorStates, useEditorActions } from './contexts/EditorContext';


import { WindyRoot, WindyDef } from '@/WindyUI';
import { Windy } from '@/Windy';






const editor = Editor;

const Hierarchy = React.memo(HierarchyImport);
const Inspector = React.memo(InspectorImport);
const AssetBrowser = React.memo(AssetBrowserImport);
const AssetStore = React.memo(AssetStoreImport);
const ResourceBrowser = React.memo(ResourceBrowserImport);
const ConsolePanel = React.memo(ConsolePanelImport);
const TimelineEditor = React.memo(TimelineEditorImport);
const TextureEditor = React.memo(TextureEditorImport);
const SettingsModal = React.memo(SettingsModalImport);
const Viewport = React.memo(ViewportImport);



const WINDY_DEFS: WindyDef[] = [
  { id: 'viewport3d', title: '3D Viewport', icon: <BoxSelect size={12} />, component: Viewport },
  { id: 'inspector', title: 'Inspector', icon: <ImageIcon size={12} />, component: Inspector },
  { id: 'textureEditor', title: 'Texture Editor', icon: <ImageIcon size={12} />, component: TextureEditor },
  { id: 'assetbrowser', title: 'Asset Browser', icon: <FileText size={12} />, component: AssetBrowser },
  { id: 'assetStore', title: 'Asset Store', icon: <FileText size={12} />, component: AssetStore },
  { id: 'resourcebrowser', title: 'Resource Browser', icon: <Box size={12} />, component: ResourceBrowser },
  { id: 'hierarchy', title: 'Hierarchy', icon: <ListTree size={12} />, component: Hierarchy },
  { id: 'timelineEditor', title: 'Timeline Editor', icon: <Clock size={12} />, component: TimelineEditor },
  { id: 'settings', title: 'Settings', icon: <Settings size={12} />, component: SettingsModal },
  { id: 'uv-editor', title: 'UV Editor', icon: <Settings size={12} />, component: UVEditorApp },
  { id: 'empty', title: 'Empty View', icon: <Square size={12} />, component: () => <div className="p-4 text-[#808080] text-sm font-mono"><p className="mb-2">// Empty View</p></div> }
];


type BottomTab = 'Project' | 'Resource' | 'Console' | 'Animation' | 'Plugin';

function App() {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;
        
        // Initialize the layout for the UV Editor
        if (!Windy.load()) {
          Windy.clear();
          const root = Windy.create('Hierarchy', 'horizontal', true, 0.2, undefined, 'hierarchy');
          const inspectorWin = Windy.split(root.id, Windy.createWindow('Inspector', 'inspector'), 'horizontal', 0.6);
          const viewport3d = Windy.split(root.id, Windy.createWindow('3D Viewport', 'viewport3d'), 'horizontal', 0.6);
        }
    }, []);
    
    


        return (
    <div className="w-screen h-screen flex flex-col bg-black overflow-auto font-sans">
      <MenuBar />
      <div className="flex-1 relative min-h-0">
        <WindyRoot defs={WINDY_DEFS} />
      </div>
    </div>
    )
}

export default App;