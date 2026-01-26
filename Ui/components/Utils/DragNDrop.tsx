import React, { useRef, useCallback, useEffect } from 'react';
import { dragState } from './dragState';

interface DragAndDropZoneProps {
    id?: string | number;
    payload?: any;
    onDrop?: (payload: any, event: PointerEvent) => void;
    children: React.ReactNode;
    className?: string;
    highlight?: boolean;
}

export function DragAndDropZone({
    id = crypto.randomUUID(),
    payload,
    onDrop,
    children,
    className = '',
    highlight = true
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

        // --- 4. Pointer Move ---
        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (!dragStartPos.current) return;

            const dx = Math.abs(moveEvent.clientX - dragStartPos.current.x);
            const dy = Math.abs(moveEvent.clientY - dragStartPos.current.y);

            if (!dragState.isDragging && (dx > 10 || dy > 10)) {
                dragState.payload = payload;
                dragState.sourceId = id;
                dragState.isDragging = true;

                const offsetX = moveEvent.clientX - rect.left;
                const offsetY = moveEvent.clientY - rect.top;

                const originalStyles: Partial<CSSStyleDeclaration> = {
                    position: el.style.position,
                    left: el.style.left,
                    top: el.style.top,
                    width: el.style.width,
                    height: el.style.height,
                    zIndex: el.style.zIndex,
                    pointerEvents: el.style.pointerEvents,
                    touchAction: el.style.touchAction 
                };

                el.style.width = `${rect.width}px`;
                el.style.height = `${rect.height}px`;
                el.style.position = 'fixed';
                el.style.zIndex = '9999';
                el.style.pointerEvents = 'none';
                el.style.left = `${moveEvent.clientX - offsetX}px`;
                el.style.top = `${moveEvent.clientY - offsetY}px`;

                const dragMoveActive = (dragEvent: PointerEvent) => {
                    // Prevent default only during active dragging to stop pull-to-refresh etc
                    dragEvent.preventDefault(); 
                    
                    el.style.left = `${dragEvent.clientX - offsetX}px`;
                    el.style.top = `${dragEvent.clientY - offsetY}px`;

                    const elementBelow = document.elementFromPoint(dragEvent.clientX, dragEvent.clientY);
                    const newZone = elementBelow?.closest('.drag-drop-zone') as HTMLElement | null;

                    if (activeDropZone.current && activeDropZone.current !== newZone) {
                        resetZoneStyles(activeDropZone.current);
                        activeDropZone.current = null;
                    }

                    if (newZone && newZone.dataset.dropId !== String(id)) {
                        const hasHandler = newZone.dataset.hasDropHandler === 'true';
                        const shouldHighlight = newZone.dataset.highlight === 'true';
                        if (hasHandler && shouldHighlight && newZone !== activeDropZone.current) {
                            newZone.style.border = '1px solid #007bff';
                            newZone.style.backgroundColor = 'rgba(141,141,141,0.097)';
                            activeDropZone.current = newZone;
                        }
                    }
                };

                const dragEnd = (upEvent: PointerEvent) => {
                    if (activeDropZone.current) {
                        resetZoneStyles(activeDropZone.current);
                        activeDropZone.current = null;
                    }

                    const elementBelow = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                    const targetZone = elementBelow?.closest('.drag-drop-zone') as HTMLElement | null;

                    if (targetZone && targetZone.dataset.dropId !== String(id)) {
                        if (targetZone.dataset.hasDropHandler === 'true') {
                            if (dragState.payload) dragState.payload._$event = upEvent;
                            targetZone.dispatchEvent(
                                new CustomEvent('data', { bubbles: false, detail: dragState.payload })
                            );
                        }
                    }

                    Object.entries(originalStyles).forEach(([key, value]) => {
                        (el.style as any)[key] = value || '';
                    });

                    // IMPORTANT: Restore scrolling ability after drag ends
                    resetTouchAction();

                    dragState.isDragging = false;
                    dragState.payload = null;
                    dragState.sourceId = null;
                    dragStartPos.current = null;

                    window.removeEventListener('pointermove', dragMoveActive);
                    window.removeEventListener('pointerup', dragEnd);
                    window.removeEventListener('pointercancel', dragEnd);
                };

                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', handleEarlyUp);
                window.addEventListener('pointermove', dragMoveActive, { passive: false });
                window.addEventListener('pointerup', dragEnd, { passive: false });
                window.addEventListener('pointercancel', dragEnd, { passive: false });
            }
        };

        const handleEarlyUp = () => {
            dragStartPos.current = null;
            resetTouchAction(); // Ensure we unlock scrolling if they just clicked without dragging
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handleEarlyUp);
        };

        window.addEventListener('pointermove', handlePointerMove, { passive: false });
        window.addEventListener('pointerup', handleEarlyUp, { passive: false });
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
                WebkitUserSelect: 'none'
            }}
        >
            {children}
        </div>
    );
}