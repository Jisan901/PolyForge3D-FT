import type { Entity } from './Entity';

export type ComponentConstructor<T extends Component = Component> = new (...args: any[]) => T;

export interface SerializedComponent {
    type: string;
    nameCode?: number;
    id: string;
    enabled: boolean;
    data: any;
}

/**
 * Base Component class for the Hybrid Entity-Component System (HECS).
 * Provides lifecycle management, entity binding, and typed serialization.
 */
export abstract class Component<TData = any> {
    /**
     * Unique identifier for this component type / name.
     */
    public static readonly componentName: string = 'Component';

    /**
     * Unique bit flag assigned by EntityManager for fast bitmask queries.
     */
    public static typeId: number = 0;

    /**
     * Whether multiple components of this type can be attached to a single entity.
     */
    public static readonly allowMultiple: boolean = true;

    /**
     * Unique instance ID.
     */
    public readonly id: string = crypto.randomUUID();

    /**
     * Active state of this component.
     */
    public enabled: boolean = true;

    /**
     * Reference to the parent Entity. Set when attached.
     */
    public entity!: Entity;

    /**
     * Lifecycle hook: called when component is attached to an entity.
     */
    onAttach?(): void;

    /**
     * Lifecycle hook: called when component is detached from an entity.
     */
    onDetach?(): void;

    /**
     * Lifecycle hook: called when component is enabled.
     */
    onEnable?(): void;

    /**
     * Lifecycle hook: called when component is disabled.
     */
    onDisable?(): void;

    /**
     * Lifecycle hook: called when inspector values or script properties are modified.
     */
    onValidate?(): void;

    /**
     * Serializes component state into a plain JSON-compatible object.
     */
    abstract serialize(): TData;

    /**
     * Restores component state from a plain JSON-compatible object.
     */
    abstract deserialize(data: Partial<TData>): void;
}
