import fs from "@/Core/lib/fs";
import { Editor } from "@/Editor/Editor";
import { THREE } from '@/Core/lib/THREE';
import { Baxporter } from '@/Core/Plugins/Binary/Baxporter';
import { mutationCall } from '@/Editor/Mutation';

const exporter = new Baxporter();
export const ACTIONS = Editor.actionRegistry;

export type ActionId =
  | 'add_object'
  | 'select_object'
  | 'delete_object'
  | 'duplicate_object'
  | 'add_component'
  | 'remove_component'
  | 'reimport'
  | 'new_material'
  | 'new_folder';

// ---------------------------------------------------------------------------
// File & Asset Management Actions
// ---------------------------------------------------------------------------

ACTIONS.registerGlobal("reimport", async (path: string) => {
    let filePath = path;
    const data = await fs.readFile(filePath);
    const last = filePath.lastIndexOf('/');

    if (last === -1) filePath = "import.object";
    const file = new File([data], filePath.slice(last + 1));
    Editor.importer.importFile(file, Editor.importer.ctx as any);
});

ACTIONS.registerGlobal("new_material", async () => {
    const mat = new THREE.MeshStandardMaterial();
    const name = prompt('enter material name');
    exporter.export(mat, Editor.assetBrowser.activeDirName, `${name || mat.type}`).then(() => Editor.assetBrowser.reload());
});

ACTIONS.registerGlobal("new_folder", async () => {
    const name = prompt('enter folder name');
    if (!name) return;
    await fs.mkdir(Editor.assetBrowser.activeDirName + '/' + name);
    Editor.assetBrowser.reload();
});

// ---------------------------------------------------------------------------
// Scene & Object Actions
// ---------------------------------------------------------------------------

ACTIONS.registerGlobal("add_object", (payload: { type: any; parentUuid?: string } | any) => {
    const sceneManager = Editor.core.sceneManager;
    const builder = Editor.core.builder;
    const root = sceneManager.activeScene;
    if (!root) return null;

    const type = payload?.type !== undefined ? payload.type : payload;
    const parentUuid = payload?.parentUuid;

    const parent = parentUuid
        ? root.getObjectByProperty("uuid", parentUuid)
        : (sceneManager.isObjectMode && sceneManager.activeObjectRoot ? sceneManager.activeObjectRoot : root);

    if (!parent) return null;

    const obj = builder.create(type);
    Editor.addObject(parent, obj);

    return obj;
});

ACTIONS.registerGlobal("select_object", (payload?: string | THREE.Object3D | { uuid?: string } | null) => {
    const sceneManager = Editor.core.sceneManager;
    const root = sceneManager.activeScene;
    if (!root && !payload) {
        return Editor.api.three.selectObject(null);
    }

    let target: THREE.Object3D | null = null;
    if (typeof payload === "string") {
        target = root?.getObjectByProperty("uuid", payload) || null;
    } else if (payload && typeof payload === "object") {
        if ("isObject3D" in payload && (payload as any).isObject3D) {
            target = payload as THREE.Object3D;
        } else if ("uuid" in payload && (payload as any).uuid) {
            target = root?.getObjectByProperty("uuid", (payload as any).uuid) || null;
        }
    }

    if (Editor.api.three.selectedObject?.uuid !== target?.uuid) {
        return Editor.api.three.selectObject(target);
    }

    return target;
});

ACTIONS.registerGlobal("delete_object", (payload?: string | THREE.Object3D | { uuid?: string } | null) => {
    const sceneManager = Editor.core.sceneManager;
    const root = sceneManager.activeScene;
    if (!root) return;

    let target: THREE.Object3D | null = null;
    if (typeof payload === "string") {
        target = root.getObjectByProperty("uuid", payload) || null;
    } else if (payload && typeof payload === "object") {
        if ("isObject3D" in payload && (payload as any).isObject3D) {
            target = payload as THREE.Object3D;
        } else if ("uuid" in payload && (payload as any).uuid) {
            target = root.getObjectByProperty("uuid", (payload as any).uuid) || null;
        }
    }

    if (!target) {
        target = Editor.api.three.selectedObject;
    }

    if (!target || target === root || target.uuid === root.uuid) return;

    Editor.removeObject(target);
});

ACTIONS.registerGlobal("duplicate_object", (payload?: string | THREE.Object3D | { uuid?: string } | null) => {
    const sceneManager = Editor.core.sceneManager;
    const root = sceneManager.activeScene;
    if (!root) return null;

    let target: THREE.Object3D | null = null;
    if (typeof payload === "string") {
        target = root.getObjectByProperty("uuid", payload) || null;
    } else if (payload && typeof payload === "object") {
        if ("isObject3D" in payload && (payload as any).isObject3D) {
            target = payload as THREE.Object3D;
        } else if ("uuid" in payload && (payload as any).uuid) {
            target = root.getObjectByProperty("uuid", (payload as any).uuid) || null;
        }
    }

    if (!target) {
        target = Editor.api.three.selectedObject;
    }

    if (!target) return null;

    const parent = target.parent || root;
    if (!parent) return null;

    const obj = target.clone();
    Editor.addObject(parent, obj);

    return obj;
});

// ---------------------------------------------------------------------------
// Component Management Actions
// ---------------------------------------------------------------------------

ACTIONS.registerGlobal("add_component", (payload: { id?: number | string; componentId?: number | string; force?: boolean; reset?: boolean } | number | string) => {
    const target = Editor.api.three.selectedObject;
    if (!target) return;

    let rawId: any = payload;
    let force = false;

    if (typeof payload === "object" && payload !== null) {
        rawId = payload.id !== undefined ? payload.id : (payload as any).componentId;
        force = Boolean((payload as any).force || (payload as any).reset);
    }

    const numId = typeof rawId === "number" ? rawId : parseInt(String(rawId), 10);
    const component = Editor.core.componentManager.createComponent(numId);
    if (!component) return;

    target.userData.special = true;

    const entity = Editor.core.entityManager?.getOrCreateEntity(target);
    if (entity) {
        const ctor = Editor.core.entityManager?.getCtorByNameCode(numId);
        if (ctor) {
            if (force) {
                const existing = entity.getComponents(ctor);
                for (const old of existing) {
                    entity.removeComponent(old);
                }
            }
            entity.addComponent(ctor, component.data);
            entity.syncToUserData();
        }
    }

    delete (target.userData as any).components;
    mutationCall(target, 'userData._ecs');
    mutationCall(target, 'userData.special');
    Editor.api.three.selectObject(target);
});

ACTIONS.registerGlobal("remove_component", (payload: string | { key?: string; id?: string }) => {
    const target = Editor.api.three.selectedObject;
    if (!target) return;

    const rawKey = typeof payload === "object" && payload !== null
        ? ((payload as any).id || (payload as any).key)
        : String(payload);

    const entity = Editor.core.entityManager?.getEntity(target);
    if (entity) {
        // Try finding component by instanceId first
        let found = entity.allComponents.find(c => c.id === rawKey);
        if (!found) {
            // Fallback: match by nameCode or type
            const nameCode = parseInt(String(rawKey).split('_')[0], 10);
            if (!isNaN(nameCode)) {
                const ctor = Editor.core.entityManager?.getCtorByNameCode(nameCode);
                if (ctor) {
                    const list = entity.getComponents(ctor);
                    if (list.length > 0) found = list[list.length - 1];
                }
            }
        }
        if (found) {
            entity.removeComponent(found);
            entity.syncToUserData();
        }
    }

    delete (target.userData as any).components;
    if (!entity || entity.allComponents.length === 0) {
        target.userData.special = false;
    }

    mutationCall(target, 'userData._ecs');
    mutationCall(target, 'userData.special');
    Editor.api.three.selectObject(target);
});

export function executeAction<R = any, P = any>(id: ActionId | string, payload?: P): R {
    return ACTIONS.execute<R, P>(id, payload);
}

// Modular Domain Actions & Context Menus
export * from '@/Editor/HierarchyActions';
export * from '@/Editor/AssetBrowserActions';

export default ACTIONS;