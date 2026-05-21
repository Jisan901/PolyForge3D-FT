export class ActionRegistry {
  private global = new Map<string, ActionHandler>()
  private local = new Map<string, ActionHandler>()

  registerGlobal(id: string, handler: ActionHandler) {
    this.global.set(id, handler)
  }

  // Components register their local handlers on mount
  registerLocal(id: string, handler: ActionHandler) {
    this.local.set(id, handler)
  }

  // Components clean up on unmount
  unregisterLocal(id: string) {
    this.local.delete(id)
  }

  execute(id: string, payload?: any) {
    const handler = this.local.get(id) ?? this.global.get(id)
    if (!handler) return console.warn(`No action: ${id}`)
    handler(payload)
  }
}