import { useState, useCallback } from 'react';
import { ObjectSelector, SelectorItem } from '../ObjectSelector';

interface UseObjectSelectorOptions {
  title: string;
  items: SelectorItem[];
  onSelect?: (item: SelectorItem) => void;
  grid?: boolean;
}

export const useObjectSelector = (options: UseObjectSelectorOptions) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const handleSelect = useCallback((item: SelectorItem) => {
    options.onSelect?.(item);
    close();
  }, [options, close]);

  const Selector = isOpen ? (
    <ObjectSelector
      title={options.title}
      items={options.items}
      onSelect={handleSelect}
      onClose={close}
      grid={options.grid}
    />
  ) : null;

  return {
    open,
    close,
    isOpen,
    Selector,
  };
};

// Usage example:
/*
const MyComponent = () => {
  const componentSelector = useObjectSelector({
    title: "Add Component",
    items: AVAILABLE_COMPONENTS,
    onSelect: (item) => {
      onAddComponent?.(item.id);
    },
    grid: false,
  });

  return (
    <div>
      <button onClick={componentSelector.open}>
        Add Component
      </button>
      
      {componentSelector.Selector}
    </div>
  );
};
*/