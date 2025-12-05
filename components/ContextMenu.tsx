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

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose, isSubmenu = false }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x });
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);

  // Adjust position to prevent menu from going off-screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newTop = y;
      let newLeft = x;

      if (y + rect.height > window.innerHeight) {
        newTop = Math.max(0, window.innerHeight - rect.height - 10);
      }
      if (x + rect.width > window.innerWidth) {
        newLeft = Math.max(0, x - rect.width); // Flip to left if no space on right
      }
      
      setPosition({ top: newTop, left: newLeft });
    }
  }, [x, y]);

  useEffect(() => {
    // Only bind global click listener for the root menu
    if (isSubmenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Logic handled by the top-level checking if it's in the tree
      // But for simplicity, we rely on the fact that any click outside closes the whole thing
      // unless we are specifically in a submenu.
      // We'll let the existing simple logic persist for the root:
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // We also need to check if we clicked on any open submenu portals
        // For this simple implementation, the root onClose is sufficient because
        // submenus are children of the root in React tree (conceptually) or
        // if they are portals, we need to be careful.
        
        // However, a simple "close all" works fine for editor context menus usually
        // unless interacting with the menu itself.
        
        // Check if target is inside ANY context menu
        const target = event.target as HTMLElement;
        if (!target.closest('.context-menu-container')) {
             onClose();
        }
      }
    };
    
    const handleScroll = () => onClose();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [onClose, isSubmenu]);

  return createPortal(
    <div
      ref={menuRef}
      className="context-menu-container fixed z-50 min-w-[160px] w-auto bg-[#27272a] border border-[#3f3f46] rounded-md shadow-2xl py-1 text-left"
      style={{ top: position.top, left: position.left }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return <div key={index} className="h-[1px] bg-[#3f3f46] my-1 mx-2" />;
        }

        const ItemRef = useRef<HTMLButtonElement>(null);

        return (
          <React.Fragment key={index}>
            <button
              ref={ItemRef}
              disabled={item.disabled}
              className={`
                w-full text-left px-3 py-1.5 text-xs flex items-center justify-between whitespace-nowrap
                ${item.disabled 
                  ? 'opacity-50 cursor-not-allowed text-[#a1a1aa]' 
                  : `hover:bg-[#2563eb] hover:text-white cursor-pointer ${item.danger ? 'text-red-400 hover:text-white' : 'text-[#d4d4d8]'}`
                }
                ${activeSubmenu === index ? 'bg-[#2563eb] text-white' : ''}
              `}
              onClick={(e) => {
                e.stopPropagation();
                if (!item.disabled && !item.submenu) {
                  item.action();
                  onClose();
                }
              }}
              onMouseEnter={() => {
                if (!item.disabled) setActiveSubmenu(index);
                else setActiveSubmenu(null);
              }}
            >
              <span className="mr-4">{item.label}</span>
              <div className="flex items-center">
                 {item.shortcut && <span className={`text-[9px] opacity-70 ml-4 ${activeSubmenu === index ? 'text-white' : 'text-[#a1a1aa]'}`}>{item.shortcut}</span>}
                 {item.submenu && <ChevronRight size={12} className="ml-2" />}
              </div>
            </button>

            {/* Render Submenu */}
            {item.submenu && activeSubmenu === index && ItemRef.current && (
              <ContextMenu
                x={ItemRef.current.getBoundingClientRect().right}
                y={ItemRef.current.getBoundingClientRect().top}
                items={item.submenu}
                onClose={onClose}
                isSubmenu={true}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>,
    document.body
  );
};

export default ContextMenu;