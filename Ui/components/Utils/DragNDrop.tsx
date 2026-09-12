import React, { useRef, useCallback, useEffect } from 'react';
import { dragState } from './dragState';

interface DragAndDropZoneProps {
    id?: string | number;
    payload?: any;
    onDrop?: (payload: any, event: PointerEvent) => void;
    children?: any;
    className?: string;
    highlight?: boolean;
    [key: string]: any;
}

export function DragAndDropZone({
    id = crypto.randomUUID(),
    payload,
    onDrop,
    children,
    className = '',
    highlight = true,
    style,
    ...rest
}: DragAndDropZoneProps) {
    const ref = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);
    const activeDropZone = useRef<HTMLElement | null>(null);

    // --- Double Click / Touch Logic Refs ---
    const lastTapTime = useRef<number>(0);
    const doubleTapTimer = useRef<NodeJS.Timeout | null>(null);
    const DOUBLE_TAP_DELAY = 300; // ms to wait for second tap

    // --- 1. Event Listener for Drop Data ---
    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const dataListener = (e: Event) => {
            const customEvent = e as CustomEvent;
            e.stopPropagation();
            if (onDrop) {
                onDrop(customEvent.detail, customEvent.detail?._$event);
            }
        };

        el.addEventListener('data', dataListener);
        return () => el.removeEventListener('data', dataListener);
    }, [onDrop]);

    // --- 2. Helper: Reset Touch Action ---
    // Resets the element to allow scrolling again
    const resetTouchAction = useCallback(() => {
        if (ref.current && payload) {
            ref.current.style.touchAction = 'pan-y'; // Allow vertical scroll
        }
    }, [payload]);

    // --- 3. Pointer Down (Start Drag OR Scroll) ---
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!payload || dragState.isDragging || !ref.current) return;
        if (e.button !== 0) return; // Only allow left-click to start dragging

        const now = Date.now();
        const isMouse = e.pointerType === 'mouse';
        const timeSinceLastTap = now - lastTapTime.current;
        const isDoubleTap = timeSinceLastTap < DOUBLE_TAP_DELAY;

        // LOGIC BRANCH:
        // 1. If Mouse: Drag immediately.
        // 2. If Touch AND Double Tap: Drag.
        // 3. If Touch AND Single Tap: Return (Allow system scroll).
        
        if (!isMouse && !isDoubleTap) {
            // It is a single touch. Record time and allow default browser scrolling.
            lastTapTime.current = now;
            return; 
        }

        // --- PREPARE DRAG ---
        // If we got here, we are dragging.
        // Clear any pending touch reset timers
        if (doubleTapTimer.current) {
            clearTimeout(doubleTapTimer.current);
            doubleTapTimer.current = null;
        }

        const el = ref.current;
        
        // Critical: Lock touch action immediately to prevent browser taking over
        el.style.touchAction = 'none';
        
        const rect = el.getBoundingClientRect();
        dragStartPos.current = { x: e.clientX, y: e.clientY };

        const resetZoneStyles = (zone: HTMLElement) => {
            zone.style.border = '';
            zone.style.backgroundColor = '';
        };

        const findValidDropZone = (startEl: Element | null): HTMLElement | null => {
            let curr = startEl?.closest('.drag-drop-zone') as HTMLElement | null;
            while (curr) {
                if (curr.dataset.dropId !== String(id) && curr.dataset.hasDropHandler === 'true') {
                    return curr;
                }
                curr = curr.parentElement?.closest('.drag-drop-zone') as HTMLElement | null;
            }
            return null;
        };

        let ghost: HTMLElement | null = null;

        // --- 4. Pointer Move ---
        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (!dragStartPos.current) return;

            const dx = Math.abs(moveEvent.clientX - dragStartPos.current.x);
            const dy = Math.abs(moveEvent.clientY - dragStartPos.current.y);

            if (!dragState.isDragging && (dx > 8 || dy > 8)) {
                dragState.payload = payload;
                dragState.sourceId = id;
                dragState.isDragging = true;

                const offsetX = moveEvent.clientX - rect.left;
                const offsetY = moveEvent.clientY - rect.top;

                // Create a floating clone ghost attached to document.body so the original element stays in place
                ghost = el.cloneNode(true) as HTMLElement;
                ghost.style.position = 'fixed';
                ghost.style.zIndex = '99999';
                ghost.style.pointerEvents = 'none';
                ghost.style.width = `${rect.width}px`;
                ghost.style.height = `${rect.height}px`;
                ghost.style.left = `${moveEvent.clientX - offsetX}px`;
                ghost.style.top = `${moveEvent.clientY - offsetY}px`;
                ghost.style.opacity = '0.85';
                ghost.style.transform = 'scale(1.02)';
                ghost.style.boxShadow = '0 12px 28px rgba(0,0,0,0.5)';
                ghost.style.transition = 'none';
                ghost.style.margin = '0';
                ghost.style.cursor = 'grabbing';
                document.body.appendChild(ghost);

                // Dim the source element slightly without moving it or breaking its layout
                el.style.opacity = '0.35';

                const dragMoveActive = (dragEvent: PointerEvent) => {
                    // Prevent default only during active dragging to stop pull-to-refresh etc
                    dragEvent.preventDefault(); 
                    
                    if (ghost) {
                        ghost.style.left = `${dragEvent.clientX - offsetX}px`;
                        ghost.style.top = `${dragEvent.clientY - offsetY}px`;
                    }

                    const elementBelow = document.elementFromPoint(dragEvent.clientX, dragEvent.clientY);
                    const newZone = findValidDropZone(elementBelow);

                    if (activeDropZone.current && activeDropZone.current !== newZone) {
                        resetZoneStyles(activeDropZone.current);
                        activeDropZone.current = null;
                    }

                    if (newZone) {
                        const shouldHighlight = newZone.dataset.highlight === 'true';
                        if (shouldHighlight && newZone !== activeDropZone.current) {
                            newZone.style.border = '1px solid #007bff';
                            newZone.style.backgroundColor = 'rgba(141,141,141,0.097)';
                            activeDropZone.current = newZone;
                        }
                    }
                };

                const dragEnd = (upEvent: PointerEvent | MouseEvent) => {
                    if (activeDropZone.current) {
                        resetZoneStyles(activeDropZone.current);
                        activeDropZone.current = null;
                    }

                    const elementBelow = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                    const targetZone = findValidDropZone(elementBelow);

                    if (targetZone) {
                        if (dragState.payload) dragState.payload._$event = upEvent;
                        targetZone.dispatchEvent(
                            new CustomEvent('data', { bubbles: false, detail: dragState.payload })
                        );
                    }

                    if (ghost && ghost.parentElement) {
                        ghost.remove();
                        ghost = null;
                    }

                    el.style.opacity = '';

                    // IMPORTANT: Restore scrolling ability after drag ends
                    resetTouchAction();

                    dragState.isDragging = false;
                    dragState.payload = null;
                    dragState.sourceId = null;
                    dragStartPos.current = null;

                    window.removeEventListener('pointermove', dragMoveActive, true);
                    window.removeEventListener('pointerup', dragEnd, true);
                    window.removeEventListener('pointercancel', dragEnd, true);
                    window.removeEventListener('mouseup', dragEnd, true);
                };

                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', handleEarlyUp);
                window.addEventListener('pointermove', dragMoveActive, { passive: false, capture: true });
                window.addEventListener('pointerup', dragEnd, { capture: true });
                window.addEventListener('pointercancel', dragEnd, { capture: true });
                window.addEventListener('mouseup', dragEnd, { capture: true });
            }
        };

        const handleEarlyUp = () => {
            dragStartPos.current = null;
            resetTouchAction(); // Ensure we unlock scrolling if they just clicked without dragging
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handleEarlyUp);
        };

        window.addEventListener('pointermove', handlePointerMove, { passive: false });
        window.addEventListener('pointerup', handleEarlyUp);
    }, [id, payload, resetTouchAction]);


    // --- 5. Passive Pointer Up Listener (To Prime Double Tap) ---
    // We listen for the end of a touch. If it was a touch, we temporarily 
    // disable scrolling to catch the POTENTIAL second tap.
    const handlePointerUpPassive = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'mouse' || !ref.current || !payload) return;

        // User lifted finger. Temporarily disable scroll 
        // so the NEXT tap (if immediate) can be caught as a drag start.
        ref.current.style.touchAction = 'none';

        // If they don't tap again within 300ms, re-enable scrolling
        doubleTapTimer.current = setTimeout(() => {
            resetTouchAction();
        }, DOUBLE_TAP_DELAY);
        
    }, [payload, resetTouchAction]);


    return (
        <div
            ref={ref}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUpPassive} // Listen for lift-off
            onDragStart={(e) => e.preventDefault()}
            draggable={false}
            data-drop-id={id}
            data-has-drop-handler={!!onDrop}
            data-highlight={highlight}
            className={`drag-drop-zone ${className}`}
            style={{
                // DEFAULT: Allow vertical scrolling (pan-y) so list scrolls naturally
                touchAction: payload ? 'pan-y' : undefined, 
                border: highlight ? '1px solid transparent' : undefined,
                cursor: payload ? 'grab' : undefined,
                transition: dragState.isDragging ? 'none' : 'border 0.2s, background-color 0.2s',
                // Disable native text selection to prevent conflict
                userSelect: 'none',
                WebkitUserSelect: 'none',
                ...style
            }}
            {...rest}
        >
            {children}
        </div>
    );
}