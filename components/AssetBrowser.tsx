import React, { useState } from 'react';
import { Search, Folder, FileCode, FileImage, Box, FileText, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { AssetFile } from '../types';
import ContextMenu, { MenuItem } from './ContextMenu';

interface AssetBrowserProps {
  assets: AssetFile[];
  onDelete?: (id: string) => void;
}

const AssetBrowser: React.FC<AssetBrowserProps> = ({ assets, onDelete }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetId: string } | null>(null);

  const getIcon = (type: string) => {
    switch(type) {
      case 'folder': return <Folder size={32} className="text-blue-400 fill-blue-400/20" />;
      case 'script': return <FileCode size={32} className="text-yellow-500" />;
      case 'image': return <FileImage size={32} className="text-purple-400" />;
      case 'material': return <Box size={32} className="text-pink-400" />;
      case 'model': return <Box size={32} className="text-cyan-400" />;
      default: return <FileText size={32} className="text-gray-400" />;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: id });
  };

  const getContextMenuItems = (id: string): MenuItem[] => [
    { label: 'Open', action: () => console.log('Open', id) },
    { label: 'Show in Explorer', action: () => console.log('Show in Explorer', id) },
    { separator: true, label: '', action: () => {} },
    { label: 'Copy Path', action: () => console.log('Copy Path', id) },
    { label: 'Rename', shortcut: 'F2', action: () => console.log('Rename', id) },
    { label: 'Delete', shortcut: 'Del', danger: true, action: () => onDelete && onDelete(id) },
    { separator: true, label: '', action: () => {} },
    { label: 'Reimport', action: () => console.log('Reimport', id) },
  ];

  const getBackgroundMenuItems = (): MenuItem[] => [
    { label: 'Create Folder', action: () => console.log('New Folder') },
    { separator: true, label: '', action: () => {} },
    { label: 'Create Material', action: () => console.log('New Material') },
    { label: 'Create C# Script', action: () => console.log('New Script') },
    { separator: true, label: '', action: () => {} },
    { label: 'Import New Asset...', action: () => console.log('Import') },
    { label: 'Refresh', action: () => console.log('Refresh') },
  ];

  return (
    <div className="h-full flex flex-col bg-editor-panel">
      {/* Asset Toolbar */}
      <div className="h-8 flex items-center px-2 border-b border-editor-border bg-editor-bg gap-2 shrink-0">
        <div className="flex gap-1">
            <button className="p-1 hover:bg-white/10 rounded text-editor-textDim"><ArrowLeft size={14} /></button>
            <button className="p-1 hover:bg-white/10 rounded text-editor-textDim opacity-50"><ArrowLeft size={14} className="rotate-180" /></button>
        </div>
        <div className="h-4 w-[1px] bg-editor-border mx-1" />
        <div className="flex-1 flex items-center bg-editor-input border border-editor-border rounded px-2 py-0.5">
           <Search size={12} className="text-editor-textDim mr-2" />
           <input type="text" placeholder="Search assets..." className="bg-transparent border-none text-[10px] w-full focus:outline-none text-white" />
        </div>
        <div className="flex items-center gap-2">
           <div className="flex bg-editor-input rounded border border-editor-border p-0.5">
              <div className="h-2 w-16 bg-white/10 rounded-sm relative">
                  <div className="absolute left-0 top-0 h-full w-1/3 bg-editor-textDim rounded-sm" />
              </div>
           </div>
           <SlidersHorizontal size={14} className="text-editor-textDim cursor-pointer hover:text-white" />
        </div>
      </div>

      {/* Asset Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Folder Tree (Mini) */}
        <div className="w-48 border-r border-editor-border p-2 hidden md:block overflow-y-auto shrink-0">
            <div className="flex items-center gap-1 text-[11px] text-editor-text p-1 bg-white/5 rounded cursor-pointer">
                <Folder size={12} className="fill-current" />
                <span>Assets</span>
            </div>
             <div className="pl-4 mt-1 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-[11px] text-editor-textDim hover:text-white p-1 cursor-pointer hover:bg-white/5 rounded">
                    <Folder size={12} />
                    <span>Scripts</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-editor-textDim hover:text-white p-1 cursor-pointer hover:bg-white/5 rounded">
                    <Folder size={12} />
                    <span>Materials</span>
                </div>
                 <div className="flex items-center gap-1 text-[11px] text-editor-textDim hover:text-white p-1 cursor-pointer hover:bg-white/5 rounded">
                    <Folder size={12} />
                    <span>Models</span>
                </div>
             </div>
        </div>

        {/* Files Grid */}
        <div 
          className="flex-1 p-2 overflow-y-auto bg-[#1e1e1e]"
          onContextMenu={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, targetId: 'bg' });
            }
          }}
        >
           <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
              {assets.map(asset => (
                <div 
                  key={asset.id} 
                  className="group flex flex-col items-center p-2 rounded hover:bg-white/5 cursor-pointer border border-transparent hover:border-editor-accent/50 transition-all select-none"
                  onContextMenu={(e) => handleContextMenu(e, asset.id)}
                >
                   <div className="mb-2 transition-transform group-hover:scale-110 pointer-events-none">
                      {getIcon(asset.type)}
                   </div>
                   <span className="text-[10px] text-center text-editor-text truncate w-full px-1 bg-transparent rounded group-hover:bg-editor-accent group-hover:text-white leading-tight py-0.5 pointer-events-none">
                     {asset.name}
                   </span>
                   <span className="text-[9px] text-gray-500 mt-1 pointer-events-none">{asset.size || 'Folder'}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.targetId === 'bg' ? getBackgroundMenuItems() : getContextMenuItems(contextMenu.targetId)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default AssetBrowser;