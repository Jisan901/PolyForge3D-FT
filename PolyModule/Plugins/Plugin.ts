import { PolyForge } from "/PolyForge";
export class Plugin {
    public provided: any = {};

    constructor(public app: typeof PolyForge = PolyForge) {}

    async init() {
        // Called once when plugin is added
    }

    async update(dt: number) {
        // Called every frame
    }

    async hotReload() {
        // Called on HMR
    }

    async onRemove() {
        // Cleanup
    }
}