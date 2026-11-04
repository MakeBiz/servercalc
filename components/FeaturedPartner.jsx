import Link from 'next/link';
import OutLink from './OutLink';
import { featuredInfo } from '@/lib/featured';
import { price } from '@/lib/format';

/** Рекламный блок над списками и таблицами (04.11.2026): пометка «Реклама», бейдж «Лучший промокод» с критерием. Списки ниже идут честным порядком «Оптимально» */
export default function FeaturedPartner({ task = null, place = 'page', compact = false }) {
  const f = featuredInfo(task);
  if (!f) return null;
  const p = f.provider;
  return (
    <aside className={`featured${compact ? ' featured-compact' : ''}`} aria-label={f.adLabel || 'Реклама'}>
      <div className="featured-top">
        <span className="adbar-label">{f.adLabel || 'Реклама'}</span>
        <span className="featured-label">{f.label}</span>
        <Link href={`/provajdery/${p.slug}`} className="featured-name">{p.name}</Link>
        {f.min && <span className="featured-price">тарифы от {price(f.min)} в месяц</span>}
      </div>
      {f.labelWhy && <p className="featured-labelwhy">{f.labelWhy}</p>}
      <ul className="featured-why">
        {f.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <div className="featured-foot">
        {f.promo && (
          <span className="featured-promo" title={f.promo.hint}>
            {f.promo.text}: <b>{f.promo.code}</b>
          </span>
        )}
        <div className="row">
          <OutLink provider={p} campaign={`featured_${place}`} goalName="featured_click" className="btn btn-brass">
            Перейти в {p.name}
          </OutLink>
          <Link href={f.servicesHref} className="btn btn-ghost">Все сервисы</Link>
        </div>
      </div>
      <p className="featured-note">{f.why}</p>
    </aside>
  );
}
