import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fsPlugin from "@jisan901/fs-browser/plugin";
import wasm from "vite-plugin-wasm";
function gameScriptHmr() {
    return {
        name: "game-script-hmr",
        handleHotUpdate({ file, server }: any) {
            const normalized = file.replace(/\\/g, "/");
            // Match script files inside Game/ (excluding systems and plugins)
            if (normalized.includes("/Game/") && /\.(ts|js)$/.test(normalized)) {
                if (normalized.includes(".system.") || normalized.includes(".plugin.")) {
                    return; // Let Vite handle systems/plugins with standard reload
                }
                server.ws.send({
                    type: "custom",
                    event: "poly:script-reload",
                    data: { file: normalized }
                });
                // Return empty array to prevent Vite from doing a full page reload!
                return [];
            }
        }
    };
}

export default defineConfig(({ mode }) => {
    return {
        plugins: [
            wasm(),
            fsPlugin({
                baseDir: "./", // Base directory for file operations
                apiPrefix: "/api/fs" // API route prefix
            }),
            tailwindcss(),
            react(),
            gameScriptHmr()
        ],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, ".")
            }
        },
        server: {
            watch: {
                ignored: [
                    "!**/Game/**/*.ts", // Except .ts files
                    "!**/Game/**/*.tsx", // Except .tsx files
                    "!**/Game/**/*.js", // Except .js files
                    "!**/Game/**/*.jsx",
                    "**/Game/**/*.{object,json}" // Ignore everything in Game
                ]
            }
        }
    };
});
