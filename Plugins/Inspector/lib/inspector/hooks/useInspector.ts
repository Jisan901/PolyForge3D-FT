import { useState, useEffect, useCallback } from 'react';
import { Inspector, globalInspector } from '../Inspector';

export function useInspector<T = any>(
  obj?: any,
  prop?: string,
  inspectorInstance: Inspector = globalInspector,
  delayMs: number = 500
): [T | undefined, (newValue: T) => void] {
  // Initialize state with the current value
  const [value, setInternalValue] = useState<T | undefined>(() => obj && prop ? obj[prop] : undefined);

  useEffect(() => {
    if (!obj || !prop) return;

    let timeoutId: number;
    let lastValue = obj[prop];

    // Poll for changes that might happen outside the inspector (e.g. animations)
    const checkValue = () => {
      if (obj[prop] !== lastValue) {
        lastValue = obj[prop];
        setInternalValue(lastValue);
      }
      timeoutId = window.setTimeout(checkValue, delayMs);
    };
    timeoutId = window.setTimeout(checkValue, delayMs);

    // Update local state if the value changes externally via inspector
    const unsubscribe = inspectorInstance.subscribe((changedObj, changedProp) => {
      if ((changedObj === obj && changedProp === prop) || changedProp === undefined) {
        lastValue = obj[prop];
        setInternalValue(lastValue);
      }
    });

    // Make sure we have the latest value when the effect runs
    setInternalValue(obj[prop]);

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [obj, prop, inspectorInstance, delayMs]);

  const setValue = useCallback((newValue: T) => {
    if (obj && prop) {
      // Update the object and notify the inspector
      inspectorInstance.change(obj, prop, newValue);
    }
    // Update local state immediately for responsiveness
    setInternalValue(newValue);
  }, [obj, prop, inspectorInstance]);

  return [value, setValue];
}
