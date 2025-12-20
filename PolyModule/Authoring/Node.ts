// Authoring layer must NEVER import three.js
// Node creation is an authoring operation.
// Runtime objects are built later.



import { Bus } from './Bus'

export type AuthoringID = string;

export type AuthoringChange =
    | { type: "nodeAdded"; id: AuthoringID }
    | { type: "nodeRemoved"; id: AuthoringID }
    | { type: "transformChanged"; id: AuthoringID }
    | { type: "componentChanged"; id: AuthoringID }
    | { type: "nameChanged"; id: AuthoringID };

export interface AuthoringNodeJSON {
    version: 1;

    id: string;
    name: string;
    type: string;

    parent: string | null;
    children: string[];

    transform: {
        position: [number, number, number];
        rotation: [number, number, number];
        scale: [number, number, number];
    };

    components: {
        type: string;
        data: any;
    }[];

    editorData?: any
}


export interface AuthoringTransform {
    position: [number, number, number];
    rotation: [number, number, number]; // Euler radians
    scale: [number, number, number];
}


export interface AuthoringComponent {
    type: string;
    data: any;
}

function cloneNodeData(
    source: AuthoringNode,
    newId: string
): AuthoringNode {
    return new AuthoringNode({
        id: newId,
        name: source.name + " Copy",
        type: source.type,

        transform: {
            position: [...source.transform.position],
            rotation: [...source.transform.rotation],
            scale: [...source.transform.scale],
        },

        components: source.components.map(c => ({
            type: c.type,
            data: structuredClone(c.data),
        })),

        editorData: source.editorData
            ? { ...source.editorData }
            : {},

        parent: null,
        children: []
    });
}

export class AuthoringNode {
    readonly id: AuthoringID;

    name: string;
    type: string;

    transform: AuthoringTransform;

    parent: AuthoringID | null;
    children: AuthoringID[];

    components: AuthoringComponent[];

    editorData?: any;

    constructor(init?: Partial<AuthoringNode>) {
        this.id = init?.id ?? crypto.randomUUID();

        this.name = init?.name ?? "ObjectNode";
        this.type = init?.type ?? "ObjectNode";

        this.transform = init?.transform ?? {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
        };

        this.parent = init?.parent ?? null;
        this.children = init?.children ?? [];

        this.components = init?.components ?? [];
        this.editorOnly = init?.editorOnly;
    }
    toJSON(): AuthoringNodeJSON {
        return {
            version: 1,

            id: this.id,
            name: this.name,
            type: this.type,

            parent: this.parent,
            children: [...this.children],

            transform: {
                position: [...this.transform.position],
                rotation: [...this.transform.rotation],
                scale: [...this.transform.scale],
            },

            components: this.components.map(c => ({
                type: c.type,
                data: structuredClone(c.data)
            })),

            editorData: this.editorData
                ? { ...this.editorData }
                : {}
        };
    }
    static fromJSON(json: AuthoringNodeJSON): AuthoringNode {
        if (json.version !== 1) {
            throw new Error(`Unsupported AuthoringNode version ${json.version}`);
        }

        return new AuthoringNode({
            id: json.id,
            name: json.name,
            type: json.type,

            parent: json.parent,
            children: [...json.children],

            transform: {
                position: [...json.transform.position],
                rotation: [...json.transform.rotation],
                scale: [...json.transform.scale],
            },

            components: json.components.map(c => ({
                type: c.type,
                data: structuredClone(c.data)
            })),

            editorData: json.editorData
                ? { ...json.editorData }
                : {}
        });
    }
}


export interface CreateNodeOptions {
    type: string;                 // "CUBE", "LIGHT", "CAMERA", etc
    name?: string;
    parentId?: AuthoringID | null;
    transform?: Partial<AuthoringTransform>;
    components?: AuthoringComponent[];
    editorData?: any;
}

export interface AuthoringSceneJSON {
    version: 1;
    rootIds: string[];
    nodes: Record<string, AuthoringNodeJSON>;
}

export class AuthoringScene {
    nodes = new Map<AuthoringID, AuthoringNode>();
    rootIds: AuthoringID[] = [];

    readonly onChange = new Bus<AuthoringChange>();

