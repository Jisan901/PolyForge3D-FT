import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'
import fs from 'vite-plugin-fs';

export default defineConfig(({ mode }) => {
    return {
      plugins: [fs(),tailwindcss(),react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
    watch: {
      ignored: ['**/Game/**']
    }
  }
    };
});
