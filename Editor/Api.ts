import { Bus } from "@/Core/Utils/Bus";
import { type MemoLoader } from "@/Core/Loaders/ObjectLoader"
import fs from '@/Core/lib/fs';
import { type AnyThree } from '@/Core/three/ThreeRegistry';
import {Engine} from "@/Core/three/Engine";
import { THREE } from '@/Core/lib/THREE';


import { FileAPI } from '@/Editor/FileApi';
import { ThreeAPI } from '@/Editor/Three.helper';
import { AssetBrowserManager } from "@/Editor/AssetBrowser";
import { mutationCall } from "@/Editor/Mutation";

export class Api {
    public file: FileAPI;
    public three: ThreeAPI;
    public buses: typeof BusHub = BusHub;
    constructor(private engine: Engine, private loader: MemoLoader) {
        this.file = new FileAPI();
        this.three = new ThreeAPI(this.buses, this.engine);
    }
    
    
    /**
    * addTo
    */
    addTo(parent: THREE.Object3D, child: THREE.Object3D) {
        parent.add(child)
        this.three.helpers.addSpecificHelper(child)
        mutationCall(parent)
    }
    /**
    * removeFrom
    */
    removeFrom(parent: THREE.Object3D, child: THREE.Object3D) {
        this.three.selectObject(null);
        parent.remove(child);
        this.three.helpers.removeHelper(child)
        mutationCall(parent)
    }
    
    
    /**
    * loadObjectFile
    */
    async loadObjectFile(url: string, clone = true) {
        return await this.loader.loadObject(url);
    }
    /**
    * saveObjectFile
    */
    async saveObjectFile(object: AnyThree, path: string) {
        let json = JSON.stringify(object, null, 2);
        let fileUrl = path + '/' + (object.name || object.type) + '.object'
        const data = await fs.writeFile(fileUrl, new Blob([json], { type: 'application/json' }));
    }
    /**
    * saveMatGeoFile
    */
    async saveMatGeoFile(object: AnyThree, path: string) {

        let fileUrl;
        if (object.isMaterial) {
            fileUrl = path + '/' + (object.name || object.type) + '.mat'
        }
        else if (object.isBufferGeometry) {
            fileUrl = path + '/' + (object.name || object.type) + '.geo'
        }
        if (!fileUrl) return
        let json = JSON.stringify(object, null, 2);
        const data = await fs.writeFile(fileUrl, new Blob([json], { type: 'application/json' }));
    }
}




export const BusHub = {
    fsUpdate: new Bus<void>(),
    sceneUpdate: new Bus<any>(),
    selectionUpdate: new Bus<any>(),
    mutationBus: new Bus<{ target: any, path: string }>(),
    messageBus: new Bus<any>(),
    orbitEnabled: new Bus<any>()
} as const;