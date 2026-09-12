import { mkdirSync, writeFileSync, cpSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const outputDir = resolve(rootDir, '.vercel/output');
const webDist = resolve(rootDir, 'apps/web/dist');

if (!existsSync(webDist)) {
  console.error('apps/web/dist not found. Run "pnpm build" first.');
  process.exit(1);
}

// 1. Reset output directory
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(resolve(outputDir, 'static'), { recursive: true });

// 2. Write Build Output API v3 config
writeFileSync(resolve(outputDir, 'config.json'), JSON.stringify({ version: 3 }, null, 2));

// 3. Copy static assets from apps/web/dist
cpSync(webDist, resolve(outputDir, 'static'), { recursive: true });

// 4. Bundle serverless functions
const functions = [
  { name: 'session', entry: resolve(rootDir, 'apps/web/api/session.ts') },
  { name: 'save', entry: resolve(rootDir, 'apps/web/api/save.ts') },
];

for (const fn of functions) {
  const fnDir = resolve(outputDir, `functions/api/${fn.name}.func`);
  mkdirSync(fnDir, { recursive: true });

  writeFileSync(
    resolve(fnDir, '.vc-config.json'),
    JSON.stringify(
      {
        runtime: 'nodejs24.x',
        handler: 'index.mjs',
        launcherType: 'Nodejs',
        maxDuration: 30,
      },
      null,
      2
    )
  );

  buildSync({
    entryPoints: [fn.entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
    outfile: resolve(fnDir, 'index.mjs'),
  });

  console.info(`Bundled serverless function: api/${fn.name}`);
}

console.info('Vercel Build Output v3 prepared successfully.');
