/**
 * BasicTools Plugin
 * Provides core viewport tools for all standard Three.js objects
 * 
 * Tools are registered based on object type and include:
 * - Focus (all objects)
 * - Camera tools (preview, align view)
 * - Light tools (toggle, shadows)
 * - Mesh/Group tools (snap to ground, lock)
 * - Object3D tools (select children)
 * - Custom userData tools
 */

import { addViewportToolActions, removeViewportToolActions } from './ViewportToolAPI';
import { THREE } from '@/Core/lib/THREE';
import {Plugin} from "@/Core/Plugins/Plugin"
import {Editor} from "@/Editor/Editor";


export default class BasicToolsPlugin extends Plugin {
    name = 'Basic Tools';
    version = '1.0.0';
    
    private readonly PLUGIN_ID = 'basic-tools';

    /**
     * Initialize plugin and register all viewport tools
     */
    init() {
        console.log('[BasicTools] Initializing...');

        // Register all tools with a single dynamic provider
        Editor.api.toolService.register(
            // Show for all Object3D instances
            (object: THREE.Object3D) => object.isObject3D === true,
            
            // Dynamic tool provider based on object type
            (object: THREE.Object3D) => {
                const tools = [];

                // Common tools for all transformable objects
                if (object.isObject3D) {
                    tools.push({
                        id: 'focus',
                        icon: 'Target',
                        tooltip: 'Focus Object (F)',
                        action: 'editor.api.three.focusSelected',
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
                                action: 'editor.api.three.toggleCameraPreview',
                                params: { uuid: object.uuid },
                            },
                            {
                                id: 'align_view',
                                icon: 'Video',
                                tooltip: 'Align View to Camera',
                                action: 'editor.api.three.alignViewToCamera',
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
                                action: 'editor.api.three.toggleObjectLight',
                            },
                            {
                                id: 'shadows',
                                icon: 'Sun',
                                tooltip: 'Toggle Shadows',
                                action: 'editor.api.three.toggleObjectShadows',
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
                                action: 'editor.api.three.snapToGround',
                            },
                            {
                                id: 'lock_mesh',
                                icon: 'Lock',
                                tooltip: 'Lock Mesh',
                                action: 'editor.api.three.toggleObjectLock',
                            }
                        );
                        break;

                    case 'Object3D':
                        if (object.children.length > 0) {
                            tools.push({
                                id: 'select_children',
                                icon: 'Copy',
                                tooltip: 'Select Children',
                                action: 'editor.api.three.selectChildren',
                            });
                        }
                        break;
                }

                // Add custom metadata-based tools
                if (object.userData?.tools) {
                    tools.push(...object.userData.tools);
                }

                return tools;
            },
            
            this.PLUGIN_ID
        );

        console.log('✅ BasicTools plugin initialized');
    }



    /**
     * Cleanup when plugin is destroyed
     */
    onDestroy() {
        //console.log('[BasicTools] Destroying...');
        //Editor.api.toolService.unregister(this.PLUGIN_ID);
        //console.log('🗑️ BasicTools plugin destroyed');
    }
}
