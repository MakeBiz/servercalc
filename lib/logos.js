/**
 * Логотипы провайдеров (18.11.2026): официальные иконки с сайтов провайдеров,
 * приведены к PNG 96×96 с прозрачным фоном, лежат в public/logos/<slug>.png.
 * Провайдер без файла показывается буквами в цвете бренда, как раньше.
 * DARK: иконка белая, ей нужна тёмная подложка
 */
const HAS = new Set([
  'timeweb', 'adminvps', 'hostman', 'ishosting', 'datapacket', 'truehost', 'vpsorg', 'fornex', 'vdsina',
  'ruvds', 'firstvds', 'cloud4box', 'aeza', 'cherryservers', 'massivegrid', 'ethernetservers', 'vpsdime',
  'profitserver', 'selectel', 'hostwinds', 'alphavps', 'vpshouse', 'beget', 'racknerd', 'rosehosting',
  'hostes', 'spaceweb',
]);
const DARK = new Set(['hostes']);

export function logoOf(slug) {
  return HAS.has(slug) ? { src: `/logos/${slug}.png`, dark: DARK.has(slug) } : null;
}
