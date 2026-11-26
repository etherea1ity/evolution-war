const { buildSync } = require('esbuild');

buildSync({
  absWorkingDir: __dirname,
  entryPoints: ['models.js'],
  outfile: 'assets/models/battle-models.js',
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2022',
  loader: { '.glb': 'binary' },
  nodePaths: (process.env.NODE_PATH || '').split(require('node:path').delimiter).filter(Boolean),
  legalComments: 'eof',
});