    addNode(node: AuthoringNode, parentId?: AuthoringID) {
        this.nodes.set(node.id, node);

        if (parentId) {
            const parent = this.nodes.get(parentId);
            parent?.children.push(node.id);
            node.parent = parentId;
        } else {
            this.rootIds.push(node.id);
        }

        this.onChange.emit({ type: "nodeAdded", id: node.id });
    }
    removeNode(id: AuthoringID) {
        this.nodes.delete(id);
        this.onChange.emit({ type: "nodeRemoved", id });
    }
    createNode(options: CreateNodeOptions): AuthoringID {
        const id = crypto.randomUUID();

        const node = new AuthoringNode({
            id,
            name: options.name ?? options.type,
            type: options.type,

            transform: {
                position: options.transform?.position ?? [0, 0, 0],
                rotation: options.transform?.rotation ?? [0, 0, 0],
                scale: options.transform?.scale ?? [1, 1, 1],
            },

            components: options.components
                ? options.components.map(c => ({
                    type: c.type,
                    data: structuredClone(c.data)
                }))
                : [],

            editorData: options.editorData
                ? { ...options.editorData }
                : {},

            parent: null,
            children: []
        });

        // attach to parent or root
        if (options.parentId) {
            const parent = this.nodes.get(options.parentId);
            if (!parent) {
                throw new Error("createNode: parent not found");
            }

            node.parent = options.parentId;
            parent.children.push(id);
        } else {
            this.rootIds.push(id);
        }

        this.nodes.set(id, node);

        // single semantic event
        this.onChange.emit({
            type: "nodeAdded",
            id
        });

        return id;
    }
    cloneSubtree(sourceId: AuthoringID, newParentId?: AuthoringID): AuthoringID {
        const sourceRoot = this.nodes.get(sourceId);
        if (!sourceRoot) {
            throw new Error("cloneSubtree: source node not found");
        }

        // oldId -> newId mapping
        const idMap = new Map<AuthoringID, AuthoringID>();

        // 1️⃣ collect subtree (DFS)
        const stack: AuthoringID[] = [sourceId];
        const ordered: AuthoringID[] = [];

        while (stack.length) {
            const id = stack.pop()!;
            ordered.push(id);

            const node = this.nodes.get(id)!;
            for (const child of node.children) {
                stack.push(child);
            }
        }

        // 2️⃣ create cloned nodes
        for (const oldId of ordered) {
            const newId = crypto.randomUUID();
            idMap.set(oldId, newId);

            const source = this.nodes.get(oldId)!;
            const clone = cloneNodeData(source, newId);

            this.nodes.set(newId, clone);
        }

        // 3️⃣ rebuild hierarchy
        for (const oldId of ordered) {
            const oldNode = this.nodes.get(oldId)!;
            const newNode = this.nodes.get(idMap.get(oldId)!)!;

            // parent
            if (oldNode.parent && idMap.has(oldNode.parent)) {
                newNode.parent = idMap.get(oldNode.parent)!;
            }

            // children
            newNode.children = oldNode.children.map(
                c => idMap.get(c)!
            );
        }

        // 4️⃣ attach cloned root
        const newRootId = idMap.get(sourceId)!;
        const newRoot = this.nodes.get(newRootId)!;

        if (newParentId) {
            const parent = this.nodes.get(newParentId);
            if (!parent) throw new Error("cloneSubtree: parent not found");

            newRoot.parent = newParentId;
            parent.children.push(newRootId);
        } else {
            this.rootIds.push(newRootId);
        }

        // 5️⃣ emit one semantic event
        this.onChange.emit({
            type: "nodeAdded",
            id: newRootId
        });

        return newRootId;
    }
    toJSON(): AuthoringSceneJSON {
        const nodes: Record<string, AuthoringNodeJSON> = {};

        for (const [id, node] of this.nodes) {
            nodes[id] = node.toJSON();
        }

        return {
            version: 1,
            rootIds: [...this.rootIds],
            nodes
        };
    }

    static fromJSON(json: AuthoringSceneJSON): AuthoringScene {
        if (json.version !== 1) {
            throw new Error(`Unsupported scene version ${json.version}`);
        }

        const scene = new AuthoringScene();

        for (const id in json.nodes) {
            const node = AuthoringNode.fromJSON(json.nodes[id]);
            scene.nodes.set(id, node);
        }

        scene.rootIds = [...json.rootIds];
        return scene;
    }
}


export class AuthoringAPI {
    constructor(public scene: AuthoringScene) { }

    setPosition(id: AuthoringID, pos: [number, number, number]) {
        const node = this.scene.getNode(id)!;
        node.transform.position = pos;

        this.scene.onChange.emit({
            type: "transformChanged",
            id
        });
    }

    setRotation(id: AuthoringID, rot: [number, number, number]) {
        const node = this.scene.getNode(id)!;
        node.transform.rotation = rot;

        this.scene.onChange.emit({
            type: "transformChanged",
            id
        });
    }

    setScale(id: AuthoringID, scl: [number, number, number]) {
        this.scene.getNode(id)!.transform.scale = scl;
        this.scene.onChange.emit({
            type: "transformChanged",
            id
        });
    }

    rename(id: AuthoringID, name: string) {
        this.scene.getNode(id)!.name = name;

        this.scene.onChange.emit({
            type: "nameChanged",
            id
        });
    }

    addComponent(id: AuthoringID, comp: AuthoringComponent) {
        this.scene.getNode(id)!.components.push(comp);
        this.scene.onChange.emit({
            type: "componentChanged",
            id
        });
    }

}