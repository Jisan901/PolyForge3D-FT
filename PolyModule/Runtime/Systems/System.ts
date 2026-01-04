export interface System {
    entities: any[];
    name: string;
    onStart?(): void;
    query:(...types:any[])=> void;
    update(): void;
    onDestroy?(): void;
  }
  
  


export class SystemExecutor {
  private systems: System[] = [];
  
  constructor() {}
  
  /**
   * Add a system to the executor
   */
  addSystem(system: System): void {
    this.systems.push(system);
  }
  
  
  /**
   * Get a system instance by name
   */
  getSystem<T extends System = System>(name: string): T | undefined {
    return this.systems.find(s => s.name === name) as T | undefined;
  }
  
  /**
   * Initialize all systems
   */
  init(): void {
    for (const system of this.systems) {
      if (system.onStart) {
        system.onStart();
      }
    }
  }
  
  /**
   * Update all systems
   */
  update(): void {
    for (const system of this.systems) {
      system.update();
    }
  }
  
  /**
   * Destroy all systems
   */
  destroy(): void {
    for (const system of this.systems) {
      if (system.onDestroy) {
        system.onDestroy();
      }
    }
  }
}