import { THREE } from '@/Core/lib/THREE';
import { Components } from '@/Core/Types/Components';
import { Component, type ComponentConstructor } from './Component';
import { Entity, type SerializedEntity } from './Entity';
import { Query } from './Query';

export interface QueryOptions {
    all?: (ComponentConstructor | Components | number)[];
    none?: (ComponentConstructor | Components | number)[];
}

/**
 * Central manager for the Hybrid Entity-Component System (HECS).
 * Manages entity lifecycles, component registration, bitmask allocations,
 * and reactive query buckets.
 */
export class EntityManager {
    private entities = new Map<string, Entity>();
    private queries = new Set<Query>();
    private queryCache = new Map<string, Query>();

    // Type ID assignment (0..63)
    private nextTypeId = 0;
    private ctorToTypeId = new Map<ComponentConstructor, number>();
    private nameCodeToCtor = new Map<number, ComponentConstructor>();
    private ctorToNameCode = new Map<ComponentConstructor, number>();
    private nameToCtor = new Map<string, ComponentConstructor>();

    constructor() {}

    /**
     * Registers a Component class with the ECS, assigning it a bitmask index.
     * Optionally binds it to a legacy numeric Components enum for backward compatibility.
     */
    public registerComponent<T extends Component>(
        ctor: ComponentConstructor<T>,
        nameCode?: number
    ): number {
        if (this.ctorToTypeId.has(ctor)) {
            return this.ctorToTypeId.get(ctor)!;
        }

        const typeId = this.nextTypeId++;
        (ctor as any).typeId = typeId;
        this.ctorToTypeId.set(ctor, typeId);

        const compName = (ctor as any).componentName || ctor.name.replace(/Component$/, '');
        this.nameToCtor.set(compName.toLowerCase(), ctor);

        if (nameCode !== undefined) {
            this.nameCodeToCtor.set(nameCode, ctor);
            this.ctorToNameCode.set(ctor, nameCode);
        }

        return typeId;
    }

    public getCtorByName(name: string): ComponentConstructor | undefined {
        return this.nameToCtor.get(name.toLowerCase());
    }

    public getComponentTypeId(ctor: ComponentConstructor): number {
        let typeId = this.ctorToTypeId.get(ctor);
        if (typeId === undefined) {
            typeId = this.registerComponent(ctor);
        }
        return typeId;
    }

    public getCtorByNameCode(nameCode: number): ComponentConstructor | undefined {
        return this.nameCodeToCtor.get(nameCode);
    }

    public getNameCodeMap(): Map<ComponentConstructor, number> {
        return this.ctorToNameCode;
    }

    /**
     * Resolves a ComponentConstructor from a constructor or a legacy Components enum.
     */
    public resolveCtor(item: ComponentConstructor | Components | number): ComponentConstructor | undefined {
        if (typeof item === 'function') {
            return item as ComponentConstructor;
        }
        return this.nameCodeToCtor.get(item);
    }

    /**
     * Computes a bitmask for an array of components or legacy enum IDs.
     */
    public computeMask(items?: (ComponentConstructor | Components | number)[]): number {
        if (!items || items.length === 0) return 0;
        let mask = 0;
        for (let i = 0; i < items.length; i++) {
            const ctor = this.resolveCtor(items[i]);
            if (ctor) {
                const typeId = this.getComponentTypeId(ctor);
                mask |= (1 << typeId);
            }
        }
        return mask;
    }

    /**
     * Retrieves an existing Entity by Object3D or UUID.
     */
    public getEntity(target: THREE.Object3D | string): Entity | undefined {
        if (!target) return undefined;
        if (typeof target === 'string') {
            return this.entities.get(target);
        }
        if ((target as any).__entity) {
            return (target as any).__entity;
        }
        if ((target.userData as any)?.__entity) {
            const ent = (target.userData as any).__entity;
            delete (target.userData as any).__entity;
            (target as any).__entity = ent;
            return ent;
        }
        return this.entities.get(target.uuid);
    }

    /**
     * Gets or creates an Entity wrapping the given Three.js Object3D.
     * Automatically hydrates any existing components from object.userData.components.
     */
    public getOrCreateEntity(object3d: THREE.Object3D): Entity {
        const existing = this.getEntity(object3d);
        if (existing) return existing;

        const entity = new Entity(object3d, this);
        this.entities.set(object3d.uuid, entity);

        // Hydrate from legacy userData.components if present
        this.hydrateEntityFromUserData(entity);

        return entity;
    }

    /**
     * Hydrates an Entity from object.userData.components or object.userData._ecs (e.g. from loaded .bin scenes).
     */
    public hydrateEntityFromUserData(entity: Entity): void {
        // Priority 1: Rich multi-component _ecs payload
        if (entity.object3d.userData?._ecs?.components) {
            entity.deserialize(entity.object3d.userData._ecs);
            delete (entity.object3d.userData as any).components;
            return;
        }

        // Priority 2: Legacy userData.components migration
        const comps = entity.object3d.userData?.components;
        if (!comps || typeof comps !== 'object') return;

        for (const key of Object.keys(comps)) {
            const compRecord = comps[key];
            const nameCode = compRecord?.nameCode ?? parseInt(key, 10);
            let ctor = this.nameCodeToCtor.get(nameCode);
            if (!ctor && compRecord?.key) {
                ctor = this.getCtorByName(compRecord.key);
            }

            if (ctor) {
                const allowMultiple = (ctor as any).allowMultiple ?? true;
                if (allowMultiple || !entity.hasComponent(ctor)) {
                    entity.addComponent(ctor, compRecord?.data);
                }
            }
        }

        // Auto-convert to modern _ecs format and delete legacy structure
        entity.syncToUserData();
    }

