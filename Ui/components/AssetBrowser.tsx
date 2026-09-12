import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search,
    RefreshCw,
    ArrowLeft,
    ArrowRight,
    LayoutGrid,
    List as ListIcon,
    Eye,
    FolderPlus,
    Upload,
    ChevronRight,
    X,
    FileText,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import ContextMenu, { MenuItem } from './ContextMenu';
import { DragAndDropZone } from './Utils/DragNDrop';
import { getAssetIcon } from './IconMap';
import { toast } from '@/Editor/Mutation';
import { Editor } from '@/Editor/Editor';
import ACTIONS from '@/Editor/Actions';
import {
    getAssetItemContextMenu,
    getAssetBackgroundContextMenu,
} from '@/Editor/AssetBrowserActions';
import { AssetPreviewService } from '@/Editor/AssetPreviewService';
import { AssetPreviewPanel } from './AssetBrowser/AssetPreviewPanel';

const editor = Editor;
const browser = editor.assetBrowser;

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'type' | 'size';

export const AssetBrowser: React.FC = () => {
    const previewService = AssetPreviewService.getInstance();

    const [assets, setAssets] = useState<any[]>([]);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortBy, setSortBy] = useState<SortBy>('name');
    const [sortAsc, setSortAsc] = useState(true);
    const [showPreviewPanel, setShowPreviewPanel] = useState(false);
    const [previewTick, setPreviewTick] = useState(0);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        targetId: string;
    } | null>(null);

    // Listen to filesystem updates & active directory changes
    useEffect(() => {
        setAssets([...(browser?.activeDir || [])]);

        const unsubFs = editor.api?.buses?.fsUpdate?.subscribe(() => {
            setAssets([...(browser?.activeDir || [])]);
            setSelectedAssetId(null);
        });

        // Listen to thumbnail cache changes
        const unsubPreview = previewService.subscribe(() => {
            setPreviewTick((t) => t + 1);
        });

        return () => {
            unsubFs?.();
            unsubPreview?.();
        };
    }, []);

    // -----------------------------------------------------------------------
    // Navigation & Open Handling
    // -----------------------------------------------------------------------
    const handleOpen = useCallback(async (asset: any) => {
        if (!asset) return;
        if (asset.type === 'folder') {
            await browser.openDirectory(asset.id);
            setSelectedAssetId(null);
        } else if (asset.type === 'model' || asset.type === 'scene') {
            await editor.mountScene(asset.id);
        }
    }, []);

    // Breadcrumb segments calculation
    const breadcrumbSegments = useMemo(() => {
        const raw = browser?.activeDirName || '/';
        const parts = raw.split('/').filter(Boolean);
        const result = [{ name: 'Root', path: '/' }];

        let current = '';
        for (const part of parts) {
            current += '/' + part;
            result.push({ name: part, path: current });
        }
        return result;
    }, [browser?.activeDirName, assets]);

    // -----------------------------------------------------------------------
    // Filtered & Sorted Assets
    // -----------------------------------------------------------------------
    const filteredAssets = useMemo(() => {
        let list = [...assets];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            list = list.filter((a) =>
                a.name?.toLowerCase().includes(query) || a.type?.toLowerCase().includes(query)
            );
        }

        list.sort((a, b) => {
            // Keep folders on top
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;

            let cmp = 0;
            if (sortBy === 'name') {
                cmp = (a.name || '').localeCompare(b.name || '');
            } else if (sortBy === 'type') {
                cmp = (a.type || '').localeCompare(b.type || '');
            } else if (sortBy === 'size') {
                cmp = (parseFloat(a.size) || 0) - (parseFloat(b.size) || 0);
            }
            return sortAsc ? cmp : -cmp;
        });

        return list;
    }, [assets, searchQuery, sortBy, sortAsc]);

    const selectedAsset = useMemo(() => {
        return assets.find((a) => a.id === selectedAssetId) || null;
    }, [assets, selectedAssetId]);

    const handleSort = (column: SortBy) => {
        if (sortBy === column) {
            setSortAsc((asc) => !asc);
        } else {
            setSortBy(column);
            setSortAsc(true);
        }
    };

    // -----------------------------------------------------------------------
    // Context Menu Handlers
    // -----------------------------------------------------------------------
    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedAssetId(id);
        setContextMenu({ x: e.clientX, y: e.clientY, targetId: id });
    };

    const handleBackgroundContextMenu = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, targetId: 'bg' });
        }
    };

    const getContextMenuItems = (id: string): MenuItem[] => {
        const asset = assets.find((a) => a.id === id);
        return getAssetItemContextMenu(asset, {
            assets,
            handleOpen,
            onShowPreviewPanel: () => setShowPreviewPanel(true),
        });
    };

    const getBackgroundMenuItems = (): MenuItem[] => {
        return getAssetBackgroundContextMenu({ assets });
    };

    // -----------------------------------------------------------------------
    // Quick Preview Toggle
    // -----------------------------------------------------------------------
    const handleTogglePreview = async (e: React.MouseEvent, asset: any) => {
        e.stopPropagation();
        if (previewService.hasPreview(asset.id)) {
            previewService.clearPreview(asset.id);
            toast('Preview cleared');
        } else {
            toast('Generating preview...');
            await previewService.generatePreview(asset);
        }
    };

    return (
        <div className="h-full flex flex-col bg-editor-panel select-none overflow-hidden">
            {/* Top Toolbar */}
            <div className="h-9 flex items-center px-2 border-b border-editor-border bg-editor-bg gap-2 shrink-0">
                {/* Back / Forward */}
                <div className="flex gap-1">
                    <button
                        onClick={browser?.goBack?.bind(browser)}
                        className="p-1 hover:bg-white/10 rounded text-editor-textDim hover:text-white transition-colors"
                        title="Back"
                    >
                        <ArrowLeft size={14} />
                    </button>
                    <button
                        onClick={browser?.goForward?.bind(browser)}
                        className="p-1 hover:bg-white/10 rounded text-editor-textDim hover:text-white transition-colors"
                        title="Forward"
                    >
                        <ArrowRight size={14} />
                    </button>
                </div>

                <div className="h-4 w-[1px] bg-editor-border mx-0.5" />

                {/* Breadcrumbs Navigation */}
                <div className="flex items-center gap-1 overflow-x-auto text-[11px] text-editor-textDim max-w-sm shrink-0">
                    {breadcrumbSegments.map((seg, idx) => (
                        <React.Fragment key={seg.path}>
                            {idx > 0 && <ChevronRight size={10} className="text-editor-border shrink-0" />}
                            <button
                                onClick={() => browser?.openDirectory(seg.path)}
                                className={`px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white truncate transition-colors ${
                                    idx === breadcrumbSegments.length - 1 ? 'text-white font-medium' : ''
                                }`}
                                title={seg.path}
                            >
                                {seg.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                <div className="flex-1" />

                {/* Realtime Search Bar */}
                <div className="w-48 flex items-center bg-editor-input border border-editor-border rounded px-2 py-0.5 text-xs">
                    <Search size={12} className="text-editor-textDim mr-1.5 shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search assets..."
                        className="bg-transparent border-none text-[11px] w-full focus:outline-none text-white placeholder:text-editor-textDim/60"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="p-0.5 hover:bg-white/10 rounded text-editor-textDim hover:text-white"
                        >
                            <X size={10} />
                        </button>
                    )}
                </div>

                <div className="h-4 w-[1px] bg-editor-border mx-0.5" />

                {/* Quick Action Buttons */}
                <button
                    onClick={() => ACTIONS.execute('new_folder')}
                    className="p-1 hover:bg-white/10 rounded text-editor-textDim hover:text-white transition-colors"
                    title="New Folder"
                >
                    <FolderPlus size={14} />
                </button>

                <button
                    onClick={() => Editor.importer?.openDialog?.()}
                    className="p-1 hover:bg-white/10 rounded text-editor-textDim hover:text-white transition-colors"
                    title="Import Asset"
                >
                    <Upload size={14} />
                </button>

                <div className="h-4 w-[1px] bg-editor-border mx-0.5" />

                {/* View Mode Toggle (Grid / List) */}
                <div className="flex items-center bg-black/20 p-0.5 rounded border border-editor-border">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1 rounded transition-colors ${
                            viewMode === 'grid' ? 'bg-editor-accent text-white' : 'text-editor-textDim hover:text-white'
                        }`}
                        title="Grid View"
                    >
                        <LayoutGrid size={12} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1 rounded transition-colors ${
                            viewMode === 'list' ? 'bg-editor-accent text-white' : 'text-editor-textDim hover:text-white'
                        }`}
                        title="List View"
                    >
                        <ListIcon size={12} />
                    </button>
                </div>

                {/* Preview Panel Toggle */}
                <button
                    onClick={() => setShowPreviewPanel((v) => !v)}
                    className={`p-1.5 rounded transition-colors flex items-center gap-1 text-[11px] ${
                        showPreviewPanel ? 'bg-editor-accent text-white' : 'text-editor-textDim hover:bg-white/10 hover:text-white'
                    }`}
                    title="Toggle Preview Inspector"
                >
                    <Eye size={13} />
                    <span>Preview</span>
                </button>

                <button
                    onClick={() => browser?.reload?.()}
                    className="p-1 hover:bg-white/10 rounded text-editor-textDim hover:text-white transition-colors"
                    title="Refresh"
                >
                    <RefreshCw size={13} />
                </button>
            </div>

            {/* Main Area: Assets Content + Optional Preview Panel */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Drag and Drop Asset Viewport */}
                <DragAndDropZone
                    onDrop={async (e, m) => {
                        editor.api?.buses?.assetPanelDrop?.emit(e, m);

                        if (e.type === 'GeoMat' && (e.data?.isMaterial || e.data?.isBufferGeometry)) {
                            await editor.api?.saveMatGeoFile(e.data, browser.activeDirName);
                            browser.reload();
                        }
                    }}
                    className="flex-1 flex flex-col min-h-0 relative overflow-hidden"
                >
                    <div
                        className={`flex-1 p-3 bg-[#1b1b1b] flex flex-col min-h-0 ${
                            viewMode === 'grid' ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'
                        }`}
                        onContextMenu={handleBackgroundContextMenu}
                        onClick={() => setSelectedAssetId(null)}
                    >
                        {filteredAssets.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-editor-textDim select-none">
                                <FileText size={36} className="opacity-20 mb-2" />
                                <span className="text-xs">
                                    {searchQuery ? 'No matching assets found' : 'This folder is empty'}
                                </span>
                                <span className="text-[10px] opacity-70 mt-0.5">
                                    Right-click or click "Import" to add assets
                                </span>
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* Grid View */
                            <div
                                className="grid grid-cols-[repeat(auto-fill,minmax(124px,1fr))] gap-3"
                                onContextMenu={handleBackgroundContextMenu}
                            >
                                {filteredAssets.map((asset) => {
                                    const isSelected = selectedAssetId === asset.id;
                                    const previewUrl = previewService.getPreview(asset.id);
                                    const isPreviewable = previewService.isPreviewSupported(asset.type);

                                    return (
                                        <DragAndDropZone
                                            key={asset.id}
                                            payload={{ type: 'Asset', data: asset }}
                                        >
                                            <div
                                                className={`group relative flex flex-col items-center p-2.5 rounded-lg cursor-pointer transition-all border select-none ${
                                                    isSelected
                                                        ? 'bg-editor-accent/20 border-editor-accent shadow-md'
                                                        : 'hover:bg-white/5 border-transparent hover:border-editor-border'
                                                }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedAssetId(asset.id);
                                                }}
                                                onContextMenu={(e) => handleContextMenu(e, asset.id)}
                                                onDoubleClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpen(asset);
                                                }}
                                            >
                                                {/* Visual Area (Preview Thumbnail or Default Icon) */}
                                                <div className="w-24 h-24 mb-2 flex items-center justify-center relative rounded-md overflow-hidden bg-black/25 border border-white/5 group-hover:border-white/10 transition-colors">
                                                    {previewUrl ? (
                                                        <img
                                                            src={previewUrl}
                                                            alt={asset.name}
                                                            draggable={false}
                                                            className="w-full h-full object-contain drop-shadow pointer-events-none select-none"
                                                        />
                                                    ) : (
                                                        <div className="transition-transform group-hover:scale-105 pointer-events-none">
                                                            {getAssetIcon(asset, { size: 44 })}
                                                        </div>
                                                    )}

                                                    {/* Hover Quick-Preview Toggle Button */}
                                                    {isPreviewable && (
                                                        <button
                                                            onClick={(e) => handleTogglePreview(e, asset)}
                                                            className="absolute bottom-1 right-1 p-1 bg-black/80 hover:bg-editor-accent text-white rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                                            title={previewUrl ? 'Hide Preview' : 'Show Preview'}
                                                        >
                                                            <Eye size={11} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Asset Name Label */}
                                                <span
                                                    className={`text-[11px] text-center truncate w-full px-1 py-0.5 rounded leading-tight ${
                                                        isSelected
                                                            ? 'bg-editor-accent text-white font-medium'
                                                            : 'text-editor-text group-hover:text-white'
                                                    }`}
                                                    title={asset.name}
                                                >
                                                    {asset.name}
                                                </span>

                                                {/* Type or Size Subtitle */}
                                                <span className="text-[9px] text-editor-textDim/80 mt-0.5 pointer-events-none truncate max-w-full">
                                                    {asset.type === 'folder' ? 'Folder' : `${asset.size} MB`}
                                                </span>
                                            </div>
                                        </DragAndDropZone>
                                    );
                                })}
                            </div>
                        ) : (
                            /* List View */
                            <div className="flex-1 flex flex-col border border-editor-border/60 rounded bg-editor-bg overflow-hidden text-[11px] min-h-0">
                                {/* Table Header - Sticky / Fixed at top */}
                                <div className="flex items-center px-3 py-1.5 bg-[#252525] border-b border-editor-border text-[10px] text-editor-textDim font-medium uppercase tracking-wider shrink-0 select-none">
                                    <button
                                        type="button"
                                        onClick={() => handleSort('name')}
                                        className="flex-1 flex items-center gap-1 text-left hover:text-white transition-colors"
                                    >
                                        <span>Name</span>
                                        {sortBy === 'name' && (
                                            sortAsc ? <ArrowUp size={10} className="text-editor-accent" /> : <ArrowDown size={10} className="text-editor-accent" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSort('type')}
                                        className="w-24 flex items-center justify-center gap-1 hover:text-white transition-colors"
                                    >
                                        <span>Type</span>
                                        {sortBy === 'type' && (
                                            sortAsc ? <ArrowUp size={10} className="text-editor-accent" /> : <ArrowDown size={10} className="text-editor-accent" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSort('size')}
                                        className="w-20 flex items-center justify-end gap-1 hover:text-white transition-colors"
                                    >
                                        <span>Size</span>
                                        {sortBy === 'size' && (
                                            sortAsc ? <ArrowUp size={10} className="text-editor-accent" /> : <ArrowDown size={10} className="text-editor-accent" />
                                        )}
                                    </button>
                                    <span className="w-16 text-center">Preview</span>
                                </div>

                                {/* Table Body - Scrollable with custom scrollbar */}
                                <div
                                    className="flex-1 overflow-y-auto divide-y divide-editor-border/40 custom-scrollbar min-h-0"
                                    onContextMenu={handleBackgroundContextMenu}
                                    onClick={() => setSelectedAssetId(null)}
                                >
                                    {filteredAssets.map((asset) => {
                                        const isSelected = selectedAssetId === asset.id;
                                        const previewUrl = previewService.getPreview(asset.id);
                                        const isPreviewable = previewService.isPreviewSupported(asset.type);

                                        return (
                                            <DragAndDropZone
                                                key={asset.id}
                                                payload={{ type: 'Asset', data: asset }}
                                                className="w-full block"
                                            >
                                                <div
                                                    className={`flex items-center px-3 py-1.5 cursor-pointer transition-colors ${
                                                        isSelected
                                                            ? 'bg-editor-accent/25 text-white'
                                                            : 'hover:bg-white/5 text-editor-text'
                                                    }`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedAssetId(asset.id);
                                                    }}
                                                    onContextMenu={(e) => handleContextMenu(e, asset.id)}
                                                    onDoubleClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpen(asset);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                        <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-black/30 rounded overflow-hidden">
                                                            {previewUrl ? (
                                                                <img
                                                                    src={previewUrl}
                                                                    alt=""
                                                                    draggable={false}
                                                                    className="w-8 h-8 object-contain rounded pointer-events-none select-none"
                                                                />
                                                            ) : (
                                                                getAssetIcon(asset, { size: 20 })
                                                            )}
                                                        </div>
                                                        <span className="truncate font-medium">{asset.name}</span>
                                                    </div>
                                                    <span className="w-24 text-center text-editor-textDim capitalize text-[10px]">
                                                        {asset.type}
                                                    </span>
                                                    <span className="w-20 text-right text-editor-textDim text-[10px]">
                                                        {asset.type === 'folder' ? '--' : `${asset.size} MB`}
                                                    </span>
                                                    <div className="w-16 flex items-center justify-center">
                                                        {isPreviewable && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleTogglePreview(e, asset)}
                                                                className={`p-1 rounded text-[10px] transition-colors ${
                                                                    previewUrl
                                                                        ? 'text-editor-accent hover:bg-editor-accent/20'
                                                                        : 'text-editor-textDim hover:text-white hover:bg-white/10'
                                                                }`}
                                                                title={previewUrl ? 'Hide Preview' : 'Show Preview'}
                                                            >
                                                                <Eye size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </DragAndDropZone>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </DragAndDropZone>

                {/* Collapsible Asset Preview Inspector Sidebar */}
                {showPreviewPanel && (
                    <AssetPreviewPanel
                        asset={selectedAsset}
                        onClose={() => setShowPreviewPanel(false)}
                    />
                )}
            </div>

            {/* Bottom Status Bar */}
            <div className="h-6 px-3 border-t border-editor-border bg-editor-bg flex items-center justify-between text-[10px] text-editor-textDim shrink-0">
                <div className="flex items-center gap-2">
                    <span>{filteredAssets.length} items</span>
                    {searchQuery && (
                        <span className="text-editor-accent">(filtered from {assets.length})</span>
                    )}
                </div>
                <div>
                    {selectedAsset ? (
                        <span className="text-white font-medium">
                            {selectedAsset.name} ({selectedAsset.size} MB)
                        </span>
                    ) : (
                        <span>{browser?.activeDirName || '/'}</span>
                    )}
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={
                        contextMenu.targetId === 'bg'
                            ? getBackgroundMenuItems()
                            : getContextMenuItems(contextMenu.targetId)
                    }
                    onClose={() => setContextMenu(null)}
                />
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
            `}</style>
        </div>
    );
};

export default AssetBrowser;