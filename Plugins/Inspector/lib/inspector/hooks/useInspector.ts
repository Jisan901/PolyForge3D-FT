import { useState, useEffect, useCallback } from 'react';
import { Inspector, globalInspector } from '../Inspector';
import { BusHub } from '@/Editor/Api';
import { mutationCall } from '@/Editor/Mutation';
import { Editor } from '@/Editor/Editor';

function getDeepValue(target: any, path?: string): any {
  if (!target || !path) return undefined;
  const keys = path.split('.');
  let ref = target;
  for (const k of keys) {
    if (ref == null) return undefined;
    ref = ref[k];
  }
  return ref;
}

function setDeepValue(target: any, path: string, value: any): void {
  if (!target || !path) return;
  const keys = path.split('.');
  let ref = target;
  for (let i = 0; i < keys.length - 1; i++) {
    ref = ref[keys[i]];
    if (ref == null) return;
  }
  ref[keys[keys.length - 1]] = value;
}

export function useInspector<T = any>(
  obj?: any,
  prop?: string,
  inspectorInstance: Inspector = globalInspector,
  _delayMs: number = 500
): [T | undefined, (newValue: T) => void] {
  const getVal = useCallback(() => getDeepValue(obj, prop), [obj, prop]);
  const [value, setInternalValue] = useState<T | undefined>(getVal);

  useEffect(() => {
    if (!obj || !prop) return;

    let lastValue = getVal();

    const checkAndUpdate = () => {
      const current = getVal();
      if (current !== lastValue) {
        lastValue = current;
        setInternalValue(current);
      }
    };

    // 1. Instant event-driven update via BusHub mutationBus (0ms latency for user edits & gizmos)
    const unsubBus = BusHub.mutationBus.subscribe(({ target: changedObj, path: changedPath }) => {
      if (
        changedObj === obj ||
        (obj && typeof obj === 'object' && ('position' in obj || 'rotation' in obj) && (changedObj === (obj as any).object || changedObj === (obj as any).target))
      ) {
        if (
          !changedPath ||
          changedPath === prop ||
          prop.startsWith(changedPath + '.') ||
          changedPath.startsWith(prop + '.')
        ) {
          checkAndUpdate();
        }
      }
    });

    // 2. Inspector instance event subscription
    const unsubInspector = inspectorInstance.subscribe((changedObj, changedProp) => {
      if (
        changedObj === obj &&
        (!changedProp || changedProp === prop || prop.startsWith(changedProp + '.'))
      ) {
        checkAndUpdate();
      }
    });

    // 3. Selective Frame Sync (RAF) - ONLY active during live play/animations or active transform dragging
    let frameId: number | null = null;
    const tick = () => {
      const isAnimating = (Editor as any).isEditorPlaying || (Editor as any).api?.three?.helpers?.isDragging;
      if (isAnimating) {
        checkAndUpdate();
      }
      frameId = requestAnimationFrame(tick);
    };

    if ((Editor as any).isEditorPlaying || (Editor as any).api?.three?.helpers?.isDragging) {
      frameId = requestAnimationFrame(tick);
    }

    // Sync initial state
    checkAndUpdate();

    return () => {
      unsubBus();
      unsubInspector();
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [obj, prop, inspectorInstance, getVal]);

  const setValue = useCallback(
    (newValue: T) => {
      if (obj && prop) {
        setDeepValue(obj, prop, newValue);
        inspectorInstance.change(obj, prop, newValue);
        mutationCall(obj, prop);
      }
      setInternalValue(newValue);
    },
    [obj, prop, inspectorInstance]
  );

  return [value, setValue];
}
