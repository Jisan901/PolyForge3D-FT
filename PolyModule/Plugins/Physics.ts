import {Plugin} from "./Plugin"
import type { World, RigidBodyDesc,ColliderDesc,RigidBody } from '@dimforge/rapier3d';

type RAPIER = typeof import("@dimforge/rapier3d/exports");

export class RapierPhysicsPlugin extends Plugin {
    world: World;
    gravity = { x: 0, y: -9.81, z: 0 };

    async init() {
        const RAPIER = (await import('@dimforge/rapier3d')).default;
        //await RAPIER.init();

        this.world = new RAPIER.World(this.gravity);

        // What this plugin provides to others
        this.provided.physics = {
            RAPIER,
            world: this.world,
            createRigidBody: (desc: RigidBodyDesc) =>
                this.world.createRigidBody(desc),
            createCollider: (desc: ColliderDesc, body: RigidBody) =>
                this.world.createCollider(desc, body),
        };

        console.log("Rapier Physics Plugin initialized");
    }

    async update(dt: number) {
        if (!this.world) return;

        // Option A: fixed time step
        this.world.timestep = dt;
        this.world.step();

        // Option B (deterministic)
        // this.world.stepAsync(); // if you want async stepping
    }

    async hotReload() {
        console.log("Rapier plugin hot reloaded");
    }

    async onRemove() {
        this.world.free();
        console.log("Rapier plugin removed & resources freed");
    }
}
