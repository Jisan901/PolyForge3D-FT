import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, FolderOpen, Copy, Trash2, Box, Image as ImageIcon, Layers } from 'lucide-react';
import { AssetPreviewService } from '@/Editor/AssetPreviewService';
import { ACTIONS } from '@/Editor/Actions';
import { toast } from '@/Editor/Mutation';
import { getAssetIcon } from '../IconMap';

interface AssetPreviewPanelProps {
    asset: any | null;
    onClose: () => void;
}

export const AssetPreviewPanel: React.FC<AssetPreviewPanelProps> = ({ asset, onClose }) => {
    const previewService = AssetPreviewService.getInstance();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!asset) {
            setPreviewUrl(null);
            return;
        }

        setPreviewUrl(previewService.getPreview(asset.id));

        const unsub = previewService.subscribe(() => {
            setPreviewUrl(previewService.getPreview(asset.id));
        });

        return unsub;
    }, [asset]);

    if (!asset) {
        return (
            <div className="w-64 border-l border-editor-border bg-editor-panel p-4 flex flex-col items-center justify-center text-editor-textDim select-none">
                <Box size={32} className="opacity-20 mb-2" />
                <span className="text-xs">No asset selected</span>
                <span className="text-[10px] opacity-70">Select an asset to view preview & details</span>
            </div>
        );
    }

    const isSupported = previewService.isPreviewSupported(asset.type);
    const hasPreview = Boolean(previewUrl);

    const handleTogglePreview = async () => {
        if (hasPreview) {
            previewService.clearPreview(asset.id);
            setPreviewUrl(null);
            toast('Preview cleared');
        } else {
            setIsGenerating(true);
            try {
                const url = await previewService.generatePreview(asset);
                if (url) toast('Preview generated');
            } finally {
                setIsGenerating(false);
            }
        }
    };

    const handleCopyPath = () => {
        ACTIONS.execute('asset:copy_path', asset.id);
    };

    const handleOpen = () => {
        ACTIONS.execute('asset:open', asset);
    };

    const handleDelete = () => {
        if (confirm(`Delete asset "${asset.name}"?`)) {
            ACTIONS.execute('asset:delete', asset.id);
            onClose();
        }
    };

    return (
        <div className="w-84 border-l border-editor-border bg-editor-panel flex flex-col h-full select-none text-xs flex-shrink-0 overflow-hidden">
            {/* Header */}
            <div className="h-8 px-3 border-b border-editor-border flex items-center justify-between bg-editor-bg shrink-0">
                <span className="font-semibold text-white tracking-wide text-[11px] uppercase">Asset Preview</span>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-white/10 text-editor-textDim hover:text-white transition-colors"
                    title="Close Preview Panel"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Preview Viewport / Media Display */}
            <div className="p-4 flex flex-col items-center bg-[#151515] border-b border-editor-border relative min-h-[240px] justify-center overflow-hidden">
                {previewUrl ? (
                    <div className="relative group/preview w-full flex items-center justify-center">
                        <img
                            src={previewUrl}
                            alt={asset.name}
                            className="max-h-60 w-full rounded object-contain shadow-lg border border-editor-border/50 bg-[#1e1e1e]"
                        />
                        <button
                            onClick={handleTogglePreview}
                            className="absolute bottom-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded text-[10px] flex items-center gap-1 opacity-0 group-hover/preview:opacity-100 transition-opacity"
                            title="Clear Preview"
                        >
                            <EyeOff size={12} />
                            <span>Clear</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                        <div className="mb-2 p-4 rounded-xl bg-white/5 border border-white/10">
                            {getAssetIcon(asset, { size: 48 })}
                        </div>
                        {isSupported ? (
                            <button
                                onClick={handleTogglePreview}
                                disabled={isGenerating}
                                className="mt-2 px-3 py-1 bg-editor-accent hover:bg-editor-accent/90 disabled:opacity-50 rounded text-white text-[11px] flex items-center gap-1.5 font-medium transition-colors shadow"
                            >
                                <Eye size={12} />
                                <span>{isGenerating ? 'Generating...' : 'Show Preview'}</span>
                            </button>
                        ) : (
                            <span className="text-[10px] text-editor-textDim mt-1">Preview not available for this type</span>
                        )}
                    </div>
                )}
            </div>

            {/* Metadata & Properties */}
            <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
                <div>
                    <h4 className="font-semibold text-white truncate text-xs" title={asset.name}>
                        {asset.name}
                    </h4>
                    <span className="text-[10px] text-editor-accent uppercase font-mono tracking-wider">
                        {asset.type}
                    </span>
                </div>

                <div className="flex flex-col gap-1.5 text-[11px] bg-black/20 p-2.5 rounded border border-editor-border/60">
                    <div className="flex justify-between">
                        <span className="text-editor-textDim">Type:</span>
                        <span className="text-white capitalize">{asset.type}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-editor-textDim">Size:</span>
                        <span className="text-white">{asset.size} MB</span>
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1">
                        <span className="text-editor-textDim text-[10px]">Path:</span>
                        <span className="text-white font-mono text-[9px] break-all bg-black/30 p-1 rounded border border-white/5">
                            {asset.id}
                        </span>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-editor-border">
                    <button
                        onClick={handleOpen}
                        className="w-full py-1.5 bg-[#2a2a2a] hover:bg-[#333] border border-editor-border rounded text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                        <FolderOpen size={12} />
                        <span>Open Asset</span>
                    </button>
                    <button
                        onClick={handleCopyPath}
                        className="w-full py-1.5 bg-[#2a2a2a] hover:bg-[#333] border border-editor-border rounded text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                        <Copy size={12} />
                        <span>Copy Path</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        className="w-full py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 rounded text-red-300 flex items-center justify-center gap-1.5 transition-colors mt-1"
                    >
                        <Trash2 size={12} />
                        <span>Delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssetPreviewPanel;
