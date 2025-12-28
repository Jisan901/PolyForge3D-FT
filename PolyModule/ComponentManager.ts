import fs from "@/lib/fs";


interface ComponentRecord {
    id: number;
    nameCode: number;
    data: any;
}

interface TemplateRecord {
    nameCode: number;
    default: any;
}

export class ComponentManager {
    private templates: Map<number, TemplateRecord> = new Map();
    private components: Map<number, ComponentRecord> = new Map();

    private nextId = 0;

    constructor(
        private templatePath: string,   // templates.cti
        private componentPath: string   // components.ci
    ) {}

    // -----------------------------
    // LOADERS
    // -----------------------------

    async loadTemplates() {
        const raw = await fs.readFile(this.templatePath, "utf8");
        const json = JSON.parse(raw);

        for (const key of Object.keys(json)) {
            const tpl = json[key];
            tpl.key = key;
            this.templates.set(tpl.nameCode, tpl);
        }
    }

    async loadComponents() {
        const raw = await fs.readFile(this.componentPath, "utf8");
        const { components } = JSON.parse(raw);

        this.components.clear();
        for (const comp of components) {
            this.components.set(comp.id, comp);
            this.nextId = Math.max(this.nextId, comp.id + 1);
        }
    }

    // -----------------------------
    // CREATE COMPONENT
    // -----------------------------

    createComponent(nameCode: number, overrides: any = {}) {
        const tpl = this.templates.get(nameCode);
        if (!tpl) throw new Error(`Template with nameCode=${nameCode} not found.`);

        const id = this.nextId++;

        const instance: ComponentRecord = {
            id,
            nameCode,
            key:tpl.key,
            data: {
                ...structuredClone(tpl.default),
                ...overrides
            }
        };

        //this.components.set(id, instance);
        return instance;
    }

    // -----------------------------
    // SAVE TO .CI
    // -----------------------------

    async save() {
        // const json = {
        //     components: Array.from(this.components.values())
        // };
        // await fs.writeFile(this.componentPath, JSON.stringify(json, null, 2));
    }

    // -----------------------------
    // ACCESSORS
    // -----------------------------

    get(id: number) {
        return this.components.get(id) || null;
    }

    getAll() {
        return Array.from(this.components.values());
    }
    getAllTemplate() {
        return Array.from(this.templates.values());
    }
}
