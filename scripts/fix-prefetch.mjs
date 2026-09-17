import { promises as fs } from 'node:fs';
import path from 'node:path';

const repositoryRoot = process.cwd();
const wwwRoot = path.join(repositoryRoot, 'www');

async function collectHtmlFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtmlFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(entryPath);
  }
  return files;
}

for (const htmlPath of await collectHtmlFiles(wwwRoot)) {
  let source = await fs.readFile(htmlPath, 'utf8');
  // Современная HTML-спецификация не требует и не рекомендует as для prefetch.
  // Оставляем as только у preload, где он нужен для типа и приоритета ресурса.
  source = source.replace(/(<link rel="prefetch" href="[^"]+") as="document">/g, '$1>');
  await fs.writeFile(htmlPath, source);
}

const testPath = path.join(repositoryRoot, 'tests', 'infrastructure', 'preconnect.spec.js');
let testSource = await fs.readFile(testPath, 'utf8');
testSource = testSource.replace(
  "const documentPrefetch = page.locator('link[rel=\"prefetch\"][as=\"document\"]');",
  "const documentPrefetch = page.locator('link[rel=\"prefetch\"]');",
);
await fs.writeFile(testPath, testSource);

await fs.rm(path.join(repositoryRoot, 'scripts', 'fix-prefetch.mjs'));
await fs.rm(path.join(repositoryRoot, '.github', 'workflows', 'fix-prefetch.yml'));
