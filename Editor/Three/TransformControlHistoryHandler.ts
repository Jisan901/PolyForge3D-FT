import { THREE } from '@/Core/lib/THREE';
import { TransformControls } from 'three/examples/jsm/Addons.js';
import {type Editor} from "@/Editor/Editor";

export class TransformControlHistoryHandler {
    private startPosition: THREE.Vector3;
    private startRotation: THREE.Euler;
    private startScale: THREE.Vector3;

    constructor(
        private controls: TransformControls,
        private commanderAPI: Editor
    ) {
        this.controls.addEventListener("mouseDown", this.onMouseDown.bind(this));
        this.controls.addEventListener("mouseUp", this.onMouseUp.bind(this));
    }

    private onMouseDown() {
        if (!this.controls.object) return;

        const obj = this.controls.object;

        // Save start transform
        this.startPosition = obj.position.clone();
        this.startRotation = obj.rotation.clone();
        this.startScale = obj.scale.clone();
    }

    private onMouseUp() {
        const obj = this.controls.object;
        if (!obj) return;

        // -------------------------
        // Position change
        // -------------------------
        if (!this.startPosition.equals(obj.position)) {
            const val = obj.position.clone()
            obj.position.copy(this.startPosition)
            this.commanderAPI.setPosition(obj, val);
        }

        // -------------------------
        // Rotation change
        // -------------------------
        if (!this.startRotation.equals(obj.rotation)) {
            const val = obj.rotation.clone();
            obj.rotation.copy(this.startRotation)
            this.commanderAPI.setRotation(obj, val, "gimbal");
        }

        // -------------------------
        // Scale change
        // -------------------------
        if (!this.startScale.equals(obj.scale)) {
            const val = obj.scale.clone();
            obj.scale.copy(this.startScale)
            this.commanderAPI.setScale(obj, val);
        }
    }
}