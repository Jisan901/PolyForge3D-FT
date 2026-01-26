export abstract class BaseScript {
  enabled: boolean = true;
  priority?: number;
  
  // Lifecycle methods (all optional)
  onAwake?(): void;
  onStart?(): void;
  onEnable?(): void;
  onDisable?(): void;
  onUpdate?(deltaTime: number): void;
  onLateUpdate?(deltaTime: number): void;
  onFixedUpdate?(fixedDeltaTime: number): void;
  onDestroy?(): void;
  onBeforeRender?(): void;
  onAfterRender?(): void;
}

export class ScriptExecutor {
  private scripts: Map<string, BaseScript> = new Map();
  private scriptOrder: BaseScript[] = [];
  private initialized = false;

  constructor() {}

  /**
   * Add a script instance to the executor
   * @param instance - The script instance
   * @param instanceId - Optional custom ID, defaults to crypto.randomUUID()
   */
  addScript(instance: BaseScript, instanceId?: string): string {
    const id = instanceId ?? crypto.randomUUID();
    
    if (this.scripts.has(id)) {
      console.warn(`Script with ID "${id}" already exists. Replacing...`);
      this.removeScript(id);
    }

    this.scripts.set(id, instance);
    this.scriptOrder.push(instance);
    
    // Sort by priority
    this.scriptOrder.sort((a, b) => {
      const aPriority = a.priority ?? 0;
      const bPriority = b.priority ?? 0;
      return bPriority - aPriority; // Higher priority first
    });

    // If executor already initialized and script is enabled, run initialization lifecycle
    if (this.initialized && instance.enabled) {
      this.invokeLifecycle(instance, 'onAwake');
      this.invokeLifecycle(instance, 'onStart');
      this.invokeLifecycle(instance, 'onEnable');
    }

    return id;
  }

  /**
   * Remove a script by ID
   */
  removeScript(id: string): boolean {
    const script = this.scripts.get(id);
    if (!script) return false;

    // Call lifecycle cleanup
    if (script.enabled) {
      this.invokeLifecycle(script, 'onDisable');
    }
    this.invokeLifecycle(script, 'onDestroy');

    this.scripts.delete(id);
    
    const index = this.scriptOrder.indexOf(script);
    if (index !== -1) {
      this.scriptOrder.splice(index, 1);
    }

    return true;
  }

  /**
   * Get a script instance by ID
   */
  getScript<T extends BaseScript = BaseScript>(id: string): T | undefined {
    return this.scripts.get(id) as T | undefined;
  }

  /**
   * Get all scripts of a specific class type
   */
  getScriptsByType<T extends BaseScript>(type: new (...args: any[]) => T): T[] {
    const results: T[] = [];
    for (const script of this.scripts.values()) {
      if (script instanceof type) {
        results.push(script);
      }
    }
    return results;
  }

  /**
   * Get the first script of a specific class type
   */
  getScriptByType<T extends BaseScript>(type: new (...args: any[]) => T): T | undefined {
    for (const script of this.scripts.values()) {
      if (script instanceof type) {
        return script;
      }
    }
    return undefined;
  }

  /**
   * Get all script IDs
   */
  getScriptIds(): string[] {
    return Array.from(this.scripts.keys());
  }

  /**
   * Enable a script by ID
   */
  enableScript(id: string): void {
    const script = this.scripts.get(id);
    if (!script || script.enabled) return;

    script.enabled = true;
    this.invokeLifecycle(script, 'onEnable');
  }

  /**
   * Disable a script by ID
   */
  disableScript(id: string): void {
    const script = this.scripts.get(id);
    if (!script || !script.enabled) return;

    script.enabled = false;
    this.invokeLifecycle(script, 'onDisable');
  }

  /**
   * Initialize all scripts (onAwake -> onStart -> onEnable)
   */
  init(): void {
    if (this.initialized) {
      console.warn('ScriptExecutor already initialized');
      return;
    }

    // Phase 1: onAwake (all scripts)
    this.invokeLifecycleAll('onAwake');

    // Phase 2: onStart (all scripts)
    this.invokeLifecycleAll('onStart');

    // Phase 3: onEnable (enabled scripts only)
    for (const script of this.scriptOrder) {
      if (script.enabled) {
        this.invokeLifecycle(script, 'onEnable');
      }
    }

    this.initialized = true;
  }

  /**
   * Update all scripts (called every frame)
   */
  update(deltaTime: number): void {
    this.invokeLifecycleAll('onUpdate', deltaTime);
  }

  /**
   * Late update (called after update)
   */
  lateUpdate(deltaTime: number): void {
    this.invokeLifecycleAll('onLateUpdate', deltaTime);
  }

  /**
   * Fixed update (called at fixed intervals)
   */
  fixedUpdate(fixedDeltaTime: number): void {
    this.invokeLifecycleAll('onFixedUpdate', fixedDeltaTime);
  }

  /**
   * Before render callback
   */
  beforeRender(): void {
    this.invokeLifecycleAll('onBeforeRender');
  }

  /**
   * After render callback
   */
  afterRender(): void {
    this.invokeLifecycleAll('onAfterRender');
  }

  /**
   * Destroy all scripts
   */
  destroy(): void {
    // Call onDisable for enabled scripts
    for (const script of this.scriptOrder) {
      if (script.enabled) {
        this.invokeLifecycle(script, 'onDisable');
      }
    }

    // Call onDestroy for all scripts
    this.invokeLifecycleAll('onDestroy');

    this.scripts.clear();
    this.scriptOrder.length = 0;
    this.initialized = false;
  }

  /**
   * Check if a script exists
   */
  hasScript(id: string): boolean {
    return this.scripts.has(id);
  }

  /**
   * Get script count
   */
  getScriptCount(): number {
    return this.scripts.size;
  }

  /**
   * Check if executor is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Invoke a lifecycle method on all enabled scripts
   */
  private invokeLifecycleAll(method: keyof BaseScript, ...args: any[]): void {
    for (const script of this.scriptOrder) {
      // Always call onAwake, onStart, onDestroy regardless of enabled state
      if (script.enabled || method === 'onAwake' || method === 'onStart' || method === 'onDestroy') {
        this.invokeLifecycle(script, method, ...args);
      }
    }
  }

  /**
   * Safely invoke a lifecycle method on a script
   */
  private invokeLifecycle(script: BaseScript, method: keyof BaseScript, ...args: any[]): void {
    try {
      const fn = script[method] as any;
      if (typeof fn === 'function') {
        fn.call(script, ...args);
      }
    } catch (error) {
      console.error(`Error in script.${method}():`, error);
      console.error('Script:', script);
    }
  }
}

// Singleton instance
const scriptExecutor = new ScriptExecutor();
export default scriptExecutor;