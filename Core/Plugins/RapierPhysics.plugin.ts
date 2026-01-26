import {Plugin} from "@/Core/Plugins/Plugin"
import type { World, RigidBodyDesc,ColliderDesc,RigidBody } from '@dimforge/rapier3d';

type RAPIER = typeof import("@dimforge/rapier3d/exports");

export default class RapierPhysicsPlugin extends Plugin {
    world: World;
    gravity = { x: 0, y: -9.81, z: 0 };

    async init() {
        const RAPIER = (await import('@dimforge/rapier3d')).default;
        //await RAPIER.init();

        this.world = new RAPIER.World(this.gravity);

        // What this plugin provides to others
        this.app.pluginData.physics = {
            RAPIER,
            world: this.world
        };

        console.log("Rapier Physics Plugin initialized");
    }

    async onUpdate(dt: number) {
        if (!this.world) return;

        // Option A: fixed time step
        this.world.timestep = Math.min(dt, 1/60);
        this.world.step();

        // Option B (deterministic)
        // this.world.stepAsync(); 
    }

    async onDestroy() {
        this.world.free();
    }
}
