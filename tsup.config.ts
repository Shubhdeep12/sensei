import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'node18',
  external: [
    // Node.js built-ins
    'fs', 'path', 'os', 'crypto', 'stream', 'util', 'buffer', 'process', 'events',
    'child_process', 'worker_threads', 'fs/promises',
    // Tree-sitter modules (MUST be external)
    'tree-sitter', 'tree-sitter-c', 'tree-sitter-c-sharp', 'tree-sitter-cpp',
    'tree-sitter-go', 'tree-sitter-groovy', 'tree-sitter-java', 'tree-sitter-javascript',
    'tree-sitter-kotlin', 'tree-sitter-php', 'tree-sitter-python', 'tree-sitter-ruby',
    'tree-sitter-rust', 'tree-sitter-scala', 'tree-sitter-swift', 'tree-sitter-typescript',
    // Other dependencies
    'typescript', '@babel/parser', 'simple-git', 'markdown-it', 'css-tree',
    'csv-parse', 'fast-xml-parser', 'node-html-parser', 'jsonc-parser',
    'yaml', 'ini', 'chardet', 'ignore', '@iarna/toml',
  ],
  noExternal: [
    // Don't externalize these - bundle them
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '"use strict";',
    };
  },
});
