// src/Windy.ts
export type Direction = 'horizontal' | 'vertical';
export type ViewType = string;

export interface WindyWindow {
  id: string;
  type: 'window';
  title: string;
  viewType: ViewType;
  isFloating?: boolean;
  floatingBounds?: { x: number, y: number, w: number, h: number };
  isHidden?: boolean;
}

export interface WindySplit {
  id: string;
  type: 'split';
  direction: Direction;
  ratio: number;
  childA: WindyNode;
  childB: WindyNode;
}

export type WindyNode = WindyWindow | WindySplit;

type Listener = () => void;

class WindyManager {
  root: WindyNode | null = null;
  floatingWindows: WindyWindow[] = [];
  maximizedWindowId: string | null = null;
  listeners: Set<Listener> = new Set();
  version = 0;

  constructor() {
    this.root = this.createWindow('Documentation', 'help');
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot = () => this.version;

  clear() {
    this.root = null;
    this.floatingWindows = [];
    this.maximizedWindowId = null;
    this.notify();
  }

  notify() {
    this.version++;
    this.save();
    this.listeners.forEach(l => l());
  }

  save() {
    try {
      const state = {
        root: this.root,
        floatingWindows: this.floatingWindows,
        maximizedWindowId: this.maximizedWindowId,
      };
      localStorage.setItem('windy_state', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save Windy state', e);
    }
  }

  load(): boolean {
    try {
      const stateStr = localStorage.getItem('windy_state');
      if (stateStr) {
        const state = JSON.parse(stateStr);
        if (state.root) {
          this.root = state.root;
          this.floatingWindows = state.floatingWindows || [];
          this.maximizedWindowId = state.maximizedWindowId || null;
          this.notify();
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to load Windy state', e);
    }
    return false;
  }

  createWindow(title: string, viewType: ViewType = 'empty'): WindyWindow {
    return {
      id: Math.random().toString(36).substring(2, 9),
      type: 'window',
      title,
      viewType,
      isFloating: false,
      isHidden: false,
    };
  }

  create(title: string, side: Direction = 'horizontal', resizeAble = true, size = 0.5, parentId?: string, viewType: ViewType = 'empty') {
    const newWin = this.createWindow(title, viewType);
    if (parentId) {
      this.split(parentId, newWin, side, size);
    } else if (this.root) {
      this.split(this.root.id, newWin, side, size);
    } else {
      this.root = newWin;
      this.notify();
    }
    return newWin;
  }

  findNodeAndParent(nodeId: string, current: WindyNode | null = this.root, parent: WindySplit | null = null): { node: WindyNode, parent: WindySplit | null } | null {
    if (!current) return null;
    if (current.id === nodeId) return { node: current, parent };
    
    if (current.type === 'split') {
      const foundA = this.findNodeAndParent(nodeId, current.childA, current);
      if (foundA) return foundA;
      const foundB = this.findNodeAndParent(nodeId, current.childB, current);
      if (foundB) return foundB;
    }
    return null;
  }

  split(targetId: string, newWindow: WindyWindow, direction: Direction = 'horizontal', ratio: number = 0.5) {
    const found = this.findNodeAndParent(targetId);
    if (!found) return;

    const { node, parent } = found;

    const splitNode: WindySplit = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'split',
      direction,
      ratio,
      childA: node,
      childB: newWindow,
    };

    if (!parent) {
      this.root = splitNode;
    } else {
      if (parent.childA.id === node.id) {
        parent.childA = splitNode;
      } else {
        parent.childB = splitNode;
      }
    }
    this.notify();
  }

  close(targetId: string) {
    if (this.maximizedWindowId === targetId) {
      this.maximizedWindowId = null;
    }

    const floatIdx = this.floatingWindows.findIndex(w => w.id === targetId);
    if (floatIdx !== -1) {
      this.floatingWindows.splice(floatIdx, 1);
      this.notify();
      return;
    }

    const found = this.findNodeAndParent(targetId);
    if (!found) return;

    const { node, parent } = found;

    if (!parent) {
      this.root = this.createWindow('Empty View', 'empty');
      this.notify();
      return;
    }

    const sibling = parent.childA.id === node.id ? parent.childB : parent.childA;
    
    const grandParentFound = this.findNodeAndParent(parent.id);
    if (grandParentFound && grandParentFound.parent) {
      const grandParent = grandParentFound.parent;
      if (grandParent.childA.id === parent.id) {
        grandParent.childA = sibling;
      } else {
        grandParent.childB = sibling;
      }
    } else {
      this.root = sibling;
    }
    this.notify();
  }

  float(targetId: string) {
    const found = this.findNodeAndParent(targetId);
    if (!found || found.node.type !== 'window') return;

    if (this.maximizedWindowId === targetId) {
      this.maximizedWindowId = null;
    }

    const win = found.node as WindyWindow;
    this.close(targetId);
    
    win.isFloating = true;
    win.floatingBounds = { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 150, w: 400, h: 300 };
    this.floatingWindows.push(win);
    this.notify();
  }

  snap(targetId: string, targetParentId: string, direction: Direction = 'horizontal') {
    const floatIdx = this.floatingWindows.findIndex(w => w.id === targetId);
    if (floatIdx === -1) return;

    const win = this.floatingWindows[floatIdx];
    this.floatingWindows.splice(floatIdx, 1);
    win.isFloating = false;
    
    this.split(targetParentId, win, direction);
  }

  hide(targetId: string) {
    const found = this.findNodeAndParent(targetId);
    if (found && found.node.type === 'window') {
      (found.node as WindyWindow).isHidden = true;
      this.notify();
    }
  }

  show(targetId: string) {
    const found = this.findNodeAndParent(targetId);
    if (found && found.node.type === 'window') {
      (found.node as WindyWindow).isHidden = false;
      this.notify();
    }
  }

  setRatio(splitId: string, ratio: number) {
    const found = this.findNodeAndParent(splitId);
    if (found && found.node.type === 'split') {
      (found.node as WindySplit).ratio = ratio;
      this.notify();
    }
  }

  setViewType(targetId: string, viewType: ViewType, title?: string) {
    const updateWin = (win: WindyWindow) => {
      win.viewType = viewType;
      if (title) {
        win.title = title;
      }
    };

    const found = this.findNodeAndParent(targetId);
    if (found && found.node.type === 'window') {
      updateWin(found.node as WindyWindow);
      this.notify();
      return;
    }
    
    const floatWin = this.floatingWindows.find(w => w.id === targetId);
    if (floatWin) {
      updateWin(floatWin);
      this.notify();
    }
  }

  maximize(targetId: string) {
    this.maximizedWindowId = targetId;
    this.notify();
  }

  restore() {
    this.maximizedWindowId = null;
    this.notify();
  }
  
  trigger(event: string, payload?: any) {
    console.log(`Windy Event: ${event}`, payload);
    alert(`Event Triggered: ${event}\nPayload: ${JSON.stringify(payload)}`);
  }
}

export const Windy = new WindyManager();
