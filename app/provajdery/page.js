import FeaturedPartner from '@/components/FeaturedPartner';
import PageHead from '@/components/PageHead';
import ProviderCard from '@/components/ProviderCard';
import JsonLd from '@/components/JsonLd';
import FaqBlock from '@/components/FaqBlock';
import { PROVIDERS, STATS, minPriceOf, plansOf, sortForProvidersPage } from '@/lib/data';
import { CAMPAIGN } from '@/lib/utm';
import { plural, ruDate } from '@/lib/format';
import { absUrl } from '@/lib/site';

export const metadata = {
  title: 'Провайдеры VPS (ВПС): сравнение и рейтинг',
  description:
    'Сравнение и рейтинг провайдеров виртуальных серверов (VPS, ВПС): российские и зарубежные, с партнёрскими отношениями и без. У каждого отдельная страница с тарифами и ограничениями',
  alternates: { canonical: '/provajdery' },
};

export default function ProvidersPage() {
  const ru = PROVIDERS.filter((p) => p.country === 'RU');
  const intl = PROVIDERS.filter((p) => p.country !== 'RU');
  const provs = `${PROVIDERS.length} ${plural(PROVIDERS.length, 'провайдер', 'провайдера', 'провайдеров')}`;
  const plans = `${STATS.plans} ${plural(STATS.plans, 'тариф', 'тарифа', 'тарифов')}`;
  // 08.11.2026: вопрос «Где сравнить цены VPS разных провайдеров?» из опроса нейросетей
  const faq = [
    {
      q: 'Где сравнить цены VPS разных провайдеров',
      a: `На этой странице и в каталоге ServerCalc: ${provs} и ${plans} с ценой, проверенной ${ruDate(STATS.verifiedAt)}. В каталоге все тарифы одной таблицей с ценой за гигабайт памяти и датой проверки, калькулятор на главной подбирает тариф под задачу, ресурсы и бюджет. Цены сверяем с сайтами провайдеров раз в неделю, тариф без проверки дольше ${STATS.staleDays} дней скрываем`,
    },
    {
      q: 'Чем российские провайдеры отличаются от зарубежных',
      a: 'Российские дают договор и закрывающие документы для юрлиц и хранят данные внутри страны, это важно для 1С и персональных данных. Зарубежные нужны, когда аудитория проекта за пределами России или нужна конкретная страна размещения. Цены зарубежных пересчитаны в рубли по курсу ЦБ',
    },
    {
      q: 'Почему в списке есть провайдеры без партнёрства',
      a: 'Без них сравнение было бы неполным. Провайдер попадает в каталог, если у него есть публичный прайс, который можно проверить, и линейка виртуальных серверов. В подборе партнёры сервиса получают прибавку 10 баллов, это описано в методологии, рекламное место стоит отдельно с пометкой «Реклама»',
    },
  ];

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
        lead={`Сравнение VPS-провайдеров: ${provs} и ${plans} с ценой, проверенной ${ruDate(STATS.verifiedAt)}. Каталог намеренно включает провайдеров, с которыми у нас нет партнёрских отношений: без них сравнение было бы неполным, а подбор нечестным`}
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
          <FeaturedPartner place="providers" />
          <div className="cards cards-2">
            {sortForProvidersPage(ru).map((p) => (
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
            {sortForProvidersPage(intl).map((p) => (
              <ProviderCard key={p.slug} provider={p} minPrice={minPriceOf(p.slug)} campaign={CAMPAIGN.providers} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight paper">
        <div className="wrap">
          <div className="notice">
            <strong>Как формируется этот список.</strong> Провайдер попадает в каталог, если у него
            есть публичный прайс, который можно проверить, и линейка виртуальных серверов. Первыми
            стоят провайдеры, с которыми мы работаем напрямую, остальные идут по минимальной цене в
            базе. В подборе на главной порядок задают только условия запроса и цена. Всего в
            базе {PROVIDERS.reduce((n, p) => n + plansOf(p.slug).length, 0)} проверенных тарифов
          </div>
        </div>
      </section>

      <FaqBlock title="Частые вопросы о сравнении провайдеров" faq={faq} alt />
    </>
  );
}
