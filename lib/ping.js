import HOSTS from '@/data/ping-hosts.json';

/**
 * Замер задержки из браузера посетителя до серверов в регионах.
 * Запускается только по кнопке: запросы уходят напрямую к хостам
 * провайдеров, без нас. Первый запрос тратится на DNS и TLS, считаем
 * медиану 2-5 попыток. Это задержка ответа по HTTPS, она чуть выше
 * классического ping, но регионы между собой сравнивает честно
 */
async function once(host) {
  const t0 = performance.now();
  await fetch(`https://${host}/?sc=${Math.random().toString(36).slice(2)}`, { mode: 'no-cors', cache: 'no-store' });
  return performance.now() - t0;
}

export async function measureGeo(code) {
  const h = HOSTS[code];
  if (!h || typeof h !== 'object') return null;
  const ts = [];
  for (let i = 0; i < 5; i++) {
    try {
      ts.push(await once(h.host));
    } catch {
      return null;
    }
  }
  const rest = ts.slice(1).sort((a, b) => a - b);
  return Math.round((rest[1] + rest[2]) / 2);
}

export const PING_GEOS = Object.keys(HOSTS).filter((k) => !k.startsWith('_'));
export const pingCity = (code, en = false) => (HOSTS[code] ? (en ? HOSTS[code].cityEn : HOSTS[code].city) : '');