    /**
     * Flushes all active in-memory components to object3d.userData._ecs
     * across all entities (or under the given root tree) prior to saving.
     */
    public syncAll(root?: THREE.Object3D): void {
        const cleanUserData = (obj: any) => {
            if (obj?.userData?.__entity) {
                if (!obj.__entity) obj.__entity = obj.userData.__entity;
                delete obj.userData.__entity;
            }
            if (obj?.userData?.components) {
                delete obj.userData.components;
            }
        };

        if (root) {
            root.traverse((child: any) => {
                cleanUserData(child);
                const entity = this.getEntity(child);
                if (entity) {
                    entity.syncFromUserData();
                    entity.syncToUserData();
                }
            });
            return;
        }

        for (const entity of this.entities.values()) {
            cleanUserData(entity.object3d);
            entity.syncFromUserData();
            entity.syncToUserData();
        }
    }

    /**
     * Traverses a loaded scene graph and hydrates all entities and components
     * from userData.components or userData._ecs.
     */
    public hydrateScene(root: THREE.Object3D): Entity[] {
        const hydrated: Entity[] = [];
        if (!root) return hydrated;

        root.traverse((child: any) => {
            if (!child || !child.isObject3D) return;

            if (child.userData?.__entity) {
                if (!child.__entity) child.__entity = child.userData.__entity;
                delete child.userData.__entity;
            }

            const hasComps = Boolean(
                (child.userData?.components && Object.keys(child.userData.components).length > 0) ||
                child.userData?._ecs ||
                child.userData?.special
            );

            if (hasComps) {
                const entity = this.getOrCreateEntity(child);
                hydrated.push(entity);
            }
        });

        return hydrated;
    }

    /**
     * Serializes all entities registered in the EntityManager.
     */
    public serializeWorld(): { version: number; entities: SerializedEntity[] } {
        const entities: SerializedEntity[] = [];
        for (const entity of this.entities.values()) {
            entities.push(entity.serialize());
        }
        return {
            version: 1,
            entities
        };
    }

    /**
     * Deserializes an entire ECS world, matching entities to objects in the given scene by UUID.
     */
    public deserializeWorld(data: { version: number; entities: SerializedEntity[] }, scene?: THREE.Scene): void {
        if (!data || !Array.isArray(data.entities)) return;

        for (const eData of data.entities) {
            let targetObj: THREE.Object3D | null = null;
            if (scene) {
                targetObj = scene.getObjectByProperty('uuid', eData.id) || null;
            }

            if (targetObj) {
                const entity = this.getOrCreateEntity(targetObj);
                entity.deserialize(eData);
            }
        }
    }

    /**
     * Removes and destroys an Entity.
     */
    public removeEntity(target: THREE.Object3D | string): void {
        const entity = this.getEntity(target);
        if (!entity) return;

        // Remove from all active queries
        for (const query of this.queries) {
            query.removeEntity(entity);
        }

        this.entities.delete(entity.id);
        entity.destroy();
    }

    /**
     * Creates or retrieves a cached Query for a given component configuration.
     */
    public createQuery(options: QueryOptions | (ComponentConstructor | Components | number)[]): Query {
        let all: (ComponentConstructor | Components | number)[] = [];
        let none: (ComponentConstructor | Components | number)[] = [];

        if (Array.isArray(options)) {
            all = options;
        } else {
            all = options.all || [];
            none = options.none || [];
        }

        const allMask = this.computeMask(all);
        const noneMask = this.computeMask(none);
        const cacheKey = `${allMask}:${noneMask}`;

        let query = this.queryCache.get(cacheKey);
        if (query) return query;

        query = new Query(allMask, noneMask);
        this.queries.add(query);
        this.queryCache.set(cacheKey, query);

        // Populate initially with existing matching entities
        for (const entity of this.entities.values()) {
            if (query.matches(entity.mask)) {
                query.onEntityMaskChanged(entity, entity.mask);
            }
        }

        return query;
    }

    /**
     * Notifies all queries that an entity's component mask has changed.
     */
    public notifyEntityMaskChanged(entity: Entity): void {
        for (const query of this.queries) {
            query.onEntityMaskChanged(entity, entity.mask);
        }
    }

    /**
     * Clears all entities and queries (e.g. on scene reload).
     */
    public clear(): void {
        for (const entity of this.entities.values()) {
            entity.destroy();
        }
        this.entities.clear();
        for (const query of this.queries) {
            query.clear();
        }
        this.queries.clear();
        this.queryCache.clear();
    }
}
