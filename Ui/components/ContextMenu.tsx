import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';

export interface MenuItem {
  label: string;
  action: () => void;
  shortcut?: string;
  separator?: boolean;
  danger?: boolean;
  disabled?: boolean;
  submenu?: MenuItem[];
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

  return (
    <>
      <button
        ref={ref}
        disabled={item.disabled}
        className={`
          w-full px-3 py-1.5 text-xs flex items-center justify-between
          ${item.disabled
            ? 'opacity-50 cursor-not-allowed text-[#a1a1aa]'
            : `hover:bg-[#2563eb] hover:text-white ${
                item.danger ? 'text-red-400' : 'text-[#d4d4d8]'
              }`
          }
          ${active ? 'bg-[#2563eb] text-white' : ''}
        `}
        onMouseEnter={() => {
          if (!item.disabled) setActive(index);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!item.disabled && !item.submenu) {
            item.action();
            onClose();
          }
        }}
      >
        <span>{item.label}</span>
        <span className="flex items-center gap-2">
          {item.shortcut && (
            <span className="text-[9px] opacity-70">{item.shortcut}</span>
          )}
          {item.submenu && <ChevronRight size={12} />}
        </span>
      </button>

      {item.submenu && active && ref.current && (
        <ContextMenu
          x={ref.current.getBoundingClientRect().right}
          y={ref.current.getBoundingClientRect().top}
          items={item.submenu}
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

export default ContextMenu;