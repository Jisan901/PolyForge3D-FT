import { Editor } from '@/Editor/Editor';
import { mutate, toast } from '@/Editor/Mutation';
import { ObjectType } from '@/Core/Types/Objects';
import { MenuItem } from '@/Ui/components/ContextMenu';
import { MenuManager, DynamicMenuItem } from '@/Editor/MenuApi';
import { getMenu, getMenuFlat } from '@/Ui/components/Utils/getMenu';

/**
 * Registers Hierarchy-related actions into the global action registry.
 */
let hierarchyActionsRegistered = false;

export function registerHierarchyActions(): void {
    if (hierarchyActionsRegistered) return;
    hierarchyActionsRegistered = true;

    const actions = Editor.actionRegistry;

    actions.registerGlobal('hierarchy:select', (id?: string) => {
        return actions.execute('select_object', id);
    });

    actions.registerGlobal('hierarchy:focus', () => {
        return Editor.api?.three?.focusSelected?.();
    });

    actions.registerGlobal('hierarchy:duplicate', (id?: string) => {
        return actions.execute('duplicate_object', id);
    });

    actions.registerGlobal('hierarchy:delete', (id?: string) => {
        return actions.execute('delete_object', id);
    });

    actions.registerGlobal('hierarchy:create_empty', (parentUuid?: string | null) => {
        return actions.execute('add_object', {
            type: ObjectType.FOLDER,
            parentUuid: parentUuid ?? null,
        });
    });

    actions.registerGlobal('hierarchy:toggle_expand_all', (expand: boolean) => {
        const activeScene = Editor.core.sceneManager.activeScene;
        if (!activeScene) return;

        const setExpand = (obj: any) => {
            if (!obj || obj.userData?.hiddenOnEditor) return;
            mutate(obj.userData, 'expanded', expand);
            if (obj.children) {
                obj.children.forEach(setExpand);
            }
        };

        setExpand(activeScene);
        toast(expand ? 'Expanded all' : 'Collapsed all');
    });

    // Register default Hierarchy context menu items into MenuManager
    registerDefaultHierarchyMenuItems();
}

/**
 * Registers built-in hierarchy context menu items into MenuManager under 'hierarchy'.
 */
function registerDefaultHierarchyMenuItems(): void {
    const menu = MenuManager.getInstance();

    // Provider for dynamic context-sensitive hierarchy items
    menu.registerProvider('hierarchy', (items, context) => {
        const targetId = context?.targetId ?? null;
        const activeScene = context?.activeScene ?? Editor.core.sceneManager.activeScene;
        const isRoot = !targetId || targetId === activeScene?.uuid;
        const parentId = targetId || activeScene?.uuid;

        const handleAddObject = (type: any, pid?: string) => {
            return Editor.actionRegistry.execute('add_object', { type, parentUuid: pid });
        };

        const result: MenuItem[] = [];

        // If an actual object is selected (not scene root or empty space)
        if (!isRoot) {
            result.push(
                {
                    label: 'Focus in Viewport',
                    shortcut: 'F',
                    action: () => Editor.api?.three?.focusSelected?.(),
                },
                {
                    label: 'Rename',
                    shortcut: 'F2',
                    action: () => context?.setRenamingId?.(targetId),
                },
                {
                    label: 'Duplicate',
                    shortcut: 'Ctrl+D',
                    action: () => Editor.actionRegistry.execute('duplicate_object', targetId),
                },
                {
                    label: 'Delete',
                    shortcut: 'Del',
                    danger: true,
                    action: () => Editor.actionRegistry.execute('delete_object', targetId),
                },
                { separator: true, label: '', action: () => {} }
            );
        }

        // Universal creation items
        result.push(
            {
                label: 'Create Empty / Group',
                action: () =>
                    Editor.actionRegistry.execute('add_object', {
                        type: ObjectType.FOLDER,
                        parentUuid: parentId,
                    }),
            },
            {
                label: '3D Object',
                submenu: getMenuFlat(handleAddObject, parentId),
            },
            ...getMenu(handleAddObject, parentId)
        );

        return result;
    }, 'core:hierarchy');
}

/**
 * Generates the full list of MenuItem objects for Hierarchy context menu.
 * Emits Editor.api.buses.hierarchyContextMenu for full backward compatibility with plugins.
 */
export function getHierarchyContextMenuItems(
    targetId: string | null,
    context?: any
): MenuItem[] {
    registerHierarchyActions();

    const menu = MenuManager.getInstance();
    const ctx = {
        targetId,
        activeScene: Editor.core.sceneManager.activeScene,
        ...context,
    };

    const items = menu.getItems('hierarchy', ctx);

    // Emit event bus so plugins listening to hierarchyContextMenu can append options
    try {
        (Editor.api?.buses?.hierarchyContextMenu?.emit as any)?.(targetId, items);
    } catch (err) {
        console.error('[HierarchyActions] Error emitting hierarchyContextMenu:', err);
    }

    return items;
}

// Auto-register on import
registerHierarchyActions();
