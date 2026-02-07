import { THREE } from '@/Core/lib/THREE';

/**
 * Tool configuration for viewport toolbar
 */
export interface ViewportTool {
    id: string;
    icon: string; // Lucide icon name
    tooltip: string;
    action: string | ((object: THREE.Object3D) => void); // API path or function
    params?: any; // Optional parameters for string actions
}

/**
 * Validation function to determine if tools should be shown
 */
export type ToolValidationFn = (object: THREE.Object3D) => boolean;

/**
 * Registered tool set with validation
 */
interface RegisteredToolSet {
    validationFn: ToolValidationFn;
    getTools: (object: THREE.Object3D)=>ViewportTool[];
    pluginId: string;
}

/**
 * Simple API for plugins to add viewport tools
 */
export class ViewportToolManager {
    private static instance: ViewportToolManager;
    private registeredTools: Map<string, RegisteredToolSet> = new Map();
    private changeListeners: Set<() => void> = new Set();

    private constructor() {}

    static getInstance(): ViewportToolManager {
        if (!ViewportToolManager.instance) {
            ViewportToolManager.instance = new ViewportToolManager();
        }
        return ViewportToolManager.instance;
    }

    /**
     * Get tools for a specific object
     */
    getToolsForObject(object: THREE.Object3D): ViewportTool[] {
        if (!object) return [];

        const tools: ViewportTool[] = [];

        for (const [pluginId, toolSet] of this.registeredTools.entries()) {
            // Check if validation passes
            if (toolSet.validationFn(object)) {
                tools.push(...toolSet.getTools(object));
            }
        }

        return tools;
    }

    /**
     * Register tool set (called by plugins)
     */
    register(validationFn: ToolValidationFn, getTools: ToolValidationFn, pluginId: string): void {
        this.registeredTools.set(pluginId, {
            validationFn,
            getTools,
            pluginId,
        });

        console.log(`[ViewportTools] Registered tools from plugin: ${pluginId}`);
    }

    /**
     * Unregister tools (called when plugin is destroyed)
     */
    unregister(pluginId: string): void {
        if (this.registeredTools.delete(pluginId)) {
            console.log(`[ViewportTools] Unregistered tools from plugin: ${pluginId}`);
        }
    }


    /**
     * Clear all registered tools
     */
    clear(): void {
        this.registeredTools.clear();
    }

    
}

