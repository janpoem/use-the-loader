import * as fs from 'node:fs';
import { resolve, join } from 'node:path';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { dts } from 'rollup-plugin-dts';
import { swc } from 'rollup-plugin-swc3';

const outputDir = resolve('./dist');

const rmdir = (dir: string) =>
  fs.existsSync(dir) &&
  fs.statSync(dir).isDirectory() &&
  fs.rmSync(dir, { recursive: true });

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: `${outputDir}/index.cjs`,
        format: 'cjs',
      },
      {
        file: `${outputDir}/index.mjs`,
        format: 'es',
        exports: 'named',
      },
    ],
    plugins: [
      rmdir(outputDir),
      swc({
        include: /\.[mc]?[jt]sx?$/,
        exclude: /node_modules/,
        tsconfig: 'tsconfig.json',
        jsc: {
          target: 'es2020',
        },
        // 'module': {
        //   'type': 'commonjs',
        //   'strict': false,
        //   'strictMode': true,
        //   'lazy': false,
        //   'noInterop': false,
        // },
      }),
      nodeResolve(),
      commonjs({
        extensions: ['.node', '.cjs', '.js', '.mjs'],
      }),
    ],
    external: ['react'],
  },
  {
    input: 'src/index.ts',
    output: [
      {
        file: join(outputDir, 'index.d.ts'),
        format: 'es',
      },
    ],
    plugins: [dts()],
    external: ['react'],
  },
];
