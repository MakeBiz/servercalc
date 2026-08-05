import Link from 'next/link';
import PageHead from '@/components/PageHead';
import JsonLd from '@/components/JsonLd';
import OutLink from '@/components/OutLink';
import PromoCode from '@/components/PromoCode';
import { PROMOS, PROMOS_HIDDEN, HAS_PROMOS } from '@/lib/promos';
import { STATS } from '@/lib/data';
import { plural, ruDate } from '@/lib/format';
import { absUrl } from '@/lib/site';

export const metadata = {
  title: 'Акции и промокоды VPS-провайдеров',
  description:
    'Действующие акции и промокоды на виртуальные серверы. Каждая акция сверена с условиями провайдера, у каждой стоит дата проверки, просроченные скрываются автоматически',
  alternates: { canonical: '/akcii' },
  // пустой раздел не индексируем: тонкая страница без содержимого поисковику не нужна
  robots: HAS_PROMOS ? { index: true, follow: true } : { index: false, follow: true },
};

export default function PromosPage() {
  return (
    <>
      {HAS_PROMOS && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Акции и промокоды на виртуальные серверы',
            numberOfItems: PROMOS.length,
            itemListElement: PROMOS.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `${p.provider.name}: ${p.title}`,
              url: absUrl('/akcii'),
            })),
          }}
        />
      )}

      <PageHead
        eyebrow="Акции"
        title="Акции и промокоды"
        lead="Скидки и промокоды провайдеров из нашего каталога. Правило то же, что у цен: каждая акция сверена с условиями провайдера, у каждой стоит дата проверки, просроченные уходят со страницы автоматически"
        crumbs={[{ href: '/akcii', label: 'Акции и промокоды' }]}
        badges={
          <>
            <span className="badge badge-brass">
              {PROMOS.length} {plural(PROMOS.length, 'акция', 'акции', 'акций')}
            </span>
            {PROMOS_HIDDEN > 0 && (
              <span className="badge">
                {PROMOS_HIDDEN} {plural(PROMOS_HIDDEN, 'скрыта', 'скрыты', 'скрыто')} как устаревшие
              </span>
            )}
          </>
        }
      />

      <section className="section paper">
        <div className="wrap">
          {!HAS_PROMOS ? (
            <div className="notice notice-warn" style={{ maxWidth: 720 }}>
              <strong>Проверенных акций сейчас нет.</strong> Здесь появляются только предложения,
              которые мы сверили с условиями провайдера, с датой проверки у каждого. Показывать
              акцию, в которой не уверены, хуже, чем не показывать никакой: промокод, который
              не сработал на кассе, бьёт по доверию к каталогу, а не к провайдеру.
              Пока загляните в <Link href="/catalog">каталог тарифов</Link>: базовые цены там
              проверяются каждую неделю
            </div>
          ) : (
            <div className="cards cards-2">
              {PROMOS.map((p) => (
                <div className="card" key={p.id}>
                  <div className="card-top">
                    <span className="badge badge-brass">{p.provider.name}</span>
                    <span className="faint mono">проверено {ruDate(p.verifiedAt)}</span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem' }}>{p.title}</h3>
                  {p.benefit && <p className="dim" style={{ margin: '6px 0 0' }}>{p.benefit}</p>}

                  {p.code ? (
                    <div className="mt">
                      <PromoCode code={p.code} provider={p.provider.slug} />
                    </div>
                  ) : (
                    <p className="faint mt" style={{ margin: 0 }}>
                      Промокод не нужен: {p.mechanics || 'скидка применяется при переходе по ссылке'}
                    </p>
                  )}

                  {Array.isArray(p.conditions) && p.conditions.length > 0 && (
                    <ul className="list-check list-minus mt" style={{ fontSize: '0.92rem' }}>
                      {p.conditions.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  )}

                  <div className="row mt">
                    <OutLink
                      provider={p.provider}
                      campaign={`akcii_${p.provider.slug}`}
                      content={p.id}
                      className="btn btn-brass btn-sm"
                    >
                      Получить у {p.provider.name}
                    </OutLink>
                    <Link href={`/provajdery/${p.provider.slug}`} className="btn btn-ghost btn-sm">
                      Обзор провайдера
                    </Link>
                  </div>

                  <p className="faint" style={{ marginTop: 10, fontSize: '0.85rem' }}>
                    {p.validUntil ? `действует до ${ruDate(p.validUntil)}` : 'без объявленного срока окончания'}
                    {p.provider.affiliateStatus === 'active'
                      ? '. Переход партнёрский: при оформлении мы получим вознаграждение, цена для вас не меняется'
                      : ''}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="grid-2 mt-lg">
            <div className="notice">
              <strong>Почему здесь мало акций.</strong> Мы публикуем только то, что проверили
              руками: промокод введён, скидка применилась, ограничения записаны. Витрины
              из сотни непроверенных купонов дают обратный эффект: половина кодов не работает
            </div>
            <div className="notice">
              <strong>Про честные цены.</strong> Акционная цена почти всегда действует на первый
              срок оплаты. Цену продления смотрите в <Link href="/catalog">каталоге</Link>:
              переплата за бренд видна по цене за гигабайт памяти, а не по размеру скидки
            </div>
          </div>

          <p className="faint mt">
            Акция старше {STATS.staleDays} {plural(STATS.staleDays, 'дня', 'дней', 'дней')} без
            повторной сверки скрывается автоматически, как и тарифы в каталоге
          </p>
        </div>
      </section>
    </>
  );
}
