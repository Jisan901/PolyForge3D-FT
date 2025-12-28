import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'
import fsPlugin from 'fs-browser/plugin';

export default defineConfig(({ mode }) => {
    return {
      plugins: [fsPlugin({
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
