import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHead from '@/components/PageHead';
import OutLink from '@/components/OutLink';
import SimpleTable from '@/components/SimpleTable';
import FaqBlock from '@/components/FaqBlock';
import { PROXY, getProxy, asPartner } from '@/lib/partners-extra';
import { ruDate } from '@/lib/format';

export const dynamicParams = false;

export function generateStaticParams() {
  return PROXY.providers.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = getProxy(slug);
  if (!p) return {};
  return { title: { absolute: p.title }, description: p.description, alternates: { canonical: `/proxy/${slug}` } };
}

export default async function ProxyProvider({ params }) {
  const { slug } = await params;
  const p = getProxy(slug);
  if (!p) notFound();
  const partner = asPartner(p);
  const campaign = `proxy_${slug}`;
  const others = PROXY.providers.filter((x) => x.slug !== slug);

  return (
    <>
      <PageHead
        eyebrow="Прокси · обзор сервиса"
        title={p.h1}
        lead={p.answer}
        crumbs={[
          { href: '/proxy', label: 'Прокси' },
          { href: `/proxy/${slug}`, label: p.name },
        ]}
        badges={<span className="badge">цены на {ruDate(PROXY.verifiedAt)}</span>}
      >
        <div className="row mt">
          <OutLink provider={partner} campaign={campaign} className="btn btn-brass">
            Перейти в {p.name}
          </OutLink>
          <Link href="/proxy" className="btn btn-ghost">
            Сравнить с другими
          </Link>
        </div>
        <p className="disclosure" style={{ maxWidth: 640 }}>
          Переход партнёрский: если вы оплатите прокси, мы получим вознаграждение. Цена для вас не меняется
        </p>
      </PageHead>

      <section className="section paper">
        <div className="wrap">
          <div className="prose" style={{ maxWidth: 760 }}>
            <h2>Что продаёт {p.name}</h2>
            {p.intro.map((t) => (
              <p key={t.slice(0, 40)}>{t}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="section paper-alt" id="ceny">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Цены</span>
          </div>
          <h2>Цены {p.name} по срокам</h2>
          <p className="faint" style={{ marginBottom: 20 }}>{p.tableNote}</p>
          <SimpleTable cols={p.cols} rows={p.rows} />
          <div className="row mt">
            <OutLink provider={partner} campaign={campaign} className="btn btn-brass">
              Купить прокси в {p.name}
            </OutLink>
          </div>
        </div>
      </section>

      <section className="section paper">
        <div className="wrap">
          <div className="grid-2">
            <div>
              <div className="eyebrow">
                <span className="label">Сильные стороны</span>
              </div>
              <ul className="list-check">
                {p.pros.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow">
                <span className="label">Ограничения</span>
              </div>
              <ul className="list-check list-minus">
                {p.cons.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="prose mt" style={{ maxWidth: 760 }}>
            <h2>Что это значит для бюджета</h2>
            {p.budget.map((t) => (
              <p key={t.slice(0, 40)}>{t}</p>
            ))}
          </div>
        </div>
      </section>

      <FaqBlock title={`Частые вопросы про ${p.name}`} faq={p.faq} alt />

      <section className="section-tight paper">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Другие сервисы</span>
          </div>
          <div className="chips">
            <Link href="/proxy" className="chip chip-light">Сравнение прокси</Link>
            {others.map((o) => (
              <Link key={o.slug} href={`/proxy/${o.slug}`} className="chip chip-light">
                {o.name}
              </Link>
            ))}
            <Link href="/api-nejrosetej" className="chip chip-light">API нейросетей</Link>
          </div>
          <div className="row mt">
            <OutLink provider={partner} campaign={campaign} className="btn btn-brass">
              Перейти в {p.name}
            </OutLink>
          </div>
          <p className="faint mt">
            Данные с официального сайта {p.name} ({p.sources}) на {ruDate(PROXY.verifiedAt)}
          </p>
        </div>
      </section>
    </>
  );
}
