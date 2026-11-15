import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const packageJson = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
assert.equal(packageJson.license, 'Apache-2.0');
assert.match(read('LICENSE'), /Apache License\s+Version 2\.0/i);

const prodLicenses = Object.entries(lock.packages)
  .filter(([path, meta]) => path.startsWith('node_modules/') && !meta.dev)
  .map(([path, meta]) => ({ name: path.slice('node_modules/'.length), version: meta.version, license: meta.license }));
const allowed = new Set(['Apache-2.0', 'BSD-3-Clause', 'MIT']);
const invalidLicenses = prodLicenses.filter(dep => !allowed.has(dep.license));
assert.deepEqual(invalidLicenses, [], `Unexpected production dependency licenses: ${JSON.stringify(invalidLicenses)}`);

const publicMux = JSON.parse(read('public/mux-public.json'));
for (const key of Object.keys(publicMux)) assert.doesNotMatch(key, /token|secret|authorization|credential/i, `Sensitive public config key: ${key}`);
assert.match(publicMux.playbackId, /^[A-Za-z0-9_-]+$/);
assert.equal(publicMux.sourceSha256, 'fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1');

const dist = new URL('dist/', root);
const distPath = dist.pathname;
const textExtensions = new Set(['.html', '.js', '.css', '.json', '.vtt', '.svg', '.txt', '.map']);
const sensitive = /MUX_TOKEN_(?:ID|SECRET)|api\.mux\.com\/video\/v1|Authorization\s*:\s*['"]?Basic|process\.env\.MUX_TOKEN|api[_-]?secret\s*=/i;
const textFiles = walk(distPath).filter(path => textExtensions.has(extname(path).toLowerCase()));
for (const path of textFiles) {
  const source = readFileSync(path, 'utf8');
  assert.doesNotMatch(source, sensitive, `Management credential hook leaked to ${relative(distPath, path)}`);
}
const distNames = walk(distPath).map(path => relative(distPath, path).replaceAll('\\', '/'));
assert.equal(distNames.some(path => /(?:^|\/)(?:scripts|tests|submission-report|design)\//.test(path)), false,
  'Production dist leaked internal source/report directories.');
assert.equal(distNames.some(path => /mux-provision/i.test(path)), false, 'Mux management provisioner leaked to production dist.');

const distMux = JSON.parse(readFileSync(join(distPath, 'mux-public.json'), 'utf8'));
assert.deepEqual(distMux, publicMux, 'Built public Mux configuration differs from audited source config.');

const provenance = JSON.parse(read('public/showcase/detour-showcase-v1.json'));
assert.match(provenance.provenance ?? '', /no source footage/i);

const dryRun = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' }))[0];
const packed = dryRun.files.map(file => file.path).sort();
for (const required of ['LICENSE','README.md','package.json','skin/index.js','skin/player.js','skin/place.js','skin/format-time.js','skin/player.css']) {
  assert.ok(packed.includes(required), `Package dry-run missing ${required}`);
}
for (const prefix of ['demo/','integration/','public/','tests/','scripts/','submission-report/','design/']) {
  assert.equal(packed.some(path => path.startsWith(prefix)), false, `Package dry-run leaked ${prefix}`);
}

console.log(JSON.stringify({
  audit: 'passed',
  packageLicense: packageJson.license,
  productionDependencies: prodLicenses,
  distFiles: distNames.length,
  auditedTextFiles: textFiles.length,
  packedFiles: packed.length,
  publicPlaybackId: publicMux.playbackId,
  sourceMediaSha256: publicMux.sourceSha256,
}, null, 2));
