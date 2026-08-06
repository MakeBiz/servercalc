import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { SITE } from './site';

/**
 * Раздел публикаций. Никакой админки: чтобы выпустить материал,
 * достаточно положить файл в content/news с фронтматтером
 *
 * ---
 * title: Заголовок
 * date: 2026-08-02
 * rubric: novosti | obzory | ceny
 * description: Одно предложение для выдачи и для превью
 * author: Редакция ServerCalc
 * ---
 */

export const RUBRICS = [
  { slug: 'novosti', name: 'Новости', note: 'Что происходит на рынке и у провайдеров' },
  { slug: 'obzory', name: 'Разборы', note: 'Как выбирать и на что смотреть' },
  { slug: 'ceny', name: 'Изменения цен', note: 'Что подорожало и подешевело в базе' },
];

const DIR = path.join(process.cwd(), 'content', 'news');

marked.setOptions({ mangle: false, headerIds: false });

/**
 * Дата из фронтматтера. YAML разбирает 2026-08-05 в объект Date, и наивное
 * приведение к строке даёт «Wed Aug 05», из которого потом получается 2001 год.
 * Поэтому объект Date приводим к ISO явно
 */
function toIso(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function readAll() {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    // README и файлы с подчёркиванием в начале имени публикацией не считаются:
    // так в папке можно держать инструкцию и черновики
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f.toLowerCase() !== 'readme.md')
    .map((file) => {
      const raw = fs.readFileSync(path.join(DIR, file), 'utf8');
      let data = {};
      let content = raw;
      try {
        const parsed = matter(raw);
        data = parsed.data;
        content = parsed.content;
      } catch (e) {
        // Сломанный фронтматтер не должен ронять сборку всего сайта.
        // Чаще всего причина в двоеточии внутри заголовка: его надо взять в кавычки
        console.warn(`[news] не удалось разобрать фронтматтер в ${file}: ${e.message}`);
        return null;
      }
      const words = content.split(/\s+/).filter(Boolean).length;
      return {
        slug: file.replace(/\.md$/, ''),
        title: data.title || file,
        date: toIso(data.date),
        updated: data.updated ? toIso(data.updated) : null,
        rubric: data.rubric || 'novosti',
        // Материал может быть привязан к провайдеру из каталога: тогда внизу
        // появляется кнопка перехода на его сайт. Поле необязательное,
        // у обзорных материалов провайдера нет
        provider: data.provider || null,
        // Материал может относиться к одной или нескольким задачам из каталога:
        // тогда он появляется на соответствующей странице /vps-dlya/<задача>.
        // Это лечит статьи, на которые больше ниоткуда не ведут ссылки
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        description: data.description || '',
        author: data.author || 'Редакция ServerCalc',
        minutes: Math.max(1, Math.round(words / 160)),
        body: content,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function allPosts() {
  return readAll();
}

export function postsByRubric(rubric) {
  return readAll().filter((p) => p.rubric === rubric);
}

/** Материалы, привязанные к задаче из каталога */
export function postsForTask(slug) {
  return readAll().filter((p) => (p.tasks || []).includes(slug));
}

/**
 * Внешние ссылки в тексте материала: открываем в новой вкладке и закрываем
 * от передачи веса. Источники мы указываем честно, но среди них попадаются
 * конкурирующие каталоги, и отдавать им ссылочный вес незачем.
 * Внутренние ссылки трогать нельзя: они должны открываться в той же вкладке
 */
function markExternalLinks(html) {
  // Свой домен берём из конфига, чтобы при смене адреса ссылка на самих себя
  // не начала считаться внешней. Абсолютных ссылок на себя в статьях нет
  // (используем относительные /novosti/...), но проверка должна пережить переезд
  return html.replace(/<a href="(https?:\/\/[^"]+)"/g, (m, href) =>
    href.includes(SITE.domain)
      ? m
      : `<a href="${href}" target="_blank" rel="nofollow noopener"`
  );
}

export function getPost(slug) {
  const post = readAll().find((p) => p.slug === slug);
  if (!post) return null;
  return { ...post, html: markExternalLinks(marked.parse(post.body)) };
}

export function rubricName(slug) {
  return RUBRICS.find((r) => r.slug === slug)?.name || 'Материалы';
}
