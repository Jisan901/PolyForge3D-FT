import React, { useState, useEffect } from 'react';
import { MenuItem } from '@/Ui/components/ContextMenu';
import { BusHub } from '@/Editor/Api';

export interface MenuDefinition {
    id: string;
    label: string;
    order?: number;
    icon?: React.ReactNode;
    pluginId?: string;
    visible?: boolean | (() => boolean);
}

export interface DynamicMenuItem extends Omit<MenuItem, 'submenu' | 'children' | 'disabled' | 'action'> {
    id?: string;
    order?: number;
    pluginId?: string;
    visible?: boolean | (() => boolean);
    disabled?: boolean | (() => boolean);
    action?: (context?: any) => any;
    submenu?: DynamicMenuItem[];
    children?: DynamicMenuItem[];
}

export type MenuItemProvider = (
    items: MenuItem[],
    context?: any
) => MenuItem[] | void;

export class MenuManager {
    private static instance: MenuManager;

    private menus: Map<string, MenuDefinition> = new Map();
    private menuItems: Map<string, DynamicMenuItem[]> = new Map();
    private providers: Map<string, Set<MenuItemProvider>> = new Map();
    private listeners: Set<() => void> = new Set();

    private constructor() {
        this.initDefaultMenus();
    }

    public static getInstance(): MenuManager {
        if (!MenuManager.instance) {
            MenuManager.instance = new MenuManager();
        }
        return MenuManager.instance;
    }

    /**
     * Initializes the standard editor top-level menus in default order.
     */
    private initDefaultMenus(): void {
        const defaults: MenuDefinition[] = [
            { id: 'file', label: 'File', order: 10 },
            { id: 'edit', label: 'Edit', order: 20 },
            { id: 'assets', label: 'Assets', order: 30 },
            { id: 'gameobject', label: 'GameObject', order: 40 },
            { id: 'component', label: 'Component', order: 50 },
            { id: 'window', label: 'Window', order: 60 },
            { id: 'help', label: 'Help', order: 70 },
        ];

        for (const menu of defaults) {
            this.menus.set(menu.id, menu);
            if (!this.menuItems.has(menu.id)) {
                this.menuItems.set(menu.id, []);
            }
        }
    }

    /**
     * Register or update a top-level menu category.
     * Returns an unregister callback for clean disposal.
     */
    public registerMenu(menu: MenuDefinition): () => void {
        this.menus.set(menu.id, {
            order: 100,
            ...this.menus.get(menu.id),
            ...menu,
        });

        if (!this.menuItems.has(menu.id)) {
            this.menuItems.set(menu.id, []);
        }

        this.notify();

        return () => this.unregisterMenu(menu.id);
    }

    /**
     * Unregister a top-level menu category.
     */
    public unregisterMenu(menuId: string): void {
        if (this.menus.delete(menuId)) {
            this.notify();
        }
    }

    /**
     * Add a single menu item to a menu category.
     * Auto-creates the menu if it does not already exist.
     * Returns an unregister callback.
     */
    public addItem(menuId: string, item: DynamicMenuItem): () => void {
        if (!this.menus.has(menuId)) {
            const label = menuId.charAt(0).toUpperCase() + menuId.slice(1);
            this.menus.set(menuId, { id: menuId, label, order: 100 });
        }

        if (!this.menuItems.has(menuId)) {
            this.menuItems.set(menuId, []);
        }

        const items = this.menuItems.get(menuId)!;
        items.push(item);
        this.notify();

        return () => {
            this.removeItem(menuId, item);
        };
    }

    /**
     * Add multiple menu items to a menu category.
     */
    public addItems(menuId: string, items: DynamicMenuItem[], pluginId?: string): () => void {
        const unsubs = items.map((item) => {
            if (pluginId && !item.pluginId) item.pluginId = pluginId;
            return this.addItem(menuId, item);
        });

        return () => {
            unsubs.forEach((unsub) => unsub());
        };
    }

    /**
     * Remove a specific menu item from a menu category.
     */
    public removeItem(menuId: string, itemOrId: DynamicMenuItem | string): void {
        const items = this.menuItems.get(menuId);
        if (!items) return;

        const idx = items.findIndex((i) =>
            typeof itemOrId === 'string' ? i.id === itemOrId : i === itemOrId
        );

        if (idx !== -1) {
            items.splice(idx, 1);
            this.notify();
        }
    }

