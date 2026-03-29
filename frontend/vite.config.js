import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

function htmlPartials() {
  const loadTag = /<load\s+src="([^"]+)"\s*\/?>/g;

  function resolvePartial(html, rootDir) {
    return html.replace(loadTag, (_, src) => {
      const relativePath = src.startsWith('/')
        ? src.slice(1)
        : src;
      const filePath = path.resolve(rootDir, relativePath);
      const partial = fs.readFileSync(filePath, 'utf8');
      return resolvePartial(partial, rootDir);
    });
  }

  return {
    name: 'neurobloom-html-partials',
    transformIndexHtml(html, ctx) {
      const rootDir = ctx?.server?.config?.root || process.cwd();
      return resolvePartial(html, rootDir);
    }
  };
}

export default defineConfig({
  plugins: [
    htmlPartials(),
  ],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  }
});
