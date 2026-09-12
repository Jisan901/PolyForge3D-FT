import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';
import { MenuManager } from '@/Editor/MenuApi';

export interface MenuItem {
  label?: string;
  action?: () => void;
  shortcut?: string;
  separator?: boolean;
  type?: 'separator' | 'submenu' | string;
  danger?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  submenu?: MenuItem[];
  children?: MenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
  isSubmenu?: boolean;
}

/* ---------------------------------------------
   Single menu item (NO hooks in loops)
----------------------------------------------*/
const ContextMenuItem: React.FC<{
  item: MenuItem;
  index: number;
  active: boolean;
  setActive: (i: number | null) => void;
  onClose: () => void;
}> = ({ item, index, active, setActive, onClose }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const submenu = item.submenu || item.children;
  const hasSubmenu = Boolean(submenu && submenu.length > 0);

  return (
    <>
      <button
        ref={ref}
        disabled={item.disabled}
        className={`
          w-full px-3 py-1.5 text-xs flex items-center justify-between
          ${item.disabled
            ? 'opacity-50 cursor-not-allowed text-[#a1a1aa]'
            : `hover:bg-[#2563eb] hover:text-white ${item.danger ? 'text-red-400' : 'text-[#d4d4d8]'
            }`
          }
          ${active ? 'bg-[#2563eb] text-white' : ''}
        `}
        onMouseEnter={() => {
          if (!item.disabled) setActive(index);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!item.disabled && !hasSubmenu && item.action) {
            item.action();
            onClose();
          }
        }}
      >
        <span className="flex items-center gap-1.5 truncate">
          {item.icon && <span className="opacity-80 shrink-0">{item.icon}</span>}
          <span className="truncate">{item.label}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0 ml-2">
          {item.shortcut && (
            <span className="text-[9px] opacity-70">{item.shortcut}</span>
          )}
          {hasSubmenu && <ChevronRight size={12} />}
        </span>
      </button>

      {hasSubmenu && active && ref.current && (
        <ContextMenu
          x={ref.current.getBoundingClientRect().right}
          y={ref.current.getBoundingClientRect().top}
          items={submenu!}
          onClose={onClose}
          isSubmenu
        />
      )}
    </>
  );
};

/* ---------------------------------------------
   Root Context Menu
----------------------------------------------*/
const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  onClose,
  isSubmenu = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);
  const [position, setPosition] = useState({ top: y, left: x });
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  /* ---- Clamp menu to viewport with max-height for scrolling ---- */
  useEffect(() => {
    if (!menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const padding = 8; // padding from viewport edges

    let top = y;
    let left = x;
    let calculatedMaxHeight: number | undefined = undefined;

    // Calculate available space below and above
    const spaceBelow = viewportHeight - y - padding;
    const spaceAbove = y - padding;

    // If menu is taller than available space, set max-height and enable scrolling
    if (rect.height > spaceBelow) {
      if (spaceBelow > spaceAbove) {
        // More space below, position at y and set max-height
        calculatedMaxHeight = spaceBelow;
      } else {
        // More space above, position menu to fit above
        if (rect.height > spaceAbove) {
          // Menu is taller than space above too, anchor to top
          top = padding;
          calculatedMaxHeight = viewportHeight - (padding * 2);
        } else {
          // Menu fits above
          top = y - rect.height;
        }
      }
    }

    // Horizontal positioning
    if (left + rect.width > viewportWidth - padding) {
      left = x - rect.width;
      // If it's a submenu and still overflows, position to the left of parent
      if (left < padding) {
        left = Math.max(padding, viewportWidth - rect.width - padding);
      }
    }

    setPosition({
      top: Math.max(padding, top),
      left: Math.max(padding, left)
    });
    setMaxHeight(calculatedMaxHeight);
  }, [x, y]);


  /* ---- Outside click handling (DELAYED) ---- */
  useEffect(() => {
    if (isSubmenu) return;

    const handleOutside = (e: MouseEvent) => {

      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu-root')) {
        onClose();
      }
    };

    const id = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleOutside);
    });

    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [onClose, isSubmenu]);

  return createPortal(
    <div
      ref={menuRef}
      className="context-menu-root fixed z-50 min-w-[160px] bg-[#27272a] border border-[#3f3f46] rounded-md shadow-2xl py-1 overflow-auto"
      style={{ top: position.top, left: position.left, maxHeight: maxHeight ? `${maxHeight}px` : undefined }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="h-[1px] bg-[#3f3f46] my-1 mx-2" />
        ) : (
          <ContextMenuItem
            key={i}
            item={item}
            index={i}
            active={activeSubmenu === i}
            setActive={setActiveSubmenu}
            onClose={onClose}
          />
        )
      )}
    </div>,
    document.body
  );
};

export interface UseContextMenuOptions<T = any> {
  menuId?: string;
  items?: MenuItem[] | ((data: T) => MenuItem[]);
  onOpen?: (data?: T) => void;
  onClose?: () => void;
}

/**
 * Highly reusable hook for right-click and button-triggered context menus.
 * Can consume items dynamically from MenuManager or direct props/generators.
 */
export function useContextMenu<T = any>(options?: UseContextMenuOptions<T>) {
  const [menuState, setMenuState] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    data: T | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    data: null,
  });

  const [updateTick, setUpdateTick] = useState(0);

  // Subscribe to MenuManager updates if a menuId was specified
  useEffect(() => {
    if (!options?.menuId) return;
    return MenuManager.getInstance().subscribe(() => {
      setUpdateTick((t) => t + 1);
    });
  }, [options?.menuId]);

  const openMenu = useCallback(
    (e: React.MouseEvent | { clientX: number; clientY: number }, data?: T) => {
      if ('preventDefault' in e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      if ('stopPropagation' in e && typeof e.stopPropagation === 'function') {
        e.stopPropagation();
      }

      setMenuState({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        data: data ?? null,
      });

      options?.onOpen?.(data);
    },
    [options]
  );

  const closeMenu = useCallback(() => {
    setMenuState((prev) => ({ ...prev, isOpen: false }));
    options?.onClose?.();
  }, [options]);

  const resolvedItems = useMemo(() => {
    if (!menuState.isOpen) return [];

    if (typeof options?.items === 'function') {
      return options.items(menuState.data as T);
    }
    if (Array.isArray(options?.items)) {
      return options.items;
    }
    if (options?.menuId) {
      return MenuManager.getInstance().getItems(options.menuId, menuState.data);
    }
    return [];
  }, [menuState.isOpen, menuState.data, options, updateTick]);

  const ContextMenuComponent: React.FC<{ items?: MenuItem[] }> = useCallback(
    ({ items: overrideItems }) => {
      if (!menuState.isOpen) return null;
      const displayItems = overrideItems || resolvedItems;
      if (!displayItems || displayItems.length === 0) return null;

      return (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={displayItems}
          onClose={closeMenu}
        />
      );
    },
    [menuState.isOpen, menuState.x, menuState.y, resolvedItems, closeMenu]
  );

  return {
    isOpen: menuState.isOpen,
    menuState,
    openMenu,
    closeMenu,
    items: resolvedItems,
    ContextMenuComponent,
  };
}

export default ContextMenu;
