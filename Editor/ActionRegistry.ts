export type ActionHandler<P = any, R = any> = (payload?: P) => R;

export class ActionRegistry {
  private global = new Map<string, ActionHandler>()
  private local = new Map<string, ActionHandler>()

  registerGlobal<P = any, R = any>(id: string, handler: ActionHandler<P, R>) {
    this.global.set(id, handler)
  }

  // Components register their local handlers on mount
  registerLocal<P = any, R = any>(id: string, handler: ActionHandler<P, R>) {
    this.local.set(id, handler)
  }

  // Components clean up on unmount
  unregisterLocal(id: string) {
    this.local.delete(id)
  }

  execute<R = any, P = any>(id: string, payload?: P): R {
    const handler = this.local.get(id) ?? this.global.get(id)
    if (!handler) {
      console.warn(`No action registered with ID: ${id}`)
      return undefined as unknown as R
    }
    return handler(payload)
  }

  has(id: string): boolean {
    return this.local.has(id) || this.global.has(id)
  }
}