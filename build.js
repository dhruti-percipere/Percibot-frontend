const esbuild = require('esbuild')

Promise.all([
  esbuild.build({
    entryPoints: ['src/chat-widget.js'],
    bundle: true,
    outfile: 'dist/chat-widget.js',
    format: 'iife',
    platform: 'browser',
    target: ['es2018'],
    minify: false,
  }),
  esbuild.build({
    entryPoints: ['src/builder.js'],
    bundle: true,
    outfile: 'dist/builder.js',
    format: 'iife',
    platform: 'browser',
    target: ['es2018'],
    minify: false,
  }),
]).catch(() => process.exit(1))