import { defineConfig } from 'vite';
import injectHTML from 'vite-plugin-html-inject';

export default defineConfig({
  plugins: [
    injectHTML(), // Enable HTML partials support
  ],
  server: {
    port: 3000,
    open: true, // Automatically open the browser
  },
  build: {
    outDir: 'dist', // Production build directory
  }
});
