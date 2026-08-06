/**
 * Состояние подбора и фильтров каталога в адресе страницы.
 *
 * Зачем: подбор можно переслать ссылкой, состояние переживает перезагрузку,
 * а под рекламу можно готовить предзаполненные посадочные вида
 * /vps-dlya/1c-bitrix?ram=8&cpu=4&budget=3000
 *
 * Почему не useSearchParams: сайт собирается статическим экспортом, и хук
 * требует Suspense-обёртки на каждой странице. Читаем адрес напрямую в
 * useEffect после монтирования, пишем через replaceState, чтобы не засорять
 * историю браузера на каждое движение ползунка
 */

export function readParams() {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export function num(params, key, fallback) {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}

export function list(params, key) {
  const raw = params.get(key);
  if (!raw) return null;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Пишем в адрес только то, что отличается от значения по умолчанию:
 * чистая ссылка на страницу остаётся чистой, пока человек ничего не менял
 */
export function writeParams(values) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  Object.entries(values).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') params.delete(key);
    else params.set(key, String(value));
  });
  const qs = params.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', next);
}

export function shareUrl() {
  if (typeof window === 'undefined') return '';
  return window.location.href;
}