    /**
     * Register a dynamic item provider function called when a menu opens.
     * Useful for context-sensitive items (e.g., based on selected object or scene state).
     */
    public registerProvider(
        menuId: string,
        provider: MenuItemProvider,
        pluginId?: string
    ): () => void {
        if (!this.providers.has(menuId)) {
            this.providers.set(menuId, new Set());
        }

        const set = this.providers.get(menuId)!;
        set.add(provider);
        this.notify();

        return () => {
            set.delete(provider);
        };
    }

    /**
     * Unregister all menus, items, and providers registered by a specific plugin ID.
     */
    public unregisterPlugin(pluginId: string): void {
        let changed = false;

        // Clean menus
        for (const [id, menu] of this.menus.entries()) {
            if (menu.pluginId === pluginId) {
                this.menus.delete(id);
                changed = true;
            }
        }

        // Clean items
        for (const [menuId, items] of this.menuItems.entries()) {
            const filtered = items.filter((item) => item.pluginId !== pluginId);
            if (filtered.length !== items.length) {
                this.menuItems.set(menuId, filtered);
                changed = true;
            }
        }

        if (changed) {
            this.notify();
        }
    }

    /**
     * Get all visible top-level menus sorted by order.
     */
    public getMenus(): MenuDefinition[] {
        const result: MenuDefinition[] = [];

        for (const menu of this.menus.values()) {
            const isVisible =
                typeof menu.visible === 'function'
                    ? menu.visible()
                    : menu.visible !== false;

            if (isVisible) {
                result.push(menu);
            }
        }

        return result.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
    }

    /**
     * Resolves and returns the full list of MenuItem objects for a menu category,
     * including ordering, visibility checks, disabled resolvers, nested submenus,
     * and provider contributions.
     */
    public getItems(menuId: string, context?: any): MenuItem[] {
        const rawItems = this.menuItems.get(menuId) || [];

        // 1. Process and filter registered items
        const resolvedItems = this.resolveItems(rawItems, context);

        // 2. Call registered dynamic providers
        const providers = this.providers.get(menuId);
        if (providers && providers.size > 0) {
            for (const provider of providers) {
                try {
                    const extra = provider(resolvedItems, context);
                    if (Array.isArray(extra)) {
                        resolvedItems.push(...extra);
                    }
                } catch (err) {
                    console.error(`[MenuManager] Error in provider for menu "${menuId}":`, err);
                }
            }
        }

        // 3. Emit BusHub.menuOpen so subscribers can contribute items on the fly
        try {
            BusHub.menuOpen.emit(menuId, resolvedItems);
        } catch {
            // BusHub may be initializing
        }

        return resolvedItems;
    }

    private resolveItems(items: DynamicMenuItem[], context?: any): MenuItem[] {
        const result: (MenuItem & { order?: number })[] = [];

        for (const item of items) {
            // Check visibility
            const isVisible =
                typeof item.visible === 'function'
                    ? item.visible()
                    : item.visible !== false;

            if (!isVisible) continue;

            // Resolve disabled state
            const isDisabled =
                typeof item.disabled === 'function'
                    ? item.disabled()
                    : item.disabled;

            // Resolve submenus
            const sub = item.submenu || item.children;
            const resolvedSubmenu = sub ? this.resolveItems(sub, context) : undefined;

            const menuItem: MenuItem & { order?: number } = {
                label: item.label,
                action: item.action
                    ? () => {
                          void item.action!(context);
                      }
                    : undefined,
                shortcut: item.shortcut,
                separator: item.separator,
                danger: item.danger,
                disabled: isDisabled,
                submenu: resolvedSubmenu,
                order: item.order,
            };

            result.push(menuItem);
        }

        // Sort by order if specified
        return result.sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
    }

    /**
     * Subscribe to menu changes (useful for React components to re-render).
     */
    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify(): void {
        this.listeners.forEach((listener) => {
            try {
                listener();
            } catch (err) {
                console.error('[MenuManager] Error notifying listener:', err);
            }
        });

        try {
            BusHub.menuUpdate.emit();
        } catch {
            // BusHub may be initializing
        }
    }
}

/**
 * React hook to reactively track menus and trigger re-renders on registration changes.
 */
export function useMenus(): MenuManager {
    const [, setTick] = useState(0);

    useEffect(() => {
        const manager = MenuManager.getInstance();
        return manager.subscribe(() => {
            setTick((t) => t + 1);
        });
    }, []);

    return MenuManager.getInstance();
}

export default MenuManager.getInstance();
