import { SITE_URL } from '@/lib/site';

// Картинка для товарной разметки: Google не принимает Product без поля image
// в отчёте «Данные о товарах продавца». Тарифы VPS своих фото не имеют,
// поэтому ставим общую картинку сайта, если у товара своей нет (26.10.2026)
const PRODUCT_IMAGE = `${SITE_URL}/opengraph-image.png`;

function withProductImage(node) {
  if (Array.isArray(node)) return node.map(withProductImage);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = withProductImage(v);
  if (out['@type'] === 'Product' && !out.image) out.image = PRODUCT_IMAGE;
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
