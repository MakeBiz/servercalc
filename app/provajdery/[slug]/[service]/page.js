import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHead from '@/components/PageHead';
import OutLink from '@/components/OutLink';
import JsonLd from '@/components/JsonLd';
import { getProvider } from '@/lib/data';
import { allServicePages, getService, servicesOf, serviceBlock, fromLabel } from '@/lib/provider-services';
import { ruDate } from '@/lib/format';
import { absUrl } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return allServicePages().map((s) => ({ slug: s.provider, service: s.slug }));
}

export async function generateMetadata({ params }) {
  const { slug, service } = await params;
  const s = getService(slug, service);
  if (!s) return {};
  return {
    title: { absolute: s.title },
    description: s.description,
    alternates: { canonical: `/provajdery/${slug}/${service}` },
  };
}

function Table({ s }) {
  const head = (
    <thead>
      <tr>
        {s.cols.map((c, i) => (
          <th key={c} style={i === s.cols.length - 1 ? { textAlign: 'right' } : undefined}>{c}</th>
        ))}
      </tr>
    </thead>
  );
  const body = (rows) => (
    <tbody>
      {rows.map((r, i) => (
        <tr key={i}>
          {r.map((cell, j) => (
            <td key={j} className={j === r.length - 1 ? 'td-price' : j === 0 ? undefined : 'td-num'} style={j === r.length - 1 ? { textAlign: 'right', whiteSpace: 'nowrap' } : j === 0 ? { fontWeight: 600 } : undefined}>
              {cell}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
  if (s.groups) {
    return (
      <div className="stack">
        {s.groups.map((g) => (
          <details key={g.title} open={g.open} className="svc-group">
            <summary>
              <strong>{g.title}</strong> <span className="faint">{g.note}, {g.rows.length} тарифов</span>
            </summary>
            <div className="tbl-wrap" style={{ marginTop: 12 }}>
              <div className="tbl-scroll">
                <table className="tbl">{head}{body(g.rows)}</table>
              </div>
            </div>
          </details>
        ))}
      </div>
    );
  }
  return (
    <div className="tbl-wrap">
      <div className="tbl-scroll">
        <table className="tbl">{head}{body(s.rows || [])}</table>
      </div>
    </div>
  );
}

export default async function ServicePage({ params }) {
  const { slug, service } = await params;
  const provider = getProvider(slug);
  const s = getService(slug, service);
  if (!provider || !s) notFound();
  const block = serviceBlock(slug);
  const all = servicesOf(slug);
  const related = (s.related || []).map((r) => all.find((x) => x.slug === r)).filter(Boolean);
  const from = fromLabel(s);
  const campaign = `svc_${service}`;
  const url = absUrl(`/provajdery/${slug}/${service}/`);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: `${s.name} ${provider.name}`,
          serviceType: s.name,
          description: s.description,
          url,
          provider: { '@type': 'Organization', name: provider.name, url: provider.site },
          areaServed: 'RU',
          ...(s.priceFrom !== null && s.priceFrom !== undefined
            ? { offers: { '@type': 'Offer', price: s.priceFrom, priceCurrency: 'RUB', url } }
            : {}),
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: s.faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />

      <PageHead
        eyebrow={`${provider.name} · ${s.group}`}
        title={s.h1}
        lead={s.answer}
        crumbs={[
          { href: '/provajdery', label: 'Провайдеры' },
          { href: `/provajdery/${slug}`, label: provider.name },
          { href: `/provajdery/${slug}/servisy`, label: 'Сервисы' },
          { href: `/provajdery/${slug}/${service}`, label: s.menu },
        ]}
        badges={
          <>
            {from && <span className="badge badge-brass">{from}</span>}
            <span className="badge">цены на {ruDate(block.verifiedAt)}</span>
          </>
        }
      >
        <div className="row mt">
          <OutLink provider={provider} campaign={campaign} className="btn btn-brass">
            Подключить в {provider.name}
          </OutLink>
          <Link href={`/provajdery/${slug}/servisy`} className="btn btn-ghost">
            Все сервисы {provider.name}
          </Link>
        </div>
        <p className="disclosure" style={{ maxWidth: 640 }}>
          Переход партнёрский: если вы оформите услугу, мы получим вознаграждение. Цена для вас при этом не меняется
        </p>
      </PageHead>

      <section className="section paper">
        <div className="wrap">
          <div className="prose" style={{ maxWidth: 760 }}>
            <h2>{s.name} в {provider.name}: как это устроено</h2>
            {s.intro.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
          <div className="grid-2 mt">
            <div>
              <div className="eyebrow">
                <span className="label">Что входит</span>
              </div>
              <ul className="list-check">
                {s.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow">
                <span className="label">Кому подходит</span>
              </div>
              <ul className="list-check">
                {s.forWhom.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section paper-alt" id="ceny">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Цены</span>
          </div>
          <h2>{s.tableTitle}</h2>
          <p className="faint" style={{ marginBottom: 20 }}>{s.tableNote}</p>
          <Table s={s} />
          <div className="row mt">
            <OutLink provider={provider} campaign={campaign} className="btn btn-brass">
              Заказать в {provider.name}
            </OutLink>
            <Link href="/kalkulyator" className="btn btn-ghost">
              Сравнить с другими провайдерами
            </Link>
          </div>
        </div>
      </section>

      <section className="section paper">
        <div className="wrap">
          <div className="grid-2">
            <div className="prose">
              <h2>Что это значит для бюджета</h2>
              {s.budget.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
            <div>
              <div className="eyebrow">
                <span className="label">Ограничения и нюансы</span>
              </div>
              <ul className="list-check list-minus">
                {s.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <p className="faint mt">
                Раздел с ограничениями есть на каждой странице. Без него обзор был бы рекламой, а не помощью в выборе
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section paper-alt">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Вопросы</span>
          </div>
          <h2 style={{ marginBottom: 26 }}>Частые вопросы: {s.name}</h2>
          <div className="stack-lg">
            {s.faq.map((f) => (
              <div key={f.q}>
                <h3>{f.q}</h3>
                <p className="dim">{f.a}</p>
              </div>
            ))}
          </div>
          <div className="notice mt">
            <strong>Где брали цифры.</strong> Цены и условия сняты с официального сайта {provider.name} ({s.source.replace('https://', '')}) {ruDate(block.verifiedAt)}. Провайдер может поменять их без предупреждения, итог перед оплатой показывает его панель
          </div>
        </div>
      </section>

      <section className="section paper">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Читайте также</span>
          </div>
          <div className="cards cards-2" style={{ marginTop: 16 }}>
            {related.map((r) => (
              <Link key={r.slug} href={`/provajdery/${slug}/${r.slug}`} className="card">
                <div className="card-top">
                  <span className="badge">{r.group}</span>
                  {fromLabel(r) && <span className="faint mono">{fromLabel(r)}</span>}
                </div>
                <h3 style={{ fontSize: '1.1rem' }}>{r.h1}</h3>
              </Link>
            ))}
            {(s.links || []).map((l) => (
              <Link key={l.href} href={l.href} className="card">
                <div className="card-top">
                  <span className="badge">ServerCalc</span>
                </div>
                <h3 style={{ fontSize: '1.1rem' }}>{l.label}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight paper-alt">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Все сервисы {provider.name}</span>
          </div>
          <div className="chips">
            {all
              .filter((x) => x.slug !== service)
              .map((x) => (
                <Link key={x.slug} href={`/provajdery/${slug}/${x.slug}`} className="chip chip-light">
                  {x.menu}
                </Link>
              ))}
          </div>
          <div className="row mt">
            <OutLink provider={provider} campaign={campaign} className="btn btn-brass">
              Перейти в {provider.name}
            </OutLink>
          </div>
        </div>
      </section>
    </>
  );
}
