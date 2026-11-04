import Link from 'next/link';
import OutLink from './OutLink';
import { featuredInfo } from '@/lib/featured';
import { price } from '@/lib/format';

/** Карточка основного партнёра над списками и таблицами (04.11.2026). Пометка «Основной партнёр» обязательна */
export default function FeaturedPartner({ task = null, place = 'page', compact = false }) {
  const f = featuredInfo(task);
  if (!f) return null;
  const p = f.provider;
  return (
    <aside className={`featured${compact ? ' featured-compact' : ''}`} aria-label={f.label}>
      <div className="featured-top">
        <span className="featured-label">{f.label}</span>
        <Link href={`/provajdery/${p.slug}`} className="featured-name">{p.name}</Link>
        {f.min && <span className="featured-price">тарифы от {price(f.min)} в месяц</span>}
      </div>
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
      <p className="featured-note">
        Наш основной партнёр, поэтому стоит первым. Остальные провайдеры ниже идут по условиям и цене
      </p>
    </aside>
  );
}
