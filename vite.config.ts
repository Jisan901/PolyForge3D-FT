import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'
import fsPlugin from '@jisan901/fs-browser/plugin';
import wasm from "vite-plugin-wasm"
export default defineConfig(({ mode }) => {
    return {
      plugins: [wasm(),fsPlugin({
      baseDir: './',      // Base directory for file operations
      apiPrefix: '/api/fs'    // API route prefix
    }),tailwindcss(),react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
    watch: {
      ignored: [
        '**/Game/**/*',           // Ignore everything in Game
        // '!**/Game/**/*.ts',       // Except .ts files
        // '!**/Game/**/*.tsx',      // Except .tsx files
        // '!**/Game/**/*.js',       // Except .js files
        // '!**/Game/**/*.jsx'
        ]
    }
  }
    };
});
