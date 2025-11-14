import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { swc, defineRollupSwcOption, minify } from 'rollup-plugin-swc3';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyWasmPlugin() {
  return {
    name: 'copy-wasm-assets',
    async generateBundle(options) {
      const outDir = options.dir || (typeof options.file === 'string' ? path.dirname(options.file) : 'dist');
      const destDir = path.resolve(outDir, 'wasm');
      const tryDirs = [
        path.resolve(__dirname, '../public/wasm'),
        path.resolve(__dirname, '../src/wasm'),
        path.resolve(__dirname, '../wasm'),
      ];
      await fs.mkdir(destDir, { recursive: true });
      let copied = false;
      for (const srcDir of tryDirs) {
        try {
          const files = await fs.readdir(srcDir);
          if (files && files.length) {
            await Promise.all(files.map(async (f) => {
              const from = path.join(srcDir, f);
              const to = path.join(destDir, f);
              await fs.copyFile(from, to);
            }));
            this.warn(`Copied wasm assets from ${srcDir} to: ${destDir}`);
            copied = true;
            break;
          }
        } catch {}
      }
      if (!copied) {
        this.error('Failed to copy wasm assets: no source directory found');
      }
    },
  };
}

export function getPlugins(pkg, options = {}) {
  const { min = false, target } = options;
  const plugins = [
    getSWCPlugin({ target }),
    resolve(),
    commonjs(),
    copyWasmPlugin(),
  ];

  if (min) {
    plugins.push(minify({ sourceMap: true }));
  }

  return plugins;
}

export function getSWCPlugin(
  jscOptions = {},
) {
  const jsc = {
    loose: true,
    externalHelpers: true,
    target: 'ES5',
    ...jscOptions,
  }
  const options = {
    exclude: [],
    jsc,
    sourceMaps: true,
  };

  return swc(
    defineRollupSwcOption(options),
  );
}
