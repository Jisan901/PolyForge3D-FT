import fs from '@/Core/lib/fs';


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

    private nextId = 0;

    constructor(
        private templatePath: string,   // templates.cti
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


    
    getAllTemplate() {
        return Array.from(this.templates.values());
    }
}
