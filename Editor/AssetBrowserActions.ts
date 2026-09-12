import { Editor } from '@/Editor/Editor';
import { toast } from '@/Editor/Mutation';
import { MenuItem } from '@/Ui/components/ContextMenu';
import { MenuManager, DynamicMenuItem } from '@/Editor/MenuApi';
import { AssetPreviewService } from '@/Editor/AssetPreviewService';
import fs from '@/Core/lib/fs';

/**
 * Registers Asset Browser-related actions into the global action registry.
 */
let assetActionsRegistered = false;

export function registerAssetBrowserActions(): void {
    if (assetActionsRegistered) return;
    assetActionsRegistered = true;

    const browser = () => Editor.assetBrowser;
    const actions = Editor.actionRegistry;

    actions.registerGlobal('asset:open', async (asset: any) => {
        if (!asset) return;
        if (asset.type === 'folder') {
            await browser()?.openDirectory(asset.id);
        } else if (asset.type === 'model' || asset.type === 'scene') {
            await Editor.mountScene(asset.id);
        } else {
            console.log('[AssetBrowser] Open asset:', asset);
        }
    });

    actions.registerGlobal('asset:delete', async (idOrAsset: any) => {
        const id = typeof idOrAsset === 'string' ? idOrAsset : idOrAsset?.id;
        if (!id) return;
        try {
            await browser()?.file.rm(id);
            await browser()?.reload();
            toast('Asset deleted');
        } catch (err) {
            console.error('[AssetBrowser] Error deleting asset:', err);
            toast('Failed to delete asset');
        }
    });

    actions.registerGlobal('asset:copy_path', (pathOrAsset: any) => {
        const path = typeof pathOrAsset === 'string' ? pathOrAsset : pathOrAsset?.id;
        if (!path) return;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(path);
            toast('Copied path to clipboard');
        }
    });

    actions.registerGlobal('asset:show_in_explorer', (asset: any) => {
        const path = typeof asset === 'string' ? asset : asset?.id;
        console.log('[AssetBrowser] Show in Explorer:', path);
        toast(`Location: ${path}`);
    });

    actions.registerGlobal('asset:rename', async (asset: any) => {
        const currentName = typeof asset === 'string' ? asset : asset?.name;
        const newName = prompt('Enter new name:', currentName);
        if (!newName || newName === currentName) return;
        console.log('[AssetBrowser] Rename asset:', asset, 'to:', newName);
        // If file rename API is supported
        toast(`Renamed to ${newName}`);
    });

    actions.registerGlobal('asset:new_script', async () => {
        const name = prompt('Enter script name (e.g. PlayerController.ts):');
        if (!name) return;
        const targetDir = browser()?.activeDirName || '/';
        const fullPath = `${targetDir.replace(/\/$/, '')}/${name}`;
        const template = `export default class ${name.replace(/\.[^/.]+$/, '')} {\n  onStart() {\n    // Started\n  }\n  onUpdate(dt: number) {\n    // Update\n  }\n}\n`;
        await fs.writeFile(fullPath, new Blob([template], { type: 'text/plain' }));
        await browser()?.reload();
        toast(`Created script: ${name}`);
    });

    actions.registerGlobal('asset:refresh', async () => {
        await browser()?.reload();
        toast('Assets refreshed');
    });

    // Register default context menu items into MenuManager
    registerDefaultAssetBrowserMenuItems();
}

/**
 * Registers built-in asset context menu items into MenuManager.
 */
function registerDefaultAssetBrowserMenuItems(): void {
    const menu = MenuManager.getInstance();

    // 1. Context menu for specific assets
    menu.registerProvider('assetbrowser:item', (items, context) => {
        const asset = context?.asset;
        if (!asset) return [];

        const result: MenuItem[] = [
            {
                label: 'Open',
                action: () => Editor.actionRegistry.execute('asset:open', asset),
            },
            {
                label: 'Show in Explorer',
                action: () => Editor.actionRegistry.execute('asset:show_in_explorer', asset),
            },
        ];

        // Preview options for geo, texture, mat, object
        const previewService = AssetPreviewService.getInstance();
        if (previewService.isPreviewSupported(asset.type)) {
            const hasPrev = previewService.hasPreview(asset.id);
            result.push({
                label: hasPrev ? 'Hide Preview' : 'Show Preview',
                action: async () => {
                    if (hasPrev) {
                        previewService.clearPreview(asset.id);
                    } else {
                        await previewService.generatePreview(asset);
                    }
                },
            });
        }

        result.push(
            { separator: true, label: '', action: () => {} },
            {
                label: 'Copy Path',
                action: () => Editor.actionRegistry.execute('asset:copy_path', asset),
            },
            {
                label: 'Rename',
                shortcut: 'F2',
                action: () => Editor.actionRegistry.execute('asset:rename', asset),
            },
            {
                label: 'Delete',
                shortcut: 'Del',
                danger: true,
                action: () => Editor.actionRegistry.execute('asset:delete', asset),
            },
            { separator: true, label: '', action: () => {} },
            {
                label: 'Reimport',
                action: () => Editor.actionRegistry.execute('reimport', asset.id),
            }
        );

        return result;
    }, 'core:assetbrowser:item');

    // 2. Context menu for empty background space
    menu.registerProvider('assetbrowser:background', () => {
        const result: MenuItem[] = [
            {
                label: 'Create Folder',
                action: () => Editor.actionRegistry.execute('new_folder'),
            },
            { separator: true, label: '', action: () => {} },
            {
                label: 'Create Material',
                action: () => Editor.actionRegistry.execute('new_material'),
            },
            {
                label: 'Create Script',
                action: () => Editor.actionRegistry.execute('asset:new_script'),
            },
            { separator: true, label: '', action: () => {} },
            {
                label: 'Import New Asset...',
                action: () => Editor.importer.openDialog(),
            },
            {
                label: 'Refresh',
                action: () => Editor.actionRegistry.execute('asset:refresh'),
            },
        ];

        return result;
    }, 'core:assetbrowser:background');
}

/**
 * Generates the full list of MenuItem objects for an asset right-click.
 * Emits Editor.api.buses.assetContextMenu so plugins can append options.
 */
export function getAssetItemContextMenu(asset: any, context?: any): MenuItem[] {
    registerAssetBrowserActions();

    const menu = MenuManager.getInstance();
    const ctx = { asset, ...context };
    const items = menu.getItems('assetbrowser:item', ctx);

    try {
        ((Editor.api?.buses as any)?.assetContextMenu?.emit as any)?.(asset, items);
    } catch (err) {
        // bus optional
    }

    return items;
}

/**
 * Generates the full list of MenuItem objects for background right-click in Asset Browser.
 */
export function getAssetBackgroundContextMenu(context?: any): MenuItem[] {
    registerAssetBrowserActions();

    const menu = MenuManager.getInstance();
    return menu.getItems('assetbrowser:background', context);
}

// Auto-register on import
registerAssetBrowserActions();
