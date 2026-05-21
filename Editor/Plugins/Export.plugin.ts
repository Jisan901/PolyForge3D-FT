import { Plugin } from "@/Core/Plugins/Plugin"
import { THREE } from '@/Core/lib/THREE';
import { Editor } from "@/Editor/Editor";

import {
  globalInspector,
} from '@/Plugins/Inspector/lib/inspector';
import Ui from "./Export/Ui";


export default class ExportPlugin extends Plugin {
    name = 'Export plugin';
    version = '1.0.0';
    private readonly PLUGIN_ID = 'export-tools';
    init() {
        const editor = Editor;
        const three = editor.api.three;
        const core = editor.core;
        
        
        globalInspector.setCustomResolverUI(
    'Export',
    (obj) => true, Ui )
        
    }
}
