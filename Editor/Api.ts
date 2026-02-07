import { Bus } from "@/Core/Utils/Bus";
import { type MemoLoader } from "@/Core/Loaders/ObjectLoader"
import fs from '@/Core/lib/fs';
import { THREE } from '@/Core/lib/THREE';
import { type AnyThree } from '@/Core/three/ThreeRegistry';
import {Engine} from "@/Core/three/Engine";
import { ThreeHelpers } from '@/Core/three/Helper';


import { FileAPI } from '@/Editor/FileApi';
import { ThreeAPI } from '@/Editor/Three.helper';
import { ViewportToolManager } from '@/Editor/ToolApi';
import { AssetBrowserManager } from "@/Editor/AssetBrowser";
import { mutationCall } from "@/Editor/Mutation";

export class Api {
    public file: FileAPI;
    public three: ThreeAPI;
    public toolService: ViewportToolManager;
    public buses: typeof BusHub = BusHub;
    constructor(private engine: Engine, private loader: MemoLoader) {
        this.file = new FileAPI();
        this.three = new ThreeAPI(this.buses, this.engine);
        this.toolService =  ViewportToolManager.getInstance();
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
        ThreeHelpers.freeGPU(child);
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





/**
 * Tool configuration returned by the backend
 */
export interface ToolConfig {
    id: string;
    icon: string; // Lucide icon name
    tooltip: string;
    action?: string; // API method path (e.g., 'three.focusSelected')
    params?: any; // Optional parameters for the action
}

/**
 * Backend API extension for tool management
 * This should be implemented in your Editor API
 */
export interface ToolAPI {
    /**
     * Get contextual tools for a specific object
     * @param object - The selected THREE.Object3D
     * @returns Array of tool configurations
     */
    getToolsForObject(object: THREE.Object3D): ToolConfig[];
}

/**
 * Example implementation for the Editor API
 */
export class ToolService {
    /**
     * Returns tools based on object type
     */
    static getToolsForObject(object: THREE.Object3D): ToolConfig[] {
        if (!object) return [];

        const tools: ToolConfig[] = [];

        // Common tools for all transformable objects
        if (object.isObject3D) {
            tools.push({
                id: 'focus',
                icon: 'Target',
                tooltip: 'Focus Object (F)',
                action: 'three.focusSelected',
            });
        }

        // Type-specific tools
        switch (object.type) {
            case 'PerspectiveCamera':
            case 'OrthographicCamera':
                tools.push(
                    {
                        id: 'preview',
                        icon: 'Eye',
                        tooltip: 'Preview Camera',
                        action: 'toggleCameraPreview',
                        params: { uuid: object.uuid },
                    },
                    {
                        id: 'align_view',
                        icon: 'Video',
                        tooltip: 'Align View to Camera',
                        action: 'three.alignViewToCamera',
                    }
                );
                break;

            case 'DirectionalLight':
            case 'PointLight':
            case 'SpotLight':
            case 'AmbientLight':
                tools.push(
                    {
                        id: 'toggle_light',
                        icon: 'LightbulbOff',
                        tooltip: 'Toggle Light',
                        action: 'three.toggleObjectLight',
                    },
                    {
                        id: 'shadows',
                        icon: 'Sun',
                        tooltip: 'Toggle Shadows',
                        action: 'three.toggleObjectShadows',
                    }
                );
                break;

            case 'Mesh':
            case 'Group':
                tools.push(
                    {
                        id: 'snap_ground',
                        icon: 'ArrowDownToLine',
                        tooltip: 'Snap to Ground',
                        action: 'three.snapToGround',
                    },
                    {
                        id: 'lock_mesh',
                        icon: 'Lock',
                        tooltip: 'Lock Mesh',
                        action: 'three.toggleObjectLock',
                    }
                );
                break;

            case 'Object3D':
                if (object.children.length > 0) {
                    tools.push({
                        id: 'select_children',
                        icon: 'Copy',
                        tooltip: 'Select Children',
                        action: 'three.selectChildren',
                    });
                }
                break;
        }

        // Add custom metadata-based tools
        if (object.userData?.tools) {
            tools.push(...object.userData.tools);
        }

        return tools;
    }
}

/**
 * Icon name mapping for lucide-react
 * Add more icons as needed
 */
export const AVAILABLE_ICONS = [
    'Target',
    'Eye',
    'Video',
    'LightbulbOff',
    'Sun',
    'ArrowDownToLine',
    'Lock',
    'Copy',
    'MousePointer2',
    'Move',
    'Rotate3d',
    'Maximize',
    'Grid3X3',
    'Move3d',
] as const;

export type IconName = typeof AVAILABLE_ICONS[number];