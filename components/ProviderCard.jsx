import Link from 'next/link';
import OutLink from './OutLink';
import { price } from '@/lib/format';

/**
 * Карточка провайдера. Подача строго одинаковая у всех: ни закрепления,
 * ни ярлыков «выбор редакции», ни визуального выделения за деньги.
 * Это условие, при котором каталог остаётся справочным материалом,
 * а не рекламной публикацией (позиция ФАС по агрегаторам)
 */
export default function ProviderCard({ provider, minPrice, campaign, geoLabel }) {
  const initials = provider.name.replace(/[^A-Za-zА-Яа-я]/g, '').slice(0, 2).toUpperCase();

  return (
    <article className="prov">
      <div className="prov-head">
        <span className="prov-mark" style={{ background: provider.color }}>
          {initials}
        </span>
        <div style={{ minWidth: 0 }}>
          <Link href={`/provajdery/${provider.slug}`} className="prov-name">
            {provider.name}
          </Link>
          <div className="prov-meta">
            {provider.country === 'RU' ? 'Российский провайдер' : 'Зарубежный провайдер'}
            {geoLabel ? `, ${geoLabel}` : ''}
          </div>
        </div>
      </div>

      <p className="faint" style={{ margin: 0, lineHeight: 1.5 }}>
        {provider.description.length > 132
          ? provider.description.slice(0, 130).trim() + '…'
          : provider.description}
      </p>

      <div className="row" style={{ gap: 6 }}>
        {provider.affiliateStatus === 'active' ? (
          <span className="badge">партнёрская ссылка</span>
        ) : (
          <span className="badge badge-plain">без партнёрства</span>
        )}
        {provider.features?.testPeriod && <span className="badge">тест-период</span>}
        {provider.features?.hourly && <span className="badge">почасовая</span>}
      </div>

      <div className="card-foot">
        <span className="faint">Тарифы от</span>
        <span className="prov-price">{minPrice ? price(minPrice) : 'уточняется'}</span>
      </div>

      <div className="prov-actions">
        <Link href={`/provajdery/${provider.slug}`} className="btn btn-ghost btn-sm">
          Обзор
        </Link>
        <OutLink provider={provider} campaign={campaign} className="btn btn-brass btn-sm">
          На сайт
        </OutLink>
      </div>
    </article>
  );
}
