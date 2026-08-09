import { Plugin } from "@/Core/Plugins/Plugin";
import RapierPhysicsPlugin from "@/Core/Plugins/RapierPhysics.plugin";
import PostProcessingPlugin from "@/Core/Plugins/PostProcess.plugin";
import type { PolyForge } from "@/Core/PolyForge";

export type PluginConstructor = new (app: PolyForge) => Plugin;

export const plugins: PluginConstructor[] = [RapierPhysicsPlugin, PostProcessingPlugin];

export const injectPlugins = async (app: PolyForge) => {
    (app as any).plugins = plugins.map(P => new P(app));
    app.pluginData = {};

    await Promise.all(
        ((app as any).plugins as Plugin[]).map(async (plugin) => {
            await plugin.init?.();

            app.pluginData = {
                ...app.pluginData,
                ...(plugin.provided ?? {})
            };
        })
    );
};