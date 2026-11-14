import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const source = git('rev-parse', 'HEAD');
const expectedSource = process.env.DHAGO_BUILD_SHA ?? process.env.GITHUB_SHA;
if (expectedSource !== source) throw new Error('Manifest source is not the verified workflow head');
const branch = `dist-${source.slice(0, 12)}`;
const existing = git('ls-remote', '--heads', 'origin', `refs/heads/${branch}`);
const root = 'published-dist';
const list = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? list(path) : [path];
});
const files = list('dist').sort().map(path => ({
  key: relative('dist', path),
  sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
  bytes: statSync(path).size,
}));
for (const key of ['index.html', 'journal.html', 'stress.html']) {
  if (!files.some(file => file.key === key && file.bytes > 0)) throw new Error(`Verified build is missing ${key}`);
}
const manifest = {
  source_sha: source,
  built_by: 'GitHub Actions',
  build_run_id: process.env.DHAGO_BUILD_RUN_ID ?? process.env.GITHUB_RUN_ID,
  build_artifact: 'candidate-evidence',
  file_count: files.length,
  files,
};
const canonical = JSON.stringify(manifest, null, 2) + '\n';
if (existing) {
  git('fetch', '--no-tags', 'origin', `refs/heads/${branch}`);
  const previous = JSON.parse(git('show', 'FETCH_HEAD:release-manifest.json'));
  if (previous.source_sha !== source || JSON.stringify(previous.files) !== JSON.stringify(files)) {
    throw new Error(`Existing ${branch} does not contain the verified build`);
  }
  console.log(`Already staged the exact verified bytes at ${branch}`);
} else {
  cpSync('dist', root, { recursive: true, force: false, errorOnExist: true });
  writeFileSync('release-manifest.json', canonical);
  git('config', 'user.name', 'github-actions[bot]');
  git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
  git('switch', '-c', branch);
  git('add', '-f', root, 'release-manifest.json');
  git('commit', '-m', `build: immutable verified DHAGO dist for ${source}`);
  git('push', 'origin', `HEAD:refs/heads/${branch}`);
  console.log(`Staged ${files.length} verified files at ${branch}`);
}
