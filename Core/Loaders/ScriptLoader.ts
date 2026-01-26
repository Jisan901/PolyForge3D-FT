import { DEFINITION } from '@/Core/DEFINITION';


export type ScriptConstructor = new (context: any, ...args: any[]) => any;

interface ScriptModule {
    default: ScriptConstructor;
}

export class ScriptLoader {
    private lazyScripts: Record<string, () => Promise<ScriptModule>> = {};
    private eagerScripts: Record<string, ScriptConstructor> = {};
    private cache: Record<string, ScriptConstructor> = {};

    constructor() {
        // --------------------------
        // Lazy scripts (everything except plugins/systems)
        // --------------------------


        this.lazyScripts = import.meta.glob([
            "@/Game/**/*.{ts,js}",
            "!@/Game/**/*.system.{ts,js}",
            "!@/Game/**/*.plugin.{ts,js}"
        ], {
            eager: false
        });

        // --------------------------
        // Eager scripts: plugins/systems
        // --------------------------
        const eagerModules = import.meta.glob('@/**/*.{plugin,system}.{ts,js}', {
            eager: true
        });

        for (const path in eagerModules) {
            const mod = eagerModules[path] as ScriptModule;
            this.eagerScripts[path] = mod.default;
            this.cache[path] = mod.default;
        }
    }

    // Load script class (lazy or cached) using full URL
    public async getScriptClass(url: string): Promise<ScriptConstructor> {
        // Already cached? return it
        if (this.cache[url]) return this.cache[url];

        const loader = this.lazyScripts[url];
        if (!loader) throw new Error(`Script not found: ${url}`);

        const mod = await loader();
        const ScriptClass = mod.default;
        this.cache[url] = ScriptClass; // cache after load
        return ScriptClass;
    }

    // Attach scripts to a context (per-object) using URLs
    public async attachScripts(context: any, urls: string[], ...args: any[]) {
        const instances = [];
        for (const url of urls) {
            const ScriptClass = await this.getScriptClass(url);
            const instance = new ScriptClass(context, ...args);
            instances.push(instance);
        }
        return instances;
    }

    // Initialize global systems/plugins
    public async initGlobalSystems(globalContext?: any) {
        const sysplugs = [];
        for (const url in this.eagerScripts) {
            const ScriptClass = this.eagerScripts[url];
            const instance = new ScriptClass(globalContext ?? {});
            if (instance.init) await instance.init();
            sysplugs.push(instance);
        }
        return sysplugs;
    }

    // List all available scripts (URLs)
    public getAvailableScripts(): string[] {
        return [
            ...Object.keys(this.lazyScripts),
            ...Object.keys(this.eagerScripts)
        ];
    }
}
