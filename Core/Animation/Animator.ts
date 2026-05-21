import { THREE } from "@/Core/lib/THREE";

export class Animator {
    public actions: Record<string, THREE.AnimationAction> = {};
    public mixer: THREE.AnimationMixer;
    public activeAction: THREE.AnimationAction | null = null;

    constructor(object: THREE.Object3D) {
        this.mixer = new THREE.AnimationMixer(object);
    }

    play(name: string, duration: number = 0.3): void {
        const action = this.actions[name];
        if (!action) return;
        if(this.activeAction === action) return;
        if (this.activeAction && this.activeAction !== action) {
            action.reset();
            action.crossFadeFrom(this.activeAction, duration, true);
        }

        action.play();
        this.activeAction = action; // ← was missing
    }

    crossFade(nameA: string, nameB: string, duration: number): void {
        const actionA = this.actions[nameA];
        const actionB = this.actions[nameB];
        if (!actionA || !actionB) return;

        actionB.reset();
        actionB.crossFadeFrom(actionA, duration, true);
        actionB.play();
        this.activeAction = actionB;
    }

    clip(name: string, clip: THREE.AnimationClip): void {
        this.actions[name] = this.mixer.clipAction(clip);
    }

    removeAnimation(name: string): void {
        const action = this.actions[name];
        if (action) {
            action.stop();
            this.mixer.uncacheAction(action.getClip());
        }
        delete this.actions[name];
    }

    stop(name?: string): void {
        if (name) {
            this.actions[name]?.stop();
            if (this.activeAction === this.actions[name]) {
                this.activeAction = null;
            }
        } else {
            this.mixer.stopAllAction();
            this.activeAction = null;
        }
    }

    update(delta: number): void {
        this.mixer.update(delta);
    }
}