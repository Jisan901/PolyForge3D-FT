import React, { useRef, useCallback, useEffect } from 'react';
import { dragState } from './dragState';

export function DragAndDropZone({
    id = crypto.randomUUID(),
    payload,
    onDrop,
    children,
    className='',
    highlight = true
}: {
    id?: string | number;
    payload?: any;
    onDrop?: (payload: any) => void;
    className?:string
    children: React.ReactNode;
    highlight?: boolean
}) {
    const ref = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);



    useEffect(() => {
        const dataListener = (e) => {

            e.stopPropagation()
            onDrop?.(e.detail, e.detail._$event);
            //ref.current.removeEventListener('data',dataListener)
        }
        ref.current?.addEventListener?.('data', dataListener)

        return () => ref.current?.removeEventListener?.('data', dataListener)

    }, [])


    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!payload || dragState.isDragging || !ref.current) {
           // e.preventDefault();
            return;
        }

        //e.preventDefault();

        const el = ref.current;
        const rect = el.getBoundingClientRect();

        dragStartPos.current = { x: e.clientX, y: e.clientY };

        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (!dragStartPos.current || dragState.isDragging) return;

            const dx = Math.abs(moveEvent.clientX - dragStartPos.current.x);
            const dy = Math.abs(moveEvent.clientY - dragStartPos.current.y);

            if (dx > 10 || dy > 10) {
                const offsetX = moveEvent.clientX - rect.left;
                const offsetY = moveEvent.clientY - rect.top;

                const originalStyles: Partial<CSSStyleDeclaration> = {
                    position: el.style.position,
                    left: el.style.left,
                    top: el.style.top,
                    width: el.style.width,
                    height: el.style.height,
                    transform: el.style.transform,
                    zIndex: el.style.zIndex,
                    pointerEvents: el.style.pointerEvents,
                    border: el.style.border,
                    backgroundColor: el.style.backgroundColor
                };

                dragState.payload = payload;
                dragState.sourceId = id;
                dragState.isDragging = true;
                
                el.style.position = 'fixed';
                el.style.left = `${rect.left}px`;
                el.style.top = `${rect.top}px`;
                el.style.width = `${rect.width}px`;
                el.style.height = `${rect.height}px`;
                el.style.zIndex = '9999';
                el.style.pointerEvents = 'none';

                dragStartPos.current = null;

                const clearAllBorders = () => {
                    document.querySelectorAll('.drag-drop-zone').forEach((zone: HTMLElement) => {
                        zone.style.border = originalStyles.border;
                        zone.style.backgroundColor = originalStyles.backgroundColor;
                    });
                };

                const dragMove = (dragEvent: PointerEvent) => {
                    if (!dragState.isDragging) return;

                    el.style.left = `${dragEvent.clientX - offsetX}px`;
                    el.style.top = `${dragEvent.clientY - offsetY}px`;

                    // Clear all borders first
                    clearAllBorders();

                    // Find hovered zone and add small border
                    const el2 = document.elementFromPoint(dragEvent.clientX, dragEvent.clientY);
                    const zone = el2.closest('.drag-drop-zone') as HTMLElement | null;
                    if (zone && (zone.dataset.dropId !== String(id))) {
                        zone.style.border = '1px solid #007bff';
                        zone.style.backgroundColor = 'rgba(141,141,141,0.097)';
                    }
                    // document.querySelectorAll('.drag-drop-zone').forEach((zone: HTMLElement) => {
                    //     if (zone.dataset.dropId !== String(id)) {
                    //         const zoneRect = zone.getBoundingClientRect();
                    //         if (
                    //             dragEvent.clientX >= zoneRect.left &&
                    //             dragEvent.clientX <= zoneRect.right &&
                    //             dragEvent.clientY >= zoneRect.top &&
                    //             dragEvent.clientY <= zoneRect.bottom
                    //         ) {

                    //         }
                    //     }
                    // });
                };

                const handlePointerUp = (upEvent: PointerEvent) => {
                    clearAllBorders();

                    if (!dragState.isDragging) return;

                    // Check drop on hovered zone


                    const el2 = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                    const zone = el2?.closest('.drag-drop-zone') as HTMLElement | null;

                    if (zone && zone.dataset.dropId !== String(id)) {
                        dragState.payload._$event = upEvent //importent for viewport placement 
                        zone.dispatchEvent(
                            new CustomEvent('data', {
                                bubbles: false,
                                detail: dragState.payload
                            })
                        );
                    }


                    //   document.querySelectorAll('.drag-drop-zone').forEach((zone: HTMLElement) => {
                    //     if (zone.dataset.dropId !== String(id)) {
                    //       const zoneRect = zone.getBoundingClientRect();
                    //       if (
                    //         upEvent.clientX >= zoneRect.left &&
                    //         upEvent.clientX <= zoneRect.right &&
                    //         upEvent.clientY >= zoneRect.top &&
                    //         upEvent.clientY <= zoneRect.bottom
                    //       ) {
                    //             zone.dispatchEvent(new CustomEvent('data', { detail:dragState.payload})); // haha thats calling every parents
                    //       }
                    //     }
                    //   });

                    Object.entries(originalStyles).forEach(([key, value]) => {
                        (el.style as any)[key] = value || '';
                    });

                    dragState.isDragging = false;
                    dragState.payload = null;
                    dragState.sourceId = null;

                    window.removeEventListener('pointermove', dragMove);
                    window.removeEventListener('pointerup', handlePointerUp);
                    window.removeEventListener('pointercancel', handlePointerUp);
                };

                window.removeEventListener('pointermove', handlePointerMove);
                window.addEventListener('pointermove', dragMove, { passive: false });
                window.addEventListener('pointerup', handlePointerUp, { passive: false });
                window.addEventListener('pointercancel', handlePointerUp, { passive: false });
            }
        };

        const handlePointerUpEarly = () => {
            if (dragStartPos.current) {
                dragStartPos.current = null;
            }
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUpEarly);
            window.removeEventListener('pointercancel', handlePointerUpEarly);
        };

        window.addEventListener('pointermove', handlePointerMove, { passive: false });
        window.addEventListener('pointerup', handlePointerUpEarly, { passive: false });
        window.addEventListener('pointercancel', handlePointerUpEarly, { passive: false });
    }, [id, payload, onDrop]);

    return (
        <div
            ref={ref}
            onPointerDown={handlePointerDown}
            data-drop-id={id}
            className={"drag-drop-zone "+className}
            style={highlight?{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                cursor: dragState.isDragging ? 'grabbing' : payload ? 'grab' : 'default',
                touchAction: 'none',
                border:'1px solid transparent', // Base for smooth transition
                //backgroundColor: 'transparent'
            }:{}}
        >
            {children}
        </div>
    );
}













