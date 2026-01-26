import { PolyForge } from "@/Core/PolyForge";
import { BaseScript } from "@/Core/Script/ScriptExecutor";


export class Plugin extends BaseScript {
    public provided: any = {};

    constructor(public app: PolyForge) {super()}

    async init() {
        // Called once when plugin is added
    }
}