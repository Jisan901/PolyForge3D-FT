import { Instance } from "@/Core/PolyForge";

import { Bus } from "@/Core/Utils/Bus";
import { type MemoLoader } from "@/Core/Loaders/ObjectLoader"
import fs from '@/Core/lib/fs';
import { THREE } from '@/Core/lib/THREE';
import { type AnyThree } from '@/Core/three/ThreeRegistry';
import {Engine} from "@/Core/three/Engine";
import { ThreeHelpers } from '@/Core/three/Helper';
import {BinarySerializer} from "@/Core/Plugins/Three.patch.plugin";

import { FileAPI } from '@/Editor/FileApi';
import { ThreeAPI } from '@/Editor/Three.helper';
import { ViewportToolManager } from '@/Editor/ToolApi';
import { MenuManager } from '@/Editor/MenuApi';
import { AssetBrowserManager } from "@/Editor/AssetBrowser";
import { mutationCall } from "@/Editor/Mutation";

export class Api {
    public file: FileAPI;
    public three: ThreeAPI;
    public toolService: ViewportToolManager;
    public menu: MenuManager;
    public menuService: MenuManager;
    public buses: typeof BusHub = BusHub;
    public binarySerializer = new BinarySerializer();
    constructor(private engine: Engine, private loader: MemoLoader) {
        this.file = new FileAPI();
        this.three = new ThreeAPI(this.buses, this.engine);
        this.toolService =  ViewportToolManager.getInstance();
        this.menu = MenuManager.getInstance();
        this.menuService = this.menu;
    }
    
    
    
    /**
 * addTo
 */
addTo(parent: THREE.Object3D, child: THREE.Object3D) {
    // FIX: traverse=true to register children, their geometries, materials, and textures
    Instance.threeRegistry.register(child, true)
    parent.add(child)
    // FIX: traverse the whole subtree to add helpers for all children, not just root
    child.traverse(e => this.three.helpers.addSpecificHelper(e))
    mutationCall(parent, 'children')
}

/**
 * removeFrom
 */
removeFrom(parent: THREE.Object3D, child: THREE.Object3D) {
    // Unregister first while the tree is still intact
    Instance.threeRegistry.unregisterTree(child)
    this.three.selectObject(null)
    parent.remove(child)
    // FIX: remove helpers for the whole subtree, not just the root node
    child.traverse(e => this.three.helpers.removeHelper(e))
    // freeGPU handles recursive disposal of tex/mat/geo — runs after registry is clean
    ThreeHelpers.freeGPU(child)
    mutationCall(parent, 'children')
}
    
    /**
    * loadObjectFile
    */
    async loadObjectFile(url: string, clone = true) {
        return await this.loader.loadObject(url, clone);
    }
    /**
    * saveObjectFile
    */
    async saveObjectFile(object: AnyThree, path: string) {
        await this.binarySerializer.save(object, path)
    }
    /**
    * saveMatGeoFile
    */
    async saveMatGeoFile(object: AnyThree, path: string) {

        let fileUrl;
        if ((object as any).isMaterial) {
            fileUrl = path + '/' + ((object as any).name || (object as any).type) + '.mat'
        }
        else if ((object as any).isBufferGeometry) {
            fileUrl = path + '/' + ((object as any).name || (object as any).type) + '.geo'
        }
        if (!fileUrl) return
        let json = JSON.stringify(object, null, 2);
        const data = await fs.writeFile(fileUrl, new Blob([json], { type: 'application/json' }));
    }
}




export const BusHub = {
    fsUpdate: new Bus<[]>(),
    sceneUpdate: new Bus<[any]>(),
    selectionUpdate: new Bus<[any]>(),
    mutationBus: new Bus<[{ target: any, path: string }]>(),
    messageBus: new Bus<[any]>(),
    orbitEnabled: new Bus<[any]>(),
    assetPanelDrop: new Bus<[any, MouseEvent]>(),
    viewportDrop: new Bus<[any, MouseEvent]>(),
    hierarchyContextMenu: new Bus<[any]>(),
    toolChange: new Bus<[string]>(),
    menuUpdate: new Bus<[]>(),
    menuOpen: new Bus<[string, any[]]>(),
} as const;



