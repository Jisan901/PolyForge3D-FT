import React, { useState, useEffect, useCallback } from 'react';
import { Search, Folder, FileCode, FileImage, Box, FileText, RefreshCw, ArrowLeft, ArrowRight, Globe } from 'lucide-react';
import { AssetFile } from '../types';
import ContextMenu, { MenuItem } from './ContextMenu';
import {DragAndDropZone} from "./Utils/DragNDrop";

import {toast} from "@/Editor/Mutation"

import { Editor } from "@/Editor/Editor";


const editor = Editor;
const api = editor.api;
const browser = editor.assetBrowser;


const AssetBrowser: React.FC = () => {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetId: string } | null>(null);
    const [assets, setAssets] = useState([]);

    const onDelete = async (id) => {
        await browser.file.rm(assets.find(e => e.id === id).id)
        browser.reload()
    }

    useEffect(() => {
        setAssets([...(browser.activeDir||[])]);
        return editor.api.buses.fsUpdate.subscribe(() => {
            setAssets([...(browser.activeDir||[])]);
        });
    }, []);
    

    const getIcon = (type: string) => {
        switch (type) {
            case 'folder': return <Folder size={32} className="text-blue-400 fill-blue-400/20" />;
            case 'script': return <FileCode size={32} className="text-yellow-500" />;
            case 'image': return <FileImage size={32} className="text-purple-400" />;
            case 'material': return <Box size={32} className="text-pink-400" />;
            case 'model': return <Box size={32} className="text-cyan-400" />;
            case 'geometry': return <Globe size={32} className="text-green-400" />;
            default: return <FileText size={32} className="text-gray-400" />;
        }
    };



    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, targetId: id });
    };

    const handleOpen = useCallback(async (asset: any) => {
        if (asset.type==="folder"){
            browser.openDirectory(asset.id)
        }
        else if (asset.type==="model"){
            editor.mountScene(asset.id)
        }
    }, [assets])

    const getContextMenuItems = (id: string): MenuItem[] => [
        { label: 'Open', action: () => handleOpen(id) },
        { label: 'Show in Explorer', action: () => console.log('Show in Explorer', id) },
        { separator: true, label: '', action: () => { } },
        { label: 'Copy Path', action: () => console.log('Copy Path', id) },
        { label: 'Rename', shortcut: 'F2', action: () => console.log('Rename', id) },
        { label: 'Delete', shortcut: 'Del', danger: true, action: () => onDelete && onDelete(id) },
        { separator: true, label: '', action: () => { } },
        { label: 'Reimport', action: () => console.log('Reimport', id) },
    ];

    const getBackgroundMenuItems = (): MenuItem[] => [
        { label: 'Create Folder', action: () => console.log('New Folder') },
        { separator: true, label: '', action: () => { } },
        { label: 'Create Material', action: () => console.log('New Material') },
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
                  <span className="text-editor-textDim cursor-pointer text-[10px] hover:text-white" >{browser.activeDirName.slice(browser.activeDirName.lastIndexOf('/')+1)}</span>
                    <RefreshCw onClick={()=>browser.reload()} size={14} className="text-editor-textDim cursor-pointer hover:text-white" />
                </div>
            </div>

            {/* Asset Grid */}
            <DragAndDropZone onDrop={async (e)=>{
            console.log(e)
                    if (e.type==='Object'){
                        const scene = editor.core.sceneManager.activeScene;
                        const draggedNode = scene.getObjectByProperty('uuid', e.data.uuid);
                        
                              if (!draggedNode) {
                                toast('Invalid drag operation');
                                return;
                              }
                        let temp = draggedNode.userData.helper
                        draggedNode.userData.helper = null
                        await editor.api.saveObjectFile(draggedNode, browser.activeDirName)
                        draggedNode.userData.helper = temp
                        await browser.reload()
                    }
                    if (e.type === 'GeoMat'&&(e.data.isMaterial||e.data.isBufferGeometry)){
                        await editor.api.saveMatGeoFile(e.data, browser.activeDirName)
                        await browser.reload()
                        //console.log(e)
                    }
                }} className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex overflow-hidden" >
            
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
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2"
                        onContextMenu={(e) => {
                            if (e.target === e.currentTarget) {
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, targetId: 'bg' });
                            }
                        }}
                    >
                        {assets.map(asset => (
                            <DragAndDropZone key={asset.id} payload={{type:'Asset',data:asset}}>
                            <div
                                className="group flex flex-col items-center p-2 rounded hover:bg-white/5 cursor-pointer border border-transparent hover:border-editor-accent/50 transition-all select-none"
                                onContextMenu={(e) => handleContextMenu(e, asset.id)}
                                onDoubleClick={e=>handleOpen(asset)}
                            >
                                <div className="mb-2 transition-transform group-hover:scale-110 pointer-events-none">
                                    {getIcon(asset.type)}
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