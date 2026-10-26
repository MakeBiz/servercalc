import index from '@/data/price-index.json';
import { CATALOG_HIDDEN } from '@/lib/catalog';

// Открытые данные индекса цен VPS для цитирования и ИИ-поиска. Скрытые в каталоге провайдеры не попадают
export const dynamic = 'force-static';

export function GET() {
  const data = {
    ...index,
    source: 'https://servercalc.ru/indeks-cen-vps/',
    license: 'CC BY 4.0, ссылка на servercalc.ru обязательна',
    rows: index.rows.filter((r) => !CATALOG_HIDDEN.has(r.providerSlug)),
    withdrawn: (index.withdrawn || []).filter((w) => !CATALOG_HIDDEN.has(w.providerSlug)),
  };
  delete data.compared;
  delete data.unchanged;
  delete data.up;
  delete data.down;
  return new Response(JSON.stringify(data, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
