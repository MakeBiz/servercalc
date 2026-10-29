import Link from 'next/link';
import OutLink from './OutLink';
import { price } from '@/lib/format';
import { getGeoByCode } from '@/lib/data';

/**
 * Карточка провайдера. Подача строго одинаковая у всех: ни закрепления,
 * ни ярлыков «выбор редакции», ни визуального выделения за деньги.
 * Это условие, при котором каталог остаётся справочным материалом,
 * а не рекламной публикацией (позиция ФАС по агрегаторам)
 */
export default function ProviderCard({ provider, minPrice, campaign, geoLabel }) {
  const initials = provider.name.replace(/[^A-Za-zА-Яа-я]/g, '').slice(0, 2).toUpperCase();
  const geos = (provider.geos || []).map((g) => getGeoByCode(g)?.name).filter(Boolean).slice(0, 4);

  return (
    <article className="prov">
      <div className="prov-head">
        <span className="prov-mark" style={{ background: provider.color }}>
          {initials}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link href={`/provajdery/${provider.slug}`} className="prov-name">
            {provider.name}
          </Link>
          <div className="prov-meta">
            {provider.country === 'RU' ? 'Российский провайдер' : 'Зарубежный провайдер'}
            {geoLabel ? `, ${geoLabel}` : ''}
          </div>
        </div>
        {provider.affiliateStatus === 'active' ? (
          <span className="badge">Партнёр</span>
        ) : (
          <span className="badge badge-plain">без партнёрства</span>
        )}
      </div>

      <p className="prov-desc">
        {provider.description.length > 132
          ? provider.description.slice(0, 130).trim() + '…'
          : provider.description}
      </p>

      <div className="prov-chips">
        {geos.map((g) => (
          <span key={g} className="pchip">{g}</span>
        ))}
        {provider.features?.testPeriod && <span className="pchip pchip-ok">Тест-период</span>}
        {provider.features?.hourly && <span className="pchip pchip-ok">Почасовая</span>}
      </div>

      <div className="prov-actions">
        <OutLink provider={provider} campaign={campaign} className="btn btn-brass btn-block prov-cta">
          {minPrice ? `Тарифы ${provider.name} от ${price(minPrice)}` : `Сайт ${provider.name}`}
        </OutLink>
        <Link href={`/provajdery/${provider.slug}`} className="prov-review">
          Обзор {provider.name}
        </Link>
      </div>
    </article>
  );
}
