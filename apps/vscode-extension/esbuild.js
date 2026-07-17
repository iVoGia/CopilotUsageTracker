const esbuild = require('esbuild');
const path = require('path');

esbuild
  .build({
    entryPoints: [path.join(__dirname, 'src/extension.ts')],
    bundle: true,
    outfile: path.join(__dirname, 'dist/extension.js'),
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    sourcemap: true,
    minify: false,
  })
  .then(() => {
    console.log('Extension bundled → dist/extension.js');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
