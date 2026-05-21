export class GUIController {
  private onChangeCallback?: (val: any) => void;

  constructor(
    public name: string,
    public object: any,
    public property: string,
    public options?: any,
    private inspector?: Inspector
  ) {}

  onChange(cb: (val: any) => void) {
    this.onChangeCallback = cb;
    return this;
  }

  setValue(val: any) {
    this.object[this.property] = val;
    if (this.onChangeCallback) {
      this.onChangeCallback(val);
    }
    if (this.inspector) {
      this.inspector.onChange(this.object, this.property);
    }
  }

  getValue() {
    return this.object[this.property];
  }

  refresh() {
    if (this.inspector) {
      this.inspector.onChange(this.object, this.property);
    }
  }
}

export class GUIFolder {
  folders: GUIFolder[] = [];
  controllers: GUIController[] = [];

  constructor(public title: string, private inspector: Inspector) {}

  add(name: string, object: any, property: string, options?: any) {
    const controller = new GUIController(name, object, property, options, this.inspector);
    this.controllers.push(controller);
    this.inspector.notifyStructureChange();
    return controller;
  }

  addFolder(title: string) {
    const folder = new GUIFolder(title, this.inspector);
    this.folders.push(folder);
    this.inspector.notifyStructureChange();
    return folder;
  }
}

export interface CustomResolver {
  title: string;
  test: (obj: any) => boolean;
  component: any;
}

export class Inspector {
  currentObject: any = null;
  serializedObject: Record<string, any> = {};
  folders: GUIFolder[] = [];
  customResolvers: CustomResolver[] = [];
  private listeners = new Set<(obj: any, prop?: string) => void>();
  private inspectListeners = new Set<(obj: any) => void>();
  private structureListeners = new Set<() => void>();
  private pendingNotifications = new Map<any, Set<string | undefined>>();
  private debounceTimer: number | null = null;
  
  // Throttle UI updates to ~2fps (500ms) to save performance
  public debounceMs = 500;

  constructor(initialObject?: any) {
    this.currentObject = initialObject;
  }

  setCustomResolverUI(title: string, test: (obj: any) => boolean, component: any) {
    this.customResolvers.push({ title, test, component });
    this.notifyStructureChange();
  }

  createFolder(title: string) {
    const folder = new GUIFolder(title, this);
    this.folders.push(folder);
    this.notifyStructureChange();
    return folder;
  }

  inspect(obj: any) {
    this.currentObject = obj;
    this.serializedObject = {};
    this.inspectListeners.forEach(l => l(obj));
    this.notifyStructureChange();
  }

  onInspect(listener: (obj: any) => void) {
    this.inspectListeners.add(listener);
    return () => this.inspectListeners.delete(listener);
  }

  addSerializedField(label: string, defaultValue: any) {
    this.serializedObject[label] = defaultValue;
    this.notifyStructureChange();
  }

  onStructureChange(listener: () => void) {
    this.structureListeners.add(listener);
    return () => this.structureListeners.delete(listener);
  }

  notifyStructureChange() {
    this.structureListeners.forEach(l => l());
  }

  change(obj: any, prop: string, value: any) {
    if (obj) {
      obj[prop] = value;
      this.onChange(obj, prop);
    }
  }

  // Notify that an object changed (debounced/throttled)
  onChange(obj: any, prop?: string) {
    if (!this.pendingNotifications.has(obj)) {
      this.pendingNotifications.set(obj, new Set());
    }
    this.pendingNotifications.get(obj)!.add(prop);

    if (this.debounceTimer === null) {
      this.debounceTimer = window.setTimeout(() => {
        this.flush();
      }, this.debounceMs);
    }
  }

  private flush() {
    this.debounceTimer = null;
    const notifications = this.pendingNotifications;
    this.pendingNotifications = new Map();

    this.listeners.forEach(l => {
      notifications.forEach((props, obj) => {
        if (props.has(undefined)) {
          l(obj);
        } else {
          props.forEach(prop => l(obj, prop));
        }
      });
    });
  }

  subscribe(listener: (obj: any, prop?: string) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  forceRefresh() {
    this.listeners.forEach(l => l(this.currentObject));
  }
}

export const globalInspector = new Inspector();
