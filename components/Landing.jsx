import Link from 'next/link';
import PageHead from '@/components/PageHead';
import JsonLd from '@/components/JsonLd';
import AnswerTable from '@/components/AnswerTable';
import OutLink from '@/components/OutLink';
import { getProvider } from '@/lib/data';
import { absUrl } from '@/lib/site';
import { planName } from '@/lib/answer-first';

/**
 * Посадочная страница (перенос механизма с servercalc.com 29.10.2026), метод VIDNO:
 * ответ первым абзацем, таблица тарифов из базы, утвердительные H2,
 * CTA в середине текста и в конце, FAQ с разметкой FAQPage, «Read also».
 *
 * Текст: массив абзацев, абзац строка или массив кусков, кусок строка
 * или { href, text } для внутренней ссылки (без UTM)
 */
function Para({ p }) {
  const parts = Array.isArray(p) ? p : [p];
  return (
    <p className="dim">
      {parts.map((s, i) =>
        typeof s === 'string' ? (
          <span key={i}>{s}</span>
        ) : (
          <Link key={i} href={s.href}>
            {s.text}
          </Link>
        )
      )}
    </p>
  );
}

export default function Landing({
  path,
  crumbs,
  eyebrow,
  title,
  lead,
  badges = [],
  table,
  sections = [],
  midAfter = 1,
  midCta,
  endCta,
  faq = [],
  related = [],
  readAlso = [],
  afterTable = null,
}) {
  const plans = table?.plans || [];
  const top = endCta?.plan || plans[0];
  const topProvider = top ? getProvider(top.providerSlug) : null;

  const Section = ({ s, alt }) => (
    <section className={`section ${alt ? 'paper-alt' : 'paper'}`}>
      <div className="wrap" style={{ maxWidth: 860 }}>
        <h2 style={{ marginBottom: 14 }}>{s.h2}</h2>
        <div className="stack">
          {s.paras.map((p, i) => (
            <Para key={i} p={p} />
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <>
      {faq.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            inLanguage: 'ru-RU',
            mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }}
        />
      )}
      {plans.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            inLanguage: 'ru-RU',
            name: title,
            url: absUrl(path),
            dateModified: table.checked,
            mainEntity: {
              '@type': 'ItemList',
              name: table.h2,
              itemListElement: plans.slice(0, 12).map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                  '@type': 'Product',
                  name: planName(p),
                  category: 'VPS',
                  offers: { '@type': 'Offer', priceCurrency: 'RUB', price: Math.round(p.priceRub) },
                },
              })),
            },
          }}
        />
      )}

      <PageHead
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        crumbs={crumbs}
        badges={
          badges.length ? (
            <>
              {badges.map((b, i) => (
                <span key={b} className={`badge${i === 0 ? ' badge-brass' : ''}`}>
                  {b}
                </span>
              ))}
            </>
          ) : null
        }
      />

      {table && (
        <section className="section paper">
          <div className="wrap">
            <div className="eyebrow">
              <span className="label">{table.label || 'Сначала дешёвые'}</span>
            </div>
            <h2>{table.h2}</h2>
            {table.lead && <p className="lead">{table.lead}</p>}
            <div className="mt">
              {plans.length ? (
                <AnswerTable plans={plans} campaign={table.campaign} highlight={table.highlight} geo={table.geo} />
              ) : (
                <div className="notice notice-warn">
                  <strong>Пока пусто.</strong> Под этот фильтр нет тарифа со свежей проверенной ценой. Список
                  заполнится после следующей сверки цен
                </div>
              )}
            </div>
            {afterTable}
          </div>
        </section>
      )}

      {sections.map((s, i) => (
        <div key={s.h2}>
          <Section s={s} alt={i % 2 === 0} />
          {i === midAfter && midCta && (
            <section className="section-tight paper">
              <div className="wrap" style={{ maxWidth: 860 }}>
                <div className="notice">
                  <strong>{midCta.title}</strong> {midCta.text}
                  <div className="row mt">
                    <Link href={midCta.href} className="btn btn-brass btn-sm">
                      {midCta.label}
                    </Link>
                    {midCta.second && (
                      <Link href={midCta.second.href} className="btn btn-ghost btn-sm">
                        {midCta.second.label}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      ))}

      {faq.length > 0 && (
        <section className="section paper">
          <div className="wrap" style={{ maxWidth: 860 }}>
            <div className="eyebrow">
              <span className="label">Вопросы</span>
            </div>
            <h2 style={{ marginBottom: 26 }}>Частые вопросы</h2>
            <div className="stack-lg">
              {faq.map((f) => (
                <div key={f.q}>
                  <h3>{f.q}</h3>
                  <p className="dim">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {(endCta || topProvider) && (
        <section className="section-tight paper-alt">
          <div className="wrap" style={{ maxWidth: 860 }}>
            <div className="notice">
              <strong>{endCta?.title || 'Готовы выбрать?'}</strong>{' '}
              {endCta?.text || (top ? `Первая строка таблицы: ${planName(top)}.` : '')}
              <div className="row mt">
                {topProvider && (
                  <OutLink provider={topProvider} campaign={table?.campaign} content={topProvider.slug}>
                    {endCta?.button || `Перейти на сайт ${topProvider.name}`}
                  </OutLink>
                )}
                <Link href={endCta?.href || '/'} className="btn btn-ghost btn-sm">
                  {endCta?.label || 'Подобрать в калькуляторе'}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {(related.length > 0 || readAlso.length > 0) && (
        <section className="section paper">
          <div className="wrap">
            {related.length > 0 && (
              <>
                <div className="eyebrow">
                  <span className="label">Похожие страницы</span>
                </div>
                <div className="chips" style={{ marginBottom: 28 }}>
                  {related.map((r) => (
                    <Link key={r.href} href={r.href} className="chip chip-light">
                      {r.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
            {readAlso.length > 0 && (
              <>
                <div className="eyebrow">
                  <span className="label">Читайте также</span>
                </div>
                <ul className="list-check">
                  {readAlso.map((r) => (
                    <li key={r.href}>
                      <Link href={r.href}>{r.label}</Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      )}
    </>
  );
}
