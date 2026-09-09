import type { Entity } from './Entity';

/**
 * Reactive Query container for pre-indexed entity sets.
 * Offers O(1) membership check, O(1) swap-and-pop removal,
 * and zero garbage collection during game loop iterations.
 */
export class Query {
    public readonly entities: Entity[] = [];
    private entityIndex = new Map<Entity, number>();

    public readonly onEntityAdded = new Set<(entity: Entity) => void>();
    public readonly onEntityRemoved = new Set<(entity: Entity) => void>();

    constructor(
        public readonly allMask: number,
        public readonly noneMask: number = 0
    ) {}

    /**
     * Checks if a component bitmask satisfies this query's requirements.
     */
    public matches(mask: number): boolean {
        return (mask & this.allMask) === this.allMask && (mask & this.noneMask) === 0;
    }

    /**
     * Called by EntityManager whenever an entity's component mask changes.
     */
    public onEntityMaskChanged(entity: Entity, newMask: number): void {
        const has = this.entityIndex.has(entity);
        const shouldHave = this.matches(newMask);

        if (shouldHave && !has) {
            // Add entity
            this.entityIndex.set(entity, this.entities.length);
            this.entities.push(entity);
            this.onEntityAdded.forEach(cb => {
                try { cb(entity); } catch (e) { console.error(e); }
            });
        } else if (!shouldHave && has) {
            // O(1) swap and pop
            const idx = this.entityIndex.get(entity)!;
            const last = this.entities.pop()!;
            if (idx < this.entities.length) {
                this.entities[idx] = last;
                this.entityIndex.set(last, idx);
            }
            this.entityIndex.delete(entity);
            this.onEntityRemoved.forEach(cb => {
                try { cb(entity); } catch (e) { console.error(e); }
            });
        }
    }

    /**
     * Remove entity directly (e.g. on entity destruction).
     */
    public removeEntity(entity: Entity): void {
        if (!this.entityIndex.has(entity)) return;
        const idx = this.entityIndex.get(entity)!;
        const last = this.entities.pop()!;
        if (idx < this.entities.length) {
            this.entities[idx] = last;
            this.entityIndex.set(last, idx);
        }
        this.entityIndex.delete(entity);
        this.onEntityRemoved.forEach(cb => {
            try { cb(entity); } catch (e) { console.error(e); }
        });
    }

    public clear(): void {
        this.entities.length = 0;
        this.entityIndex.clear();
        this.onEntityAdded.clear();
        this.onEntityRemoved.clear();
    }
}
