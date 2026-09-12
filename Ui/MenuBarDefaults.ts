import { Editor } from '@/Editor/Editor';
import { toast } from '@/Editor/Mutation';
import { ACTIONS } from '@/Editor/Actions';
import { ObjectType } from '@/Core/Types/Objects';
import { MenuManager, DynamicMenuItem } from '@/Editor/MenuApi';
import { Windy } from '@/Windy';

const Core = Editor.core;

/**
 * Registers standard built-in items for PolyForge3D menu bar.
 * This runs once at startup so plugins can append, prepend, or mutate them.
 */
let defaultsRegistered = false;

export function registerDefaultMenuItems(): void {
    if (defaultsRegistered) return;
    defaultsRegistered = true;

    const menu = MenuManager.getInstance();

    // -----------------------------------------------------------------------
    // FILE MENU
    // -----------------------------------------------------------------------
    const fileItems: DynamicMenuItem[] = [
        {
            id: 'file_new_scene',
            label: 'New Scene',
            shortcut: 'Ctrl+N',
            order: 10,
            action: () => Editor.newScene(),
        },
        {
            id: 'file_open_primary',
            label: 'Open Primary',
            order: 20,
            action: async () => {
                await Editor.mountScene('/Game/files/Scenes/Primary.bin');
            },
        },
        {
            id: 'file_sep_1',
            separator: true,
            label: '',
            order: 25,
        },
        {
            id: 'file_save_scene',
            label: 'Save Scene',
            shortcut: 'Ctrl+S',
            order: 30,
            action: () => {
                Core.sceneManager.saveActive();
                toast('Saved Active');
            },
        },
        {
            id: 'file_save_scene_primary',
            label: 'Save Scene Primary',
            shortcut: 'Ctrl+S',
            order: 40,
            action: () => {
                Core.sceneManager.savePrimary();
                toast('Saved Primary');
            },
        },
        {
            id: 'file_save_scene_as',
            label: 'Save Scene As...',
            shortcut: 'Ctrl+Shift+S',
            order: 50,
            action: () => console.log('Save Scene As'),
        },
        {
            id: 'file_sep_2',
            separator: true,
            label: '',
            order: 55,
        },
        {
            id: 'file_build_settings',
            label: 'Build Settings',
            shortcut: 'Ctrl+Shift+B',
            order: 60,
            action: () => console.log('Build Settings'),
        },
        {
            id: 'file_build_and_run',
            label: 'Build And Run',
            shortcut: 'Ctrl+B',
            order: 70,
            action: () => console.log('Build And Run'),
        },
        {
            id: 'file_sep_3',
            separator: true,
            label: '',
            order: 75,
        },
        {
            id: 'file_exit',
            label: 'Exit',
            order: 80,
            action: () => console.log('Exit'),
        },
    ];
    menu.addItems('file', fileItems);

    // -----------------------------------------------------------------------
    // EDIT MENU
    // -----------------------------------------------------------------------
    const editItems: DynamicMenuItem[] = [
        {
            id: 'edit_undo',
            label: 'Undo',
            shortcut: 'Ctrl+Z',
            order: 10,
            action: () => Editor.undo(),
        },
        {
            id: 'edit_redo',
            label: 'Redo',
            shortcut: 'Ctrl+Y',
            order: 20,
            action: () => Editor.redo(),
        },
        {
            id: 'edit_sep_1',
            separator: true,
            label: '',
            order: 25,
        },
        {
            id: 'edit_cut',
            label: 'Cut',
            shortcut: 'Ctrl+X',
            order: 30,
            action: () => console.log('Cut'),
        },
        {
            id: 'edit_copy',
            label: 'Copy',
            shortcut: 'Ctrl+C',
            order: 40,
            action: () => console.log('Copy'),
        },
        {
            id: 'edit_paste',
            label: 'Paste',
            shortcut: 'Ctrl+V',
            order: 50,
            action: () => console.log('Paste'),
        },
        {
            id: 'edit_sep_2',
            separator: true,
            label: '',
            order: 55,
        },
        {
            id: 'edit_duplicate',
            label: 'Duplicate',
            shortcut: 'Ctrl+D',
            order: 60,
            action: (ctx) => {
                const id = ctx?.selectedId || Editor.api?.three?.selectedObject?.uuid;
                if (id) ACTIONS.execute('duplicate_object', id);
            },
        },
        {
            id: 'edit_delete',
            label: 'Delete',
            shortcut: 'Del',
            danger: true,
            order: 70,
            action: (ctx) => {
                const id = ctx?.selectedId || Editor.api?.three?.selectedObject?.uuid;
                if (id) ACTIONS.execute('delete_object', id);
            },
        },
        {
            id: 'edit_sep_3',
            separator: true,
            label: '',
            order: 75,
        },
        {
            id: 'edit_play',
            label: 'Play',
            shortcut: 'Ctrl+P',
            order: 80,
            action: () => Editor.enterPlayMode(),
        },
        {
            id: 'edit_pause',
            label: 'Pause',
            shortcut: 'Ctrl+Shift+P',
            order: 90,
            action: () => Editor.pausePlayMode(),
        },
        {
            id: 'edit_sep_4',
            separator: true,
            label: '',
            order: 95,
        },
        {
            id: 'edit_settings',
            label: 'Settings',
            shortcut: 'Ctrl+,',
            order: 100,
            action: () => console.log('Settings'),
        },
    ];
    menu.addItems('edit', editItems);

    // -----------------------------------------------------------------------
    // ASSETS MENU
    // -----------------------------------------------------------------------
    const assetItems: DynamicMenuItem[] = [
        {
            id: 'assets_import',
            label: 'Import New Asset...',
            order: 10,
            action: () => {
                void Editor.importer.openDialog();
            },
        },
        {
            id: 'assets_refresh',
            label: 'Refresh Assets',
            order: 20,
            action: () => Editor.assetBrowser?.reload(),
        },
        {
            id: 'assets_sep_1',
            separator: true,
            label: '',
            order: 25,
        },
        {
            id: 'assets_new_material',
            label: 'New Material',
            order: 30,
            action: () => ACTIONS.execute('new_material'),
        },
        {
            id: 'assets_new_folder',
            label: 'New Folder',
            order: 40,
            action: () => ACTIONS.execute('new_folder'),
        },
    ];
    menu.addItems('assets', assetItems);

    // -----------------------------------------------------------------------
    // GAMEOBJECT MENU
    // -----------------------------------------------------------------------
    const gameObjectItems: DynamicMenuItem[] = [
        {
            id: 'go_create_empty',
            label: 'Create Empty',
            order: 10,
            action: (ctx) => {
                const parentUuid = ctx?.selectedId || null;
                ACTIONS.execute('add_object', { type: ObjectType.FOLDER, parentUuid });
            },
        },
        {
            id: 'go_sep_1',
            separator: true,
            label: '',
            order: 15,
        },
        {
            id: 'go_3d_objects',
            label: '3D Object',
            order: 20,
            submenu: [
                {
                    id: 'go_cube',
                    label: 'Cube',
                    action: (ctx) => {
                        const parentUuid = ctx?.selectedId || null;
                        ACTIONS.execute('add_object', { type: ObjectType.CUBE, parentUuid });
                    },
                },
                {
                    id: 'go_sphere',
                    label: 'Sphere',
                    action: (ctx) => {
                        const parentUuid = ctx?.selectedId || null;
                        ACTIONS.execute('add_object', { type: ObjectType.SPHERE, parentUuid });
                    },
                },
                {
                    id: 'go_capsule',
                    label: 'Capsule',
                    action: (ctx) => {
                        const parentUuid = ctx?.selectedId || null;
                        ACTIONS.execute('add_object', { type: ObjectType.CAPSULE, parentUuid });
                    },
                },
                {
                    id: 'go_cylinder',
                    label: 'Cylinder',
                    action: (ctx) => {
                        const parentUuid = ctx?.selectedId || null;
                        ACTIONS.execute('add_object', { type: ObjectType.CYLINDER, parentUuid });
                    },
                },
                {
                    id: 'go_plane',
                    label: 'Plane',
                    action: (ctx) => {
                        const parentUuid = ctx?.selectedId || null;
                        ACTIONS.execute('add_object', { type: ObjectType.PLANE, parentUuid });
                    },
                },
                {
                    id: 'go_terrain',
                    label: 'Terrain',
                    action: (ctx) => {
                        const parentUuid = ctx?.selectedId || null;
                        ACTIONS.execute('add_object', { type: ObjectType.TERRAIN, parentUuid });
                    },
                },
            ],
        },
        {
            id: 'go_light',
            label: 'Light',
            order: 30,
            submenu: [
                {
                    id: 'go_point_light',
                    label: 'Point Light',
                    action: (ctx) => {
                        const parentUuid = ctx?.selectedId || null;
                        ACTIONS.execute('add_object', { type: ObjectType.POINTLIGHT, parentUuid });
                    },
                },
            ],
        },
        {
            id: 'go_sep_2',
            separator: true,
            label: '',
            order: 35,
        },
        {
            id: 'go_import',
            label: 'Import New Asset...',
            order: 40,
            action: () => {
                void Editor.importer.openDialog();
            },
        },
    ];
    menu.addItems('gameobject', gameObjectItems);

    // -----------------------------------------------------------------------
    // COMPONENT MENU
    // -----------------------------------------------------------------------
    const componentItems: DynamicMenuItem[] = [
        {
            id: 'comp_rigidbody',
            label: 'Physics > Rigidbody',
            order: 10,
            action: () => ACTIONS.execute('add_component', { id: 1 }), // RIGIDBODY code
        },
        {
            id: 'comp_collider',
            label: 'Physics > Collider',
            order: 20,
            action: () => ACTIONS.execute('add_component', { id: 2 }), // COLLIDER code
        },
        {
            id: 'comp_script',
            label: 'Scripts > Script Component',
            order: 30,
            action: () => ACTIONS.execute('add_component', { id: 7 }), // SCRIPT code
        },
    ];
    menu.addItems('component', componentItems);

    // -----------------------------------------------------------------------
    // WINDOW MENU
    // -----------------------------------------------------------------------
    const windowItems: DynamicMenuItem[] = [
        {
            id: 'win_reset_layout',
            label: 'Reset Layout',
            order: 10,
            action: () => {
                Windy.clear();
                window.location.reload();
            },
        },
        {
            id: 'win_sep_1',
            separator: true,
            label: '',
            order: 15,
        },
        {
            id: 'win_refresh_registry',
            label: 'Refresh Registry',
            order: 20,
            action: () => (Editor as any).refreshRegistry?.(),
        },
    ];
    menu.addItems('window', windowItems);

    // -----------------------------------------------------------------------
    // HELP MENU
    // -----------------------------------------------------------------------
    const helpItems: DynamicMenuItem[] = [
        {
            id: 'help_about',
            label: 'About PolyForge3D',
            order: 10,
            action: () => alert('PolyForge3D Editor v1.0.0'),
        },
        {
            id: 'help_fullscreen',
            label: 'Toggle Fullscreen',
            shortcut: 'F11',
            order: 20,
            action: () => {
                if (!document.fullscreenElement) {
                    document.body.requestFullscreen?.();
                } else {
                    document.exitFullscreen?.();
                }
            },
        },
    ];
    menu.addItems('help', helpItems);
}
