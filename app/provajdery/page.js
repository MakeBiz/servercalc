import PageHead from '@/components/PageHead';
import ProviderCard from '@/components/ProviderCard';
import JsonLd from '@/components/JsonLd';
import { PROVIDERS, STATS, minPriceOf, plansOf } from '@/lib/data';
import { CAMPAIGN } from '@/lib/utm';
import { plural, ruDate } from '@/lib/format';
import { absUrl } from '@/lib/site';

export const metadata = {
  title: 'Провайдеры VPS в сравнении',
  description:
    'Все провайдеры виртуальных серверов, которые участвуют в подборе: российские и зарубежные, с партнёрскими отношениями и без них. У каждого отдельная страница с тарифами и ограничениями',
  alternates: { canonical: '/provajdery' },
};

export default function ProvidersPage() {
  const ru = PROVIDERS.filter((p) => p.country === 'RU');
  const intl = PROVIDERS.filter((p) => p.country !== 'RU');
  const sortByPrice = (a, b) => (minPriceOf(a.slug) ?? Infinity) - (minPriceOf(b.slug) ?? Infinity);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Провайдеры виртуальных серверов',
          numberOfItems: PROVIDERS.length,
          itemListElement: PROVIDERS.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: p.name,
            url: absUrl(`/provajdery/${p.slug}`),
          })),
        }}
      />

      <PageHead
        eyebrow="Провайдеры"
        title="Провайдеры в сравнении"
        lead="Каталог намеренно включает провайдеров, с которыми у нас нет партнёрских отношений: без них сравнение было бы неполным, а подбор нечестным"
        crumbs={[{ href: '/provajdery', label: 'Провайдеры' }]}
        badges={
          <>
            <span className="badge badge-brass">{STATS.plans} {plural(STATS.plans, 'тариф с проверенной ценой', 'тарифа с проверенной ценой', 'тарифов с проверенной ценой')}</span>
            <span className="badge">проверено {ruDate(STATS.verifiedAt)}</span>
          </>
        }
      />

      <section className="section paper">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Российские провайдеры</span>
          </div>
          <p className="lead mb">
            Дата-центры в России, договор и закрывающие документы для юрлиц, размещение данных
            внутри страны
          </p>
          <div className="cards cards-2">
            {[...ru].sort(sortByPrice).map((p) => (
              <ProviderCard key={p.slug} provider={p} minPrice={minPriceOf(p.slug)} campaign={CAMPAIGN.providers} />
            ))}
          </div>
        </div>
      </section>

      <section className="section paper-alt">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Зарубежные провайдеры</span>
          </div>
          <p className="lead mb">
            Локации в Европе, США, ОАЭ и по миру. Подходят, когда аудитория проекта за пределами
            России или нужна конкретная страна размещения
          </p>
          <div className="cards cards-2">
            {[...intl].sort(sortByPrice).map((p) => (
              <ProviderCard key={p.slug} provider={p} minPrice={minPriceOf(p.slug)} campaign={CAMPAIGN.providers} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight paper">
        <div className="wrap">
          <div className="notice">
            <strong>Как формируется этот список.</strong> Провайдер попадает в каталог, если у него
            есть публичный прайс, который можно проверить, и линейка виртуальных серверов. Позиция
            в списке зависит от минимальной цены в базе, а не от размера вознаграждения. Всего в
            базе {PROVIDERS.reduce((n, p) => n + plansOf(p.slug).length, 0)} проверенных тарифов
          </div>
        </div>
      </section>
    </>
  );
}