// import React, { useRef, useCallback } from 'react';
// import { dragState } from './dragState';

// export function DragAndDropZone({
//   id,
//   payload,
//   onDrop,
//   children,
// }: {
//   id?: string | number;
//   payload?: any;
//   onDrop?: (payload: any) => void;
//   children: React.ReactNode;
// }) {
//   const ref = useRef<HTMLDivElement>(null);
//   const dragStartPos = useRef<{ x: number; y: number } | null>(null);

//   const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
//     if (!payload || dragState.isDragging || !ref.current) {
//       e.preventDefault();
//       return;
//     }

//     e.preventDefault();

//     const el = ref.current;
//     const rect = el.getBoundingClientRect();

//     // Store drag start position for threshold check
//     dragStartPos.current = { x: e.clientX, y: e.clientY };

//     const handlePointerMove = (moveEvent: PointerEvent) => {
//       if (!dragStartPos.current || dragState.isDragging) return;

//       // 10px threshold - only drag after moving enough
//       const dx = Math.abs(moveEvent.clientX - dragStartPos.current.x);
//       const dy = Math.abs(moveEvent.clientY - dragStartPos.current.y);

//       if (dx > 10 || dy > 10) {
//         // Threshold reached - start dragging
//         const offsetX = moveEvent.clientX - rect.left;
//         const offsetY = moveEvent.clientY - rect.top;

//         // Store original styles
//         const originalStyles: Partial<CSSStyleDeclaration> = {
//           position: el.style.position,
//           left: el.style.left,
//           top: el.style.top,
//           width: el.style.width,
//           height: el.style.height,
//           transform: el.style.transform,
//           zIndex: el.style.zIndex,
//           pointerEvents: el.style.pointerEvents,
//         };

//         // Set up drag state
//         dragState.payload = payload;
//         dragState.sourceId = id;
//         dragState.isDragging = true;

//         // Switch to fixed positioning
//         el.style.position = 'fixed';
//         el.style.left = `${rect.left}px`;
//         el.style.top = `${rect.top}px`;
//         el.style.width = `${rect.width}px`;
//         el.style.height = `${rect.height}px`;
//         el.style.zIndex = '9999';
//         el.style.pointerEvents = 'none';

//         dragStartPos.current = null;

//         // Replace move handler with actual drag
//         const dragMove = (dragEvent: PointerEvent) => {
//           if (!dragState.isDragging) return;
//           el.style.left = `${dragEvent.clientX - offsetX}px`;
//           el.style.top = `${dragEvent.clientY - offsetY}px`;
//         };

//         const handlePointerUp = (upEvent: PointerEvent) => {
//           if (!dragState.isDragging) return;

//           // Handle drop
//           if (onDrop && dragState.payload && dragState.sourceId !== id) {
//             onDrop(dragState.payload);
//           }

//           // Restore original styles
//           Object.entries(originalStyles).forEach(([key, value]) => {
//             (el.style as any)[key] = value || '';
//           });

//           // Reset drag state
//           dragState.isDragging = false;
//           dragState.payload = null;
//           dragState.sourceId = null;

//           // Cleanup
//           window.removeEventListener('pointermove', dragMove);
//           window.removeEventListener('pointerup', handlePointerUp);
//           window.removeEventListener('pointercancel', handlePointerUp);
//         };

//         window.removeEventListener('pointermove', handlePointerMove);
//         window.addEventListener('pointermove', dragMove, { passive: false });
//         window.addEventListener('pointerup', handlePointerUp, { passive: false });
//         window.addEventListener('pointercancel', handlePointerUp, { passive: false });
//       }
//     };

//     const handlePointerUpEarly = () => {
//       // Cancel if threshold not reached
//       if (dragStartPos.current) {
//         dragStartPos.current = null;
//       }
//       window.removeEventListener('pointermove', handlePointerMove);
//       window.removeEventListener('pointerup', handlePointerUpEarly);
//       window.removeEventListener('pointercancel', handlePointerUpEarly);
//     };

//     // Add initial listeners
//     window.addEventListener('pointermove', handlePointerMove, { passive: false });
//     window.addEventListener('pointerup', handlePointerUpEarly, { passive: false });
//     window.addEventListener('pointercancel', handlePointerUpEarly, { passive: false });
//   }, [id, payload, onDrop]);

//   return (
//     <div 
//       ref={ref}
//       onPointerDown={handlePointerDown}
//       style={{ 
//         userSelect: 'none',
//         WebkitUserSelect: 'none',
//         cursor: dragState.isDragging ? 'grabbing' : payload ? 'grab' : 'default',
//         touchAction: 'none'
//       }}
//     >
//       {children}
//     </div>
//   );
// }
