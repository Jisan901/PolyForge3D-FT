import type { AssetImporter, ImportContext, ImportResult } from './Importers/types'
import {GLTFImporter, JSONImporter} from './Importers';


export class ImportManager {
    private importers: AssetImporter[] = [
        new GLTFImporter(),
        new JSONImporter()
        ];
    public ctx: ImportContext = {
        projectPath: '/Game/files',
        assetRoot: '/Game/files/Assets',
    }
    register(importer: AssetImporter) {
        this.importers.push(importer);
    }

    /** Opens native file dialog */
    async openDialog(ctx?: ImportContext): Promise<ImportResult[]> {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;

        // auto-generate accept list from importers
        input.accept = this.importers
            .flatMap(i => i.extensions)
            .map(ext => `.${ext}`)
            .join(',');

        input.style.display = 'none';
        document.body.appendChild(input);

        return new Promise((resolve, reject) => {
            input.onchange = async () => {
                if (!input.files || input.files.length === 0) {
                    cleanup();
                    resolve([]);
                    return;
                }

                const results: ImportResult[] = [];

                for (const file of Array.from(input.files)) {
                    try {
                        const result = await this.importFile(file, ctx||this.ctx);
                        results.push(result);
                    } catch (e) {
                        console.error('Import failed:', file.name, e);
                    }
                }

                cleanup();
                resolve(results);
            };

            input.click();
        });

        function cleanup() {
            input.remove();
        }
    }

    async importFile(file: File, ctx: ImportContext) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const importer = this.importers.find(i =>
            i.extensions.includes(ext!)
        );

        if (!importer) {
            throw new Error(`No importer for .${ext}`);
        }

        return importer.import(file, ctx);
    }
}