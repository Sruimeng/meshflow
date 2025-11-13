/* eslint-disable no-undef */
import legacy from '@vitejs/plugin-legacy';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { getSWCPlugin } from './scripts/rollup-config-helper';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default defineConfig(({ mode }) => {
  return {
    base: './',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'demo/index.html'),
          single: resolve(__dirname, 'demo/html/single.html'),
        },
      },
      minify: false, // iOS 9 等低版本加载压缩代码报脚本异常
    },
    server: {
      host: '0.0.0.0',
      port: 8080,
    },
    preview: {
      host: '0.0.0.0',
      port: 8080,
    },
    resolve: {
      alias: {
        '@sruimeng/mesh-flow': resolve(__dirname, 'src/index.ts'),
      },
    },
    plugins: [
      legacy({
        targets: ['iOS >= 9'],
      }),
      getSWCPlugin({
        target: 'ES6',
      }),
      tsconfigPaths(),
    ],
  };
});
