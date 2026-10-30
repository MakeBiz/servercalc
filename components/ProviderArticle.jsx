import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import ARTICLES from '@/data/provider-articles.json';
import paymentsData from '@/data/payments.json';
import { PROVIDERS, GEOS, minPriceOf, PROVIDER_ORDER } from '@/lib/data';
import { absUrl } from '@/lib/site';
import { pairsOf } from '@/lib/compare';
import { price } from '@/lib/format';
const fmt = (r) => price(r);

const LANG = 'ru';
const BASE = LANG === 'ru' ? '/provajdery' : '/providers';
const CMP = LANG === 'ru' ? '/sravnenie' : '/compare';
const T = {
  ru: {
    review: 'Обзор', facts: 'Коротко', founded: 'На рынке с', hq: 'Штаб-квартира', legal: 'Юрлицо', dcs: 'Локации', products: 'Услуги',
    checked: 'Сверено с официальным сайтом', sources: 'Источники', faq: 'Частые вопросы', faqH: (n) => `Частые вопросы о ${n}`, alt: 'С кем сравнить',
    altLead: (n) => `Провайдеры с похожими локациями. Цены сверены, как и у ${n}`,
    th: ['Провайдер', 'Тарифы от', 'Локации', 'Оплата', ''], cmp: 'Сравнить', open: 'Обзор', all: 'Подобрать в калькуляторе по своим условиям',
    pay: { mir: 'Карта РФ', card: 'Зарубежная карта', sbp: 'СБП', crypto: 'Криптовалюта', paypal: 'PayPal' },
  },
  en: {
    review: 'Review', facts: 'At a glance', founded: 'Since', hq: 'Headquarters', legal: 'Legal entity', dcs: 'Locations', products: 'Services',
    checked: 'Checked against the official website', sources: 'Sources', faq: 'FAQ', faqH: (n) => `Common questions about ${n}`, alt: 'Alternatives to compare',
    altLead: (n) => `Providers with similar locations. Prices are verified the same way as for ${n}`,
    th: ['Provider', 'From', 'Locations', 'Payment', ''], cmp: 'Compare', open: 'Review', all: 'Match providers to your needs in the calculator',
    pay: { card: 'Card', paypal: 'PayPal', crypto: 'Crypto' },
  },
}[LANG];
const PAYS = paymentsData.payments || {};
const geoName = (g) => (LANG === 'en' ? g.nameEn || g.name : g.name);
const fmtDay = (d) => { const [y, m, day] = d.split('-'); return LANG === 'ru' ? `${day}.${m}.${y}` : `${m}/${day}/${y}`; };

export function articleOf(slug) {
  return ARTICLES[slug] || null;
}

export function ProviderArticle({ provider }) {
  const a = articleOf(provider.slug);
  if (!a) return null;
  const f = a.facts || {};
  const rows = [
    [T.founded, f.founded], [T.hq, f.hq], [T.legal, f.legal],
    [T.dcs, (f.datacenters || []).join(', ')], [T.products, (f.products || []).join(', ')],
  ].filter((r) => r[1]);
  return (
    <section className="section paper" id="obzor">
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'Article',
        headline: a.sections[0]?.h || provider.name, about: { '@type': 'Organization', name: provider.name, url: provider.site, ...(f.founded ? { foundingDate: f.founded } : {}) },
        dateModified: a.checkedAt, inLanguage: LANG, mainEntityOfPage: absUrl(`${BASE}/${provider.slug}`),
        publisher: { '@type': 'Organization', name: 'ServerCalc', url: absUrl('/') }, citation: a.sources,
      }} />
      <div className="wrap pa-grid">
        <article className="pa-body">
          <div className="eyebrow"><span className="label">{T.review} {provider.name}</span></div>
          {a.sections.map((s, i) => (
            <div key={i} className="pa-sec">
              <h2>{s.h}</h2>
              {s.p.map((t, j) => <p key={j}>{t}</p>)}
            </div>
          ))}
        </article>
        <aside className="pa-facts">
          <div className="pa-card">
            <div className="pa-card-h">{T.facts}</div>
            <dl>
              {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
            <p className="pa-checked">{T.checked} {fmtDay(a.checkedAt)}</p>
            <details className="pa-src">
              <summary>{T.sources} · {a.sources.length}</summary>
              <ol>{a.sources.map((u) => <li key={u}><a href={u} target="_blank" rel="nofollow noopener">{u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></li>)}</ol>
            </details>
          </div>
        </aside>
      </div>
    </section>
  );
}

function alternatives(provider) {
  const pool = PROVIDERS.filter((p) => p.slug !== provider.slug && !(LANG === 'en' && p.enHidden) && minPriceOf(p.slug));
  const mine = new Set(provider.geos || []);
  const rank = (s) => { const i = (PROVIDER_ORDER || []).indexOf(s); return i === -1 ? 99 : i; };
  const ru = (p) => p.country === 'RU';
  return pool
    .map((p) => ({ p, score: (p.geos || []).filter((g) => mine.has(g)).length * 10 + (ru(p) === ru(provider) ? 5 : 0) - rank(p.slug) * 0.1 }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 4)
    .map((x) => x.p);
}

export function ProviderFaqAlt({ provider }) {
  const a = articleOf(provider.slug);
  const alts = alternatives(provider);
  const pairs = pairsOf(provider.slug);
  return (
    <>
      {a && a.faq?.length > 0 && (
        <section className="section paper-alt" id="faq">
          <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: a.faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) }} />
          <div className="wrap"><div className="pa-faq">
            <div className="eyebrow"><span className="label">{T.faq}</span></div>
            <h2>{T.faqH(provider.name)}</h2>
            {a.faq.map((x, i) => (
              <details key={i} className="pa-q" open={i === 0}>
                <summary>{x.q}</summary>
                <p>{x.a}</p>
              </details>
            ))}
          </div></div>
        </section>
      )}
      {alts.length > 0 && (
        <section className="section paper" id="sravnit">
          <div className="wrap">
            <div className="eyebrow"><span className="label">{T.alt}</span></div>
            <p className="lead mb">{T.altLead(provider.name)}</p>
            <div className="tbl-wrap"><div className="tbl-scroll">
              <table className="tbl">
                <thead><tr>{T.th.map((h, i) => <th key={i} style={i === 1 ? { textAlign: 'right' } : undefined}>{h}</th>)}</tr></thead>
                <tbody>
                  {alts.map((p) => {
                    const pair = pairs.find((x) => x.a === p.slug || x.b === p.slug);
                    const pm = PAYS[p.slug] || {};
                    return (
                      <tr key={p.slug}>
                        <td style={{ fontWeight: 600 }}><Link href={`${BASE}/${p.slug}`}>{p.name}</Link></td>
                        <td className="td-price" style={{ textAlign: 'right' }}>{fmt(minPriceOf(p.slug))}</td>
                        <td>{GEOS.filter((g) => (p.geos || []).includes(g.code)).map(geoName).join(', ')}</td>
                        <td>{Object.keys(T.pay).filter((k) => pm[k] === true).map((k) => T.pay[k]).join(', ') || '—'}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Link className="btn btn-ghost btn-sm" href={pair ? `${CMP}/${pair.slug}` : `${BASE}/${p.slug}`}>{pair ? T.cmp : T.open}</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div></div>
            <p className="mt"><Link href="/#podbor" className="link-brass">{T.all}</Link></p>
          </div>
        </section>
      )}
    </>
  );
}
