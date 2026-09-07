import { DEFINITION } from '@/Core/DEFINITION';


export type ScriptConstructor = new (context: any, ...args: any[]) => any;

interface ScriptModule {
    default: ScriptConstructor;
}

export class ScriptLoader {
    private lazyScripts: Record<string, () => Promise<ScriptModule>> = {};
    private eagerScripts: Record<string, ScriptConstructor> = {};
    private cache: Record<string, ScriptConstructor> = {};
    public globalInstances: any[] = [];
    
    constructor() {
        // --------------------------
        // Lazy scripts (everything except plugins/systems)
        // --------------------------


        this.lazyScripts = (import.meta as any).glob([
            "@/Game/**/*.{ts,js}",
            "!@/Game/**/*.system.{ts,js}",
            "!@/Game/**/*.plugin.{ts,js}"
        ], {
            eager: false
        });

        // --------------------------
        // Eager scripts: plugins/systems
        // --------------------------
        const eagerModules = (import.meta as any).glob(['@/**/*.{plugin,system}.{ts,js}', '!@/Editor/**/*.{plugin,system}.{ts,js}'], {
            eager: true
        });

        for (const path in eagerModules) {
            const mod = eagerModules[path] as ScriptModule;
            this.eagerScripts[path] = mod.default;
            this.cache[path] = mod.default;
        }
    }

    // Resolve url to matching lazyScripts key
    public resolveScriptKey(url: string): string {
        if (!url) return url;
        if (this.lazyScripts[url]) return url;

        const clean = url.replace(/\\/g, '/');
        const gameIdx = clean.indexOf('/Game/');
        if (gameIdx !== -1) {
            const rel = clean.slice(gameIdx); // "/Game/..."
            if (this.lazyScripts[rel]) return rel;
            if (this.lazyScripts['@' + rel]) return '@' + rel;
        }

        if (clean.startsWith('/')) {
            const atVer = '@' + clean;
            if (this.lazyScripts[atVer]) return atVer;
        } else if (clean.startsWith('@/')) {
            const slashVer = clean.slice(1);
            if (this.lazyScripts[slashVer]) return slashVer;
        }

        for (const k in this.lazyScripts) {
            if (k.endsWith(url) || url.endsWith(k)) return k;
        }

        return url;
    }

    public invalidateCache(url: string) {
        const key = this.resolveScriptKey(url);
        delete this.cache[key];
        delete this.cache[url];
    }

    // Load script class (lazy or cached) using full URL
    public async getScriptClass(url: string, cache = true): Promise<ScriptConstructor> {
        const resolvedKey = this.resolveScriptKey(url);

        // Already cached? return it
        if (cache) {
            if (this.cache[resolvedKey]) return this.cache[resolvedKey];
            if (this.cache[url]) return this.cache[url];
        }

        const loader = this.lazyScripts[resolvedKey];
        if (!loader) throw new Error(`Script not found: ${url} (resolved: ${resolvedKey})`);

        // Use cache-busting query to ensure browser fetches latest transpiled module
        const importUrl = `${resolvedKey}?t=${Date.now()}&id=${crypto.randomUUID()}`;
        let mod = await import(/* @vite-ignore */ importUrl);
        const ScriptClass = mod.default;

        this.cache[resolvedKey] = ScriptClass;
        this.cache[url] = ScriptClass;
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
        this.globalInstances = sysplugs;
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
