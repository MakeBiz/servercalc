import { SITE_URL } from '@/lib/site';
import PROVIDERS from '@/data/providers.json';

// Картинка для товарной разметки: Google не принимает Product без поля image
// в отчёте «Данные о товарах продавца». Тарифы VPS своих фото не имеют,
// поэтому ставим общую картинку сайта, если у товара своей нет (26.10.2026)
const PRODUCT_IMAGE = `${SITE_URL}/opengraph-image.png`;

// Бренд товара: провайдер, чьё имя стоит в начале названия тарифа.
// Длинные имена проверяем первыми, чтобы «Timeweb Cloud» не съел короткий префикс
const BRANDS = PROVIDERS.flatMap((p) => [p.nameEn, p.name].filter(Boolean))
  .sort((a, b) => b.length - a.length);
function brandOf(name) {
  if (typeof name !== 'string') return null;
  return BRANDS.find((b) => name === b || name.startsWith(b + ' ')) || null;
}

function withProductImage(node) {
  if (Array.isArray(node)) return node.map(withProductImage);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = withProductImage(v);
  if (out['@type'] === 'Product') {
    if (!out.image) out.image = PRODUCT_IMAGE;
    if (!out.description && out.name) out.description = String(out.name);
    if (!out.brand) {
      const b = brandOf(out.name);
      if (b) out.brand = { '@type': 'Brand', name: b };
    }
  }
  return out;
}

export default function JsonLd({ data }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(withProductImage(data)).replace(/</g, '\\u003c') }}
    />
  );
}
