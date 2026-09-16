import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const WWW = 'www';

function файлыРекурсивно(каталог) {
  return readdirSync(каталог).flatMap((имя) => {
    const путь = join(каталог, имя);
    return statSync(путь).isDirectory() ? файлыРекурсивно(путь) : [путь];
  });
}

const htmlФайлы = файлыРекурсивно(WWW).filter((путь) => путь.endsWith('.html'));
const локальныеПодключения = /(?:src|href)="(\/(?:js|css)\/[^"?]+\.(?:js|css))(\?v=([a-z0-9]+))"/gi;

test.describe('Инфраструктура — структура и версионирование клиентских ассетов', () => {
  test('в корне www нет JavaScript и CSS файлов', async () => {
    const лишниеФайлы = readdirSync(WWW)
      .filter((имя) => /\.(?:js|css)$/i.test(имя));

    expect(лишниеФайлы).toEqual([]);
  });

  test('JavaScript хранится только в www/js, а CSS только в www/css', async () => {
    const нарушения = файлыРекурсивно(WWW)
      .filter((путь) => /\.(?:js|css)$/i.test(путь))
      .filter((путь) => {
        const unixПуть = relative(WWW, путь).split(sep).join('/');
        return !(unixПуть.startsWith('js/') || unixПуть.startsWith('css/'));
      });

    expect(нарушения).toEqual([]);
  });

  test('все HTML-страницы подключают локальные JS и CSS только из каталогов js и css', async () => {
    for (const путь of htmlФайлы) {
      const html = readFileSync(путь, 'utf8');
      expect(html, путь).not.toMatch(/(?:src|href)="\/(?!js\/|css\/)[^"?]+\.(?:js|css)(?:\?[^" ]*)?"/i);
    }
  });

  test('все локальные подключения JS и CSS в HTML имеют cache-busting параметр v', async () => {
    for (const путь of htmlФайлы) {
      const html = readFileSync(путь, 'utf8');
      const подключенияБезВерсии = [...html.matchAll(/(?:src|href)="(\/(?:js|css)\/[^"?]+\.(?:js|css))"/gi)]
        .map((совпадение) => совпадение[1]);

      expect(подключенияБезВерсии, путь).toEqual([]);
    }
  });

  test('один revision-токен используется во всех HTML-страницах', async () => {
    const revisions = new Set();
    let количествоПодключений = 0;

    for (const путь of htmlФайлы) {
      const html = readFileSync(путь, 'utf8');
      for (const совпадение of html.matchAll(локальныеПодключения)) {
        количествоПодключений += 1;
        revisions.add(совпадение[3]);
      }
    }

    expect(количествоПодключений).toBeGreaterThan(0);
    expect([...revisions]).toHaveLength(1);
  });

  test('динамические подключения JS и CSS также используют общий revision-токен', async () => {
    const revisionsИзHtml = new Set();

    for (const путь of htmlФайлы) {
      const html = readFileSync(путь, 'utf8');
      for (const совпадение of html.matchAll(локальныеПодключения)) {
        revisionsИзHtml.add(совпадение[3]);
      }
    }

    expect([...revisionsИзHtml]).toHaveLength(1);
    const [revision] = [...revisionsИзHtml];

    const js = файлыРекурсивно(join(WWW, 'js'))
      .filter((путь) => путь.endsWith('.js'))
      .map((путь) => readFileSync(путь, 'utf8'))
      .join('\n');

    const динамическиеПодключения = [...js.matchAll(/['"](\/(?:js|css)\/[^'"?]+\.(?:js|css))\?v=([a-z0-9]+)['"]/gi)];
    for (const совпадение of динамическиеПодключения) {
      expect(совпадение[2], совпадение[1]).toBe(revision);
    }
  });
});
