const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outfile = path.join(__dirname, 'dist/extension.js');

esbuild
  .build({
    entryPoints: [path.join(__dirname, 'src/extension.ts')],
    bundle: true,
    outfile,
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    sourcemap: true,
    minify: false,
  })
  .then(() => {
    const out = fs.readFileSync(outfile, 'utf8');
    if (/tiktoken/i.test(out)) {
      console.error('FATAL: tiktoken leaked into extension bundle');
      process.exit(1);
    }
    console.log('Extension bundled → dist/extension.js');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
