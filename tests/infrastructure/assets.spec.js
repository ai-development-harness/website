import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const WWW = 'www';

function listFilesRecursively(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? listFilesRecursively(path) : [path];
  });
}

const htmlFiles = listFilesRecursively(WWW).filter((path) => path.endsWith('.html'));
const localAssetPattern = /(?:src|href)="(\/(?:js|css)\/[^"?]+\.(?:js|css))(\?v=([a-z0-9]+))"/gi;

function collectHtmlRevisions() {
  const revisions = new Set();
  let assetCount = 0;

  for (const path of htmlFiles) {
    const html = readFileSync(path, 'utf8');
    for (const match of html.matchAll(localAssetPattern)) {
      assetCount += 1;
      revisions.add(match[3]);
    }
  }

  return { revisions, assetCount };
}

test.describe('Инфраструктура — структура и версионирование клиентских ассетов', () => {
  test('в корне www нет JavaScript и CSS файлов', async () => {
    const misplacedFiles = readdirSync(WWW)
      .filter((name) => /\.(?:js|css)$/i.test(name));

    expect(misplacedFiles).toEqual([]);
  });

  test('JavaScript хранится только в www/js, а CSS только в www/css', async () => {
    const violations = listFilesRecursively(WWW)
      .filter((path) => /\.(?:js|css)$/i.test(path))
      .filter((path) => {
        const unixPath = relative(WWW, path).split(sep).join('/');
        return !(unixPath.startsWith('js/') || unixPath.startsWith('css/'));
      });

    expect(violations).toEqual([]);
  });

  test('все HTML-страницы подключают локальные JS и CSS только из каталогов js и css', async () => {
    for (const path of htmlFiles) {
      const html = readFileSync(path, 'utf8');
      expect(html, path).not.toMatch(/(?:src|href)="\/(?!js\/|css\/)[^"?]+\.(?:js|css)(?:\?[^" ]*)?"/i);
    }
  });

  test('все локальные подключения JS и CSS в HTML имеют cache-busting параметр v', async () => {
    for (const path of htmlFiles) {
      const html = readFileSync(path, 'utf8');
      const unversionedAssets = [...html.matchAll(/(?:src|href)="(\/(?:js|css)\/[^"?]+\.(?:js|css))"/gi)]
        .map((match) => match[1]);

      expect(unversionedAssets, path).toEqual([]);
    }
  });

  test('один revision-токен используется во всех HTML-страницах', async () => {
    const { revisions, assetCount } = collectHtmlRevisions();

    expect(assetCount).toBeGreaterThan(0);
    expect([...revisions]).toHaveLength(1);
  });

  test('main.js использует тот же revision для динамических подключений', async () => {
    const { revisions } = collectHtmlRevisions();
    expect([...revisions]).toHaveLength(1);
    const [revision] = [...revisions];

    const mainJs = readFileSync(join(WWW, 'js', 'main.js'), 'utf8');
    const revisionMatch = mainJs.match(/const ASSET_REVISION = '([a-z0-9]+)'/i);

    expect(revisionMatch?.[1]).toBe(revision);
    expect(mainJs).toContain('/css/copy.css?v=${ASSET_REVISION}');
    expect(mainJs).toContain('/js/search.js?v=${ASSET_REVISION}');
  });

  test('search.js наследует revision модуля для динамического search.css', async () => {
    const searchJs = readFileSync(join(WWW, 'js', 'search.js'), 'utf8');

    expect(searchJs).toContain("new URL(import.meta.url).searchParams.get('v')");
    expect(searchJs).toContain("versionedAsset('/css/search.css')");
  });
});
