import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';
import { AssetFile } from '../types';
import ContextMenu, { MenuItem } from './ContextMenu';
import { DragAndDropZone } from "./Utils/DragNDrop";
import { getAssetIcon } from './IconMap';

import { toast } from "@/Editor/Mutation";
import { Editor } from "@/Editor/Editor";
import ACTIONS from "@/Editor/Actions";

const editor = Editor;
const api = editor.api;
const browser = editor.assetBrowser;

const AssetBrowser: React.FC = () => {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetId: string } | null>(null);
    const [assets, setAssets] = useState<any[]>([]);

    const onDelete = async (id: string) => {
        const found = assets.find(e => e.id === id);
        if (found) {
            await browser.file.rm(found.id);
            browser.reload();
        }
    };

    useEffect(() => {
        setAssets([...(browser.activeDir || [])]);
        return editor.api.buses.fsUpdate.subscribe(() => {
            setAssets([...(browser.activeDir || [])]);
        });
    }, []);

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, targetId: id });
    };

    const handleOpen = useCallback(async (asset: any) => {
        if (asset.type === "folder") {
            browser.openDirectory(asset.id);
        } else if (asset.type === "model") {
            editor.mountScene(asset.id);
        }
    }, [assets]);

    const getContextMenuItems = (id: string): MenuItem[] => [
        { label: 'Open', action: () => handleOpen(assets.find(a => a.id === id)) },
        { label: 'Show in Explorer', action: () => console.log('Show in Explorer', id) },
        { separator: true, label: '', action: () => { } },
        { label: 'Copy Path', action: () => console.log('Copy Path', id) },
        { label: 'Rename', shortcut: 'F2', action: () => console.log('Rename', id) },
        { label: 'Delete', shortcut: 'Del', danger: true, action: () => onDelete && onDelete(id) },
        { separator: true, label: '', action: () => { } },
        { label: 'Reimport', action: () => ACTIONS.execute('reimport', id) },
    ];

    const getBackgroundMenuItems = (): MenuItem[] => [
        { label: 'Create Folder', action: () => ACTIONS.execute('new_folder') },
        { separator: true, label: '', action: () => { } },
        { label: 'Create Material', action: () => ACTIONS.execute('new_material') },
        { label: 'Create Script', action: () => console.log('New Script') },
        { separator: true, label: '', action: () => { } },
        { label: 'Import New Asset...', action: () => console.log('Import') },
        { label: 'Refresh', action: () => console.log('Refresh') },
    ];

    return (
        <div className="h-full flex flex-col bg-editor-panel">
            {/* Asset Toolbar */}
            <div className="h-8 flex items-center px-2 border-b border-editor-border bg-editor-bg gap-2 shrink-0">
                <div className="flex gap-1">
                    <button onClick={browser.goBack.bind(browser)} className="p-1 hover:bg-white/10 rounded text-editor-textDim"><ArrowLeft size={14} /></button>
                    <button onClick={browser.goForward.bind(browser)} className="p-1 hover:bg-white/10 rounded text-editor-textDim"><ArrowRight size={14} /></button>
                </div>
                <div className="h-4 w-[1px] bg-editor-border mx-1" />
                <div className="flex-1 flex items-center bg-editor-input border border-editor-border rounded px-2 py-0.5">
                    <Search size={12} className="text-editor-textDim mr-2" />
                    <input type="text" placeholder="Search assets..." className="bg-transparent border-none text-[10px] w-full focus:outline-none text-white" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-editor-textDim cursor-pointer text-[10px] hover:text-white">{browser.activeDirName.slice(browser.activeDirName.lastIndexOf('/') + 1)}</span>
                    <RefreshCw onClick={() => browser.reload()} size={14} className="text-editor-textDim cursor-pointer hover:text-white" />
                </div>
            </div>

            {/* Asset Grid */}
            <DragAndDropZone onDrop={async (e, m) => {
                editor.api.buses.assetPanelDrop.emit(e, m);

                if (e.type === 'GeoMat' && (e.data.isMaterial || e.data.isBufferGeometry)) {
                    await editor.api.saveMatGeoFile(e.data, browser.activeDirName);
                    browser.reload();
                }
            }}
            className="flex-1 flex flex-col min-h-0 relative"
            >
                <div className="flex-1 flex flex-col min-h-0 relative">
                    <div className="flex-1 p-2 overflow-y-auto bg-[#1e1e1e] flex flex-col">
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2"
                            onContextMenu={(e) => {
                                if (e.target === e.currentTarget) {
                                    e.preventDefault();
                                    setContextMenu({ x: e.clientX, y: e.clientY, targetId: 'bg' });
                                }
                            }}
                        >
                            {assets.map(asset => (
                                <DragAndDropZone key={asset.id} payload={{ type: 'Asset', data: asset }}>
                                    <div
                                        className="group flex flex-col items-center p-2 rounded hover:bg-white/5 cursor-pointer border border-transparent hover:border-editor-accent/50 transition-all select-none"
                                        onContextMenu={(e) => handleContextMenu(e, asset.id)}
                                        onDoubleClick={e => handleOpen(asset)}
                                    >
                                        <div className="mb-2 transition-transform group-hover:scale-110 pointer-events-none">
                                            {getAssetIcon(asset, { size: 32 })}
                                        </div>
                                        <span className="text-[10px] text-center text-editor-text truncate w-full px-1 bg-transparent rounded group-hover:bg-editor-accent group-hover:text-white leading-tight py-0.5 pointer-events-none">
                                            {asset.name}
                                        </span>
                                        <span className="text-[9px] text-gray-500 mt-1 pointer-events-none">{asset.type === 'folder' ? 'Folder' : `${asset.size} MB`}</span>
                                    </div>
                                </DragAndDropZone>
                            ))}
                        </div>
                    </div>
                </div>
            </DragAndDropZone>

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