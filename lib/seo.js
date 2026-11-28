/**
 * Длина title и description (28.11.2026, аудит практик SEO и GEO).
 * Поисковик показывает около 70 знаков заголовка и около 160 знаков описания,
 * остальное обрезает на полуслове. Здесь помощники, которые собирают описание
 * под лимит: цифра и ответ идут первыми, необязательные хвосты добавляются, пока влезают
 */
export const TITLE_MAX = 70;
export const DESCRIPTION_MAX = 160;

/** Обрезка по концу предложения, иначе по слову с многоточием */
export function clipText(text, max = DESCRIPTION_MAX) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const dot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (dot > max * 0.5) return cut.slice(0, dot + 1);
  const space = cut.slice(0, max - 1).lastIndexOf(' ');
  return `${(space > 40 ? cut.slice(0, space) : cut.slice(0, max - 1)).replace(/[,;:.\s]+$/, '')}…`;
}

/**
 * Описание из основы и хвостов. Хвост это строка или список вариантов от длинного к короткому:
 * берётся первый вариант, с которым описание укладывается в лимит. Не влез ни один, хвост пропускается
 */
export function fitDescription(base, tails = [], max = DESCRIPTION_MAX) {
  let out = String(base || '').trim().replace(/[.\s]+$/, '');
  for (const tail of tails) {
    for (const variant of [].concat(tail).filter(Boolean)) {
      const next = out ? `${out}. ${variant}` : variant;
      if (next.length <= max) {
        out = next;
        break;
      }
    }
  }
  return clipText(out, max);
}
