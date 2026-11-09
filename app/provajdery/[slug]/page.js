import Link from 'next/link';
import { partnerBonus } from '@/lib/quality';
import { notFound } from 'next/navigation';
import PageHead from '@/components/PageHead';
import OutLink from '@/components/OutLink';
import JsonLd from '@/components/JsonLd';
import Freshness from '@/components/Freshness';
import TaskIcon from '@/components/TaskIcon';
import { ProviderArticle, ProviderFaqAlt } from '@/components/ProviderArticle';
import {
  PROVIDERS,
  getProvider,
  plansOf,
  allPlansOf,
  minPriceOf,
  TASKS,
  GEOS,
  REQUIREMENTS,
  providerMeets,
  STATS,
} from '@/lib/data';
import { CAMPAIGN } from '@/lib/utm';
import { PROMOS } from '@/lib/promos';
import { price, plural, ruDate, termShort } from '@/lib/format';
import { absUrl } from '@/lib/site';
import { pairsOf, pairTitle } from '@/lib/compare';
import { servicesOf, fromLabel } from '@/lib/provider-services';

// Обрезка описания провайдера для description: по концу предложения, иначе по слову с многоточием.
// До 09.11.2026 резали slice(0, 140) посреди слова («…базовая защ Что провайдер…»)
function clipSentence(text, max) {
  const t = String(text || '').trim();
  if (t.length <= max) return /[.!?…]$/.test(t) ? t : `${t}.`;
  const cut = t.slice(0, max);
  const dot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (dot > 40) return cut.slice(0, dot + 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 40 ? cut.slice(0, space) : cut).replace(/[,;:\s]+$/, '')}…`;
}

export function generateStaticParams() {
  return PROVIDERS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const provider = getProvider(slug);
  if (!provider) return {};
  const min = minPriceOf(slug);
  const count = plansOf(slug).length;
  return {
    // Метод журнала, замер 07.11.2026: брендовые запросы на 4-10 месте и 0 кликов. Цифра в title и в начале description
    title: min
      ? `${provider.name}: VPS от ${price(min)} в месяц, ${count} ${plural(count, 'тариф', 'тарифа', 'тарифов')}, обзор`
      : `${provider.name}: обзор провайдера, тарифы и цены VPS (ВПС)`,
    description: `${min ? `${provider.name}: VPS от ${price(min)} в месяц, ${count} ${plural(count, 'тариф', 'тарифа', 'тарифов')} с проверенной ценой. ` : ''}${clipSentence(provider.description, 140)} Что провайдер закрывает, а что нет, и под какие задачи подходит`,
    alternates: { canonical: `/provajdery/${slug}` },
  };
}

export default async function ProviderPage({ params }) {
  const { slug } = await params;
  const provider = getProvider(slug);
  const promo = PROMOS.find((x) => x.provider && x.provider.slug === slug);
  if (!provider) notFound();

  const plans = plansOf(slug);
  const hidden = allPlansOf(slug).length - plans.length;
  const min = minPriceOf(slug);
  const tasks = TASKS.filter((t) => (provider.tasks || []).includes(t.slug));
  const geos = GEOS.filter((g) => (provider.geos || []).includes(g.code));
  const isPartner = provider.affiliateStatus === 'active';

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: provider.name,
          url: provider.site,
          description: provider.description,
        }}
      />
      {plans.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `Тарифы ${provider.name}`,
            numberOfItems: plans.length,
            itemListElement: plans.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'Product',
                name: `${provider.name} ${p.name}`,
                description: `${p.cpu} × ${p.ram} ГБ, диск ${p.disk} ГБ ${p.diskType}`,
                offers: {
                  '@type': 'Offer',
                  price: p.priceRub,
                  priceCurrency: 'RUB',
                  availability: 'https://schema.org/InStock',
                  url: absUrl(`/provajdery/${slug}`),
                },
              },
            })),
          }}
        />
      )}

      <PageHead
        eyebrow="Обзор провайдера"
        title={provider.name}
        lead={provider.description}
        crumbs={[
          { href: '/provajdery', label: 'Провайдеры' },
          { href: `/provajdery/${slug}`, label: provider.name },
        ]}
        badges={
          <>
            {min && <span className="badge badge-brass">тарифы от {price(min)}</span>}
            <span className="badge">
              {provider.country === 'RU' ? 'российский провайдер' : 'зарубежный провайдер'}
            </span>
            {geos.map((g) => (
              <span className="badge" key={g.code}>{g.name}</span>
            ))}
          </>
        }
      >
        <div className="row mt">
          <OutLink provider={provider} campaign={CAMPAIGN.providerPage} className="btn btn-brass">
            {isPartner ? `Перейти на сайт ${provider.name}` : `Открыть сайт ${provider.name}`}
          </OutLink>
          <Link href="#sravnit" className="btn btn-ghost">
            Сравнить с другими
          </Link>
        </div>
        {promo && (
          <p className="mt" style={{ maxWidth: 640, margin: '12px 0 0' }}>
            <span className="badge badge-brass">Акция</span> {promo.title}. <Link href={`/akcii/#${promo.id}`}>Условия</Link>
          </p>
        )}
        <p className="disclosure" style={{ maxWidth: 640 }}>
          {isPartner
            ? (partnerBonus(provider.slug)
              ? `Переход партнёрский: если вы оформите услугу, мы получим вознаграждение. Цена для вас при этом не меняется. ${provider.name} партнёр сервиса: в подборе «Оптимально» он получает прибавку ${partnerBonus(provider.slug)} баллов, это описано в методологии`
              : 'Переход партнёрский: если вы оформите услугу, мы получим вознаграждение. Цена для вас при этом не меняется, а на позицию провайдера в подборе это не влияет')
            : 'С этим провайдером у нас нет партнёрских отношений. Ссылка обычная, мы не получаем вознаграждения за переход'}
        </p>
      </PageHead>

      <section className="section paper">
        <div className="wrap">
          <div className="grid-2">
            <div>
              <div className="eyebrow">
                <span className="label">Сильные стороны</span>
              </div>
              <ul className="list-check">
                {provider.pros.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow">
                <span className="label">Ограничения</span>
              </div>
              <ul className="list-check list-minus">
                {provider.cons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="faint mt">
                Раздел с ограничениями есть в каждом обзоре. Обзор без него был бы рекламной
                публикацией, а не справочным материалом
              </p>
            </div>
          </div>
        </div>
      </section>

      <ProviderArticle provider={provider} />

      {servicesOf(slug).length > 0 && (
        <section className="section paper" id="servisy">
          <div className="wrap">
            <div className="between mb">
              <div>
                <div className="eyebrow">
                  <span className="label">Кроме VPS</span>
                </div>
                <h2>Все сервисы {provider.name} с ценами</h2>
                <p className="lead">
                  Разобрали {servicesOf(slug).length} сервисов из личного кабинета: серверы, базы, хранилище, сети, ИИ и почту
                </p>
              </div>
              <Link href={`/provajdery/${slug}/servisy`} className="btn btn-ghost">
                Сводная таблица
              </Link>
            </div>
            <div className="chips">
              {servicesOf(slug).map((x) => (
                <Link key={x.slug} href={`/provajdery/${slug}/${x.slug}`} className="chip chip-light" title={fromLabel(x) || ''}>
                  {x.menu}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section paper-alt">
        <div className="wrap">
          <div className="between mb">
            <div>
              <div className="eyebrow">
                <span className="label">Тарифы</span>
              </div>
              <h2>Что есть в базе</h2>
            </div>
            <Freshness date={STATS.verifiedAt} />
          </div>

          {plans.length === 0 ? (
            <div className="notice notice-warn">
              {allPlansOf(slug).length === 0 ? (
                <>
                  <strong>Цены ещё не сверены.</strong> Прайс этого провайдера мы пока не проверили,
                  поэтому цен здесь нет вообще. Придумывать их мы не станем: смысл каталога в том,
                  что показанной цене можно верить. Провайдер остаётся в сравнении, характеристики
                  ниже актуальны
                </>
              ) : (
                <>
                  <strong>Цены на проверке.</strong> Тарифы этого провайдера не проверялись дольше{' '}
                  {STATS.staleDays} дней, поэтому мы их скрыли. Показывать устаревшую цену хуже, чем
                  не показывать никакой
                </>
              )}
            </div>
          ) : (
            <div className="tbl-wrap">
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Тариф</th>
                      <th>CPU</th>
                      <th>Память</th>
                      <th>Диск</th>
                      <th>Локация</th>
                      <th>IPv4</th>
                      <th>Проверено</th>
                      <th style={{ textAlign: 'right' }}>Цена</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td className="td-num">{p.cpu}</td>
                        <td className="td-num">{p.ram} ГБ</td>
                        <td className="td-num">
                          {p.disk} ГБ <span className="faint">{p.diskType}</span>
                        </td>
                        <td>{GEOS.find((g) => g.code === p.geo)?.name || p.geo}</td>
                        {/* null означает «провайдер не пишет об этом на странице тарифа»,
                            и это не то же самое, что «адреса нет» */}
                        <td className="td-num">
                          {p.ipv4 === true ? 'есть' : p.ipv4 === false ? 'нет' : <span className="faint">уточняется</span>}
                        </td>
                        <td className="td-num faint">
                          {ruDate(p.verifiedAt)}
                          {p.source && (
                            <>
                              {' '}
                              <a
                                href={p.source}
                                target="_blank"
                                rel="nofollow noopener"
                                className="link-brass"
                                title="Страница прайса, с которой сверялась цена"
                              >
                                прайс
                              </a>
                            </>
                          )}
                        </td>
                        <td className="td-price" style={{ textAlign: 'right' }}>{price(p.priceRub)}{termShort(p) && <div className="faint" style={{ fontSize: '0.75rem', fontWeight: 400 }}>{termShort(p)}</div>}</td>
                        <td style={{ textAlign: 'right' }}>
                          <OutLink
                            provider={provider}
                            campaign={CAMPAIGN.providerPage}
                            content={p.id}
                            className="btn btn-ghost btn-sm"
                          >
                            Открыть
                          </OutLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {hidden > 0 && (
            <p className="faint mt">
              Ещё {hidden} {plural(hidden, 'тариф скрыт', 'тарифа скрыты', 'тарифов скрыто')}, потому
              что цена не проверялась дольше {STATS.staleDays} дней
            </p>
          )}
        </div>
      </section>

      <section className="section paper">
        <div className="wrap">
          <div className="grid-2">
            <div>
              <div className="eyebrow">
                <span className="label">Характеристики</span>
              </div>
              <dl className="specs">
                <div className="spec">
                  <dt>Виртуализация</dt>
                  <dd>{(provider.virtualization || []).join(', ') || '—'}</dd>
                </div>
                <div className="spec">
                  <dt>Локации</dt>
                  <dd>{geos.map((g) => g.name).join(', ') || '—'}</dd>
                </div>
                {REQUIREMENTS.map((r) => (
                  <div className="spec" key={r.code}>
                    <dt>{r.name}</dt>
                    <dd style={{ color: providerMeets(provider, r.code) ? 'var(--ok)' : 'var(--text-faint)' }}>
                      {providerMeets(provider, r.code) ? 'есть' : 'нет'}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <div className="eyebrow">
                <span className="label">Под какие задачи подходит</span>
              </div>
              {tasks.length === 0 ? (
                <p className="dim">Провайдер не заявляет специализацию под конкретные сценарии</p>
              ) : (
                <div className="chips">
                  {tasks.map((t) => (
                    <Link key={t.slug} href={`/vps-dlya/${t.slug}`} className="chip chip-light">
                      <TaskIcon slug={t.slug} size={16} />
                      {t.name}
                    </Link>
                  ))}
                </div>
              )}
              <div className="notice mt">
                <strong>Как мы это определяем.</strong> Задача попадает в список, если провайдер
                заявляет её сам или если у него есть тарифы с подходящей конфигурацией. Это влияет
                на подбор: соответствие задаче даёт +25 баллов,{' '}
                <Link href="/metodologiya">формула целиком</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {pairsOf(slug).length > 0 && (
        <section className="section-tight paper">
          <div className="wrap">
            <div className="eyebrow">
              <span className="label">Сравнения</span>
            </div>
            <div className="chips">
              {pairsOf(slug).map((p) => (
                <Link key={p.slug} href={`/sravnenie/${p.slug}`} className="chip chip-light">
                  {pairTitle(p)}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <ProviderFaqAlt provider={provider} />

      <section className="section-tight paper-alt">
        <div className="wrap">
          <div className="notice">
            <strong>Раскрытие.</strong>{' '}
            {isPartner
              ? `С ${provider.name} у нас партнёрские отношения: за оформленную по нашей ссылке услугу мы получаем вознаграждение. ${partnerBonus(provider.slug) ? `В подборе «Оптимально» партнёры сервиса получают прибавку ${partnerBonus(provider.slug)} баллов, это описано в методологии. На содержание обзора это не влияет: раздел с ограничениями есть у всех.` : 'Это не влияет ни на позицию провайдера в подборе, ни на содержание обзора: раздел с ограничениями есть у всех.'}`
              : `С ${provider.name} у нас нет партнёрских отношений, за переходы мы не получаем ничего. Провайдер включён в каталог, потому что без него сравнение было бы неполным.`}{' '}
            <Link href="/metodologiya">Формула подбора открыта целиком</Link>
          </div>
        </div>
      </section>
    </>
  );
}
