import {Plugin} from "@/Core/Plugins/Plugin";
import {RapierPhysicsPlugin} from "@/Core/Plugins/RapierPhysicsPlugin";
import {PostProcessingPlugin} from "@/Core/Plugins/PostProcess";



export const plugins:Plugin[] = [RapierPhysicsPlugin, PostProcessingPlugin];


export const injectPlugins = async (app) => {
        app.plugins = plugins.map(P => new P(app));
        app.pluginData = {};

        await Promise.all(
            app.plugins.map(async (plugin) => {
                await plugin.init?.();

                app.pluginData = {
                    ...app.pluginData,
                    ...(plugin.provided ?? {})
                };
            })
        );
    }