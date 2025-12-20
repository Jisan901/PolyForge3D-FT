import * as THREE from 'three';
import {mutate, mutationCall} from "../PolyForge"
// -----------------------------------------
// Base Command
// -----------------------------------------
export abstract class Command {
    abstract execute(): void;
    abstract undo(): void;

    // optional cleanup
    clear?(): void;
}

// -----------------------------------------
// Commander
// -----------------------------------------




export class Commander {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];

    constructor(private maxHistory = 20) {}

    execute(cmd: Command) {
        // Run command
        cmd.execute();

        // Push into undo stack
        this.undoStack.push(cmd);

        // Clear redo stack (new branch)
        this.redoStack = [];

        // Limit history
        if (this.undoStack.length > this.maxHistory) {
            const removed = this.undoStack.shift();
            removed?.clear?.();
        }
    }

    undo() {
        if (this.undoStack.length === 0) return;

        // Pop last executed
        const cmd = this.undoStack.pop()!;
        // Revert it
        cmd.undo();

        // Move to redo stack
        this.redoStack.push(cmd);
    }

    redo() {
        if (this.redoStack.length === 0) return;

        // Pop last undone command
        const cmd = this.redoStack.pop()!;

        // Re-execute it
        cmd.execute();

        // Move back to undo stack
        this.undoStack.push(cmd);
    }

    clear() {
        this.undoStack.forEach(c => c.clear?.());
        this.redoStack.forEach(c => c.clear?.());
        this.undoStack = [];
        this.redoStack = [];
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }

    debug() {
        return {
            undo: this.undoStack.map(c => c.name),
            redo: this.redoStack.map(c => c.name)
        };
    }
}





// Helper function (recursive disposal)
function disposeObject(obj: any) {
    if (obj.geometry?.dispose) obj.geometry.dispose();
    if (obj.material) {
        if (Array.isArray(obj.material)) {
            obj.material.forEach((m: any) => m.dispose?.());
        } else {
            obj.material.dispose?.();
        }
    }
    if (obj.children) {
        obj.children.forEach((child: any) => disposeObject(child));
    }
}

export class AddObjectCommand extends Command {
    constructor(private api :any, private scene: any, private object: any) {
        super();
        this.previousParent = object?.parent
    }

    execute() {
        if (!this.scene || !this.object) return;
        this.api.addTo(this.scene,this.object);
    }

    undo() {
        if (!this.scene || !this.object) return;
        this.api.removeFrom(this.scene,this.object);
        if (this.previousParent) this.previousParent.add(this.object)
    }

    clear() {
        // Only dispose if the object has no parent (not used elsewhere)
        if (this.object && !this.object.parent) {
            disposeObject(this.object);
        }
        this.previousParent = null
        this.scene = null;
        this.object = null;
    }
}
export class RemoveObjectCommand extends Command {
    private parent: any;

    constructor(private api:any, private object: any) {
        super();
        this.parent = object.parent;
    }

    execute() {
        if (this.parent && this.object) this.api.removeFrom(this.parent,this.object);
    }

    undo() {
        if (this.parent && this.object) this.api.addTo(this.parent,this.object);
    }

    clear() {
        // Only dispose if the object is orphaned
        if (this.object && !this.object.parent) {
            disposeObject(this.object);
        }

        this.parent = null;
        this.object = null;
    }
}

export class SetPropertyCommand extends Command {
    private prevValue: any;

    constructor(private obj: any, private path: string, private newValue: any) {
        super();
        this.prevValue = this.get();
    }

    private get() {
        return this.path.split(".").reduce((o, k) => o[k], this.obj);
    }

    private set(value: any) {
        
        mutate(this.obj,this.path,value)
        
    }

    execute() {
        this.set(this.newValue);
    }

    undo() {
        this.set(this.prevValue);
    }

    clear() {
        this.obj = null;
        this.path = null;
        this.newValue = null;
        this.prevValue = null;
    }
}


export class TranslateObjectCommand extends Command {
    private prev: THREE.Vector3;

    constructor(private obj: any, private newVal: { x: number; y: number; z: number }) {
        super();
        this.prev = obj.position.clone();
    }

    execute() {
        this.obj.position.copy(this.newVal)
        mutationCall(this.obj,'position')
    }

    undo() {
        this.obj.position.copy(this.prev);
        mutationCall(this.obj,'position')
    }

    clear() {
        this.obj = null;
        this.newVal = null;
        this.prev = null;
    }
}
export class RotationObjectCommand extends Command {
    private prevRotation: THREE.Euler;

    constructor(
        private obj: any,
        private newRotation: THREE.Euler,
        private mode: "gimbal" | "local" | "world" = "gimbal"
    ) {
        super();
        this.newRotation = new THREE.Euler(newRotation.x, newRotation.y, newRotation.z)
        this.prevRotation = obj.rotation.clone();
    }

    execute() {
        if (!this.obj) return;

        if (this.mode === "gimbal") {
            this.obj.rotation.copy(this.newRotation);
        } else if (this.mode === "local") {
            // Compute delta from current rotation
            const delta = new THREE.Euler(
                this.newRotation.x - this.obj.rotation.x,
                this.newRotation.y - this.obj.rotation.y,
                this.newRotation.z - this.obj.rotation.z
            );
            this.obj.rotateX(delta.x);
            this.obj.rotateY(delta.y);
            this.obj.rotateZ(delta.z);
            console.log(this, delta)
        } else if (this.mode === "world") {
            // Rotate using world axis
            const worldEuler = new THREE.Euler();
            worldEuler.copy(this.newRotation);
            this.obj.setRotationFromEuler(worldEuler);
        }
        mutationCall(this.obj,'rotation')
    }

    undo() {
        if (!this.obj) return;
        this.obj.rotation.copy(this.prevRotation);
        mutationCall(this.obj,'rotation')
    }

    clear() {
        this.obj = null;
        this.prevRotation = null;
        this.newRotation = null;
    }
}
export class ScaleObjectCommand extends Command {
    private prev: THREE.Vector3;

    constructor(private obj: any, private newVal: { x: number; y: number; z: number }) {
        super();
        this.prev = obj.scale.clone();
    }

    execute() {
        this.obj.scale.x = this.newVal.x;
        this.obj.scale.y = this.newVal.y;
        this.obj.scale.z = this.newVal.z;
        mutationCall(this.obj,'scale')
    }

    undo() {
        this.obj.scale.copy(this.prev);
        mutationCall(this.obj,'scale')
    }

    clear() {
        this.obj = null;
        this.newVal = null;
        this.prev = null;
    }
}

export const commands = {
    AddObjectCommand,
    RemoveObjectCommand,
    SetPropertyCommand,
    
    TranslateObjectCommand,
    RotationObjectCommand,
    ScaleObjectCommand
}