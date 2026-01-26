export class Bus<T = any> {
    private listeners: Set<((e: T) => void)>
    constructor() {
        this.listeners = new Set();
    }

    subscribe(fn: ((e: T) => void)) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    emit(v: T) {
        for (const fn of this.listeners) fn(v);
    }
}