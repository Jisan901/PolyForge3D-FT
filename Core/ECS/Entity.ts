import { THREE } from '@/Core/lib/THREE';
import { Component, type ComponentConstructor, type SerializedComponent } from './Component';
import type { EntityManager } from './EntityManager';

export interface SerializedEntity {
    id: string;
    name?: string;
    mask: number;
    components: SerializedComponent[];
}

/**
 * Entity in the Hybrid Entity-Component System (HECS).
 * Wraps a Three.js Object3D, holding components, managing component bitmasks,
 * and synchronizing state to userData for serialization and inspector reactivity.
 */
export class Entity {
    public readonly id: string;
    public mask: number = 0;

    /** Map of component constructors to list of instances (supports allowMultiple) */
    private componentMap = new Map<ComponentConstructor, Component[]>();

    /** All components attached to this entity */
    public readonly allComponents: Component[] = [];

    constructor(
        public readonly object3d: THREE.Object3D,
        private manager: EntityManager
    ) {
        this.id = object3d.uuid;
        // Direct reference on object3d — not in userData to avoid Three.js circular serialization
        (object3d as any).__entity = this;
        if ((object3d.userData as any)?.__entity) {
            delete (object3d.userData as any).__entity;
        }
    }

    /**
     * Adds a component to this entity.
     */
    public addComponent<T extends Component>(ctor: ComponentConstructor<T>, initialData?: any): T {
        const allowMultiple = (ctor as any).allowMultiple ?? true;
        let list = this.componentMap.get(ctor);

        if (!allowMultiple && list && list.length > 0) {
            const existing = list[0] as T;
            if (initialData) existing.deserialize(initialData);
            return existing;
        }

        const comp = new ctor();
        comp.entity = this;

        if (initialData) {
            comp.deserialize(initialData);
        }

        if (!list) {
            list = [];
            this.componentMap.set(ctor, list);
        }
        list.push(comp);
        this.allComponents.push(comp);

        // Update entity bitmask
        const typeId = this.manager.getComponentTypeId(ctor);
        this.mask |= (1 << typeId);

        // Lifecycle trigger
        comp.onAttach?.();
        if (comp.enabled) {
            comp.onEnable?.();
        }

        // Notify EntityManager for reactive query updates
        this.manager.notifyEntityMaskChanged(this);

        // Synchronize with userData for serialization & Inspector
        this.syncToUserData();

        return comp;
    }

    /**
     * Retrieves the first component matching the constructor.
     */
    public getComponent<T extends Component>(ctor: ComponentConstructor<T>): T | undefined {
        const list = this.componentMap.get(ctor);
        return list && list.length > 0 ? (list[0] as T) : undefined;
    }

    /**
     * Retrieves all components matching the constructor (useful for multiple colliders/scripts).
     */
    public getComponents<T extends Component>(ctor: ComponentConstructor<T>): T[] {
        return (this.componentMap.get(ctor) as T[]) || [];
    }

    /**
     * Checks if this entity possesses a component of the given type.
     */
    public hasComponent<T extends Component>(ctor: ComponentConstructor<T>): boolean {
        const list = this.componentMap.get(ctor);
        return Boolean(list && list.length > 0);
    }

    /**
     * Removes a specific component instance from this entity.
     */
    public removeComponent(comp: Component): boolean {
        const ctor = comp.constructor as ComponentConstructor;
        const list = this.componentMap.get(ctor);
        if (!list) return false;

        const idx = list.indexOf(comp);
        if (idx === -1) return false;

        list.splice(idx, 1);

        const allIdx = this.allComponents.indexOf(comp);
        if (allIdx !== -1) {
            this.allComponents.splice(allIdx, 1);
        }

        // Trigger lifecycle hooks
        if (comp.enabled) {
            comp.onDisable?.();
        }
        comp.onDetach?.();

        // If no components of this type remain, clear bitmask bit
        if (list.length === 0) {
            this.componentMap.delete(ctor);
            const typeId = this.manager.getComponentTypeId(ctor);
            this.mask &= ~(1 << typeId);
        }

        this.manager.notifyEntityMaskChanged(this);
        this.syncToUserData();
        return true;
    }

    /**
     * Removes all components of a given type.
     */
    public removeComponents<T extends Component>(ctor: ComponentConstructor<T>): void {
        const list = this.componentMap.get(ctor);
        if (!list) return;

        const copy = [...list];
        for (const comp of copy) {
            this.removeComponent(comp);
        }
    }

    /**
     * Keeps object3d.userData.components up to date for backward-compatible
     * inspection, mutation buses, and .object.bin serialization.
     */
    /**
     * Serializes this entity into a clean, portable data object.
     */
    public serialize(): SerializedEntity {
        const nameCodeMap = this.manager.getNameCodeMap();
        const serializedComponents: SerializedComponent[] = [];

        for (const comp of this.allComponents) {
            const ctor = comp.constructor as ComponentConstructor;
            const nameCode = nameCodeMap.get(ctor);
            serializedComponents.push({
                type: (ctor as any).componentName || ctor.name.replace(/Component$/, ''),
                nameCode,
                id: comp.id,
                enabled: comp.enabled,
                data: typeof comp.serialize === 'function' ? comp.serialize() : {}
            });
        }

        return {
            id: this.id,
            name: this.object3d.name,
            mask: this.mask,
            components: serializedComponents
        };
    }

    /**
     * Deserializes components into this entity.
     */
    public deserialize(data: SerializedEntity): void {
        if (!data || !Array.isArray(data.components)) return;

        for (const cData of data.components) {
            let ctor: ComponentConstructor | undefined;

            if (cData.nameCode !== undefined) {
                ctor = this.manager.getCtorByNameCode(cData.nameCode);
            }
            if (!ctor && cData.type) {
                ctor = this.manager.getCtorByName(cData.type);
            }

            if (ctor) {
                const comp = this.addComponent(ctor, cData.data);
                if (cData.enabled !== undefined) {
                    comp.enabled = cData.enabled;
                }
            }
        }
    }

    /**
     * Synchronizes in-memory component states from object3d.userData._ecs (e.g. after inspector UI edits).
     */
    public syncFromUserData(): void {
        const ecs = this.object3d.userData?._ecs;
        if (!ecs || !Array.isArray(ecs.components)) return;

        for (const cData of ecs.components) {
            let comp = cData.id ? this.allComponents.find(c => c.id === cData.id) : undefined;
            if (!comp && cData.nameCode !== undefined) {
                const ctor = this.manager.getCtorByNameCode(cData.nameCode);
                if (ctor) comp = this.getComponent(ctor);
            }
            if (comp && cData.data) {
                if (typeof comp.deserialize === 'function') {
                    comp.deserialize(cData.data);
                } else {
                    Object.assign(comp, cData.data);
                }
                if (cData.enabled !== undefined) {
                    comp.enabled = cData.enabled;
                }
            }
        }
    }

    /**
     * Synchronizes entity state to object3d.userData._ecs for serialization.
     * Removes the legacy userData.components structure entirely.
     */
    public syncToUserData(): void {
        const serialized = this.serialize();
        this.object3d.userData._ecs = serialized;
        this.object3d.userData.special = this.allComponents.length > 0;

        // Remove old components dictionary structure from userData
        delete (this.object3d.userData as any).components;

        // Ensure circular Entity instance is never retained on userData
        if ((this.object3d.userData as any)?.__entity) {
            delete (this.object3d.userData as any).__entity;
        }
    }

    /**
     * Cleans up all components when entity is destroyed.
     */
    public destroy(): void {
        const components = [...this.allComponents];
        for (const comp of components) {
            try {
                if (comp.enabled) comp.onDisable?.();
                comp.onDetach?.();
            } catch (err) {
                console.error(`[Entity] Error detaching component:`, err);
            }
        }
        this.allComponents.length = 0;
        this.componentMap.clear();
        this.mask = 0;
        delete (this.object3d as any).__entity;
        if ((this.object3d.userData as any)?.__entity) {
            delete (this.object3d.userData as any).__entity;
        }
    }
}
