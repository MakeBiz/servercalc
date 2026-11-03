import Link from 'next/link';
import PageHead from '@/components/PageHead';
import OutLink from '@/components/OutLink';
import SimpleTable from '@/components/SimpleTable';
import FaqBlock from '@/components/FaqBlock';
import { LLM_API as A, asPartner } from '@/lib/partners-extra';
import { getProvider } from '@/lib/data';
import { ruDate } from '@/lib/format';

export const metadata = {
  title: { absolute: A.title },
  description: A.description,
  alternates: { canonical: '/api-nejrosetej' },
};

export default function ApiPage() {
  const timeweb = getProvider('timeweb');
  return (
    <>
      <PageHead
        eyebrow="API нейросетей"
        title={A.h1}
        lead={A.answer}
        crumbs={[{ href: '/api-nejrosetej', label: 'API нейросетей' }]}
        badges={<span className="badge">цены на {ruDate(A.verifiedAt)}</span>}
      >
        <p className="disclosure" style={{ maxWidth: 640 }}>
          Ссылки на сервисы партнёрские: если вы пополните баланс, мы получим вознаграждение. Цена для вас не меняется
        </p>
      </PageHead>

      <section className="section paper">
        <div className="wrap">
          <div className="prose" style={{ maxWidth: 760 }}>
            <h2>Агрегатор даёт один ключ и рублёвый баланс</h2>
            {A.intro.map((t) => (
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
          <h2>Одна модель стоит в разных сервисах по-разному</h2>
          <p className="faint" style={{ marginBottom: 20 }}>{A.tableNote}</p>
          <SimpleTable cols={A.cols} rows={A.rows} />
        </div>
      </section>

      <section className="section paper">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Сервисы</span>
          </div>
          <h2 style={{ marginBottom: 20 }}>Что важно знать о каждом</h2>
          <div className="cards cards-2">
            {A.services.map((s) => (
              <div key={s.slug} className="card">
                <div className="card-top">
                  <span className="badge">{s.name}</span>
                  <span className="faint">{s.note}</span>
                </div>
                <ul className="list-check" style={{ margin: 0 }}>
                  {s.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <div className="row" style={{ marginTop: 14 }}>
                  <OutLink provider={asPartner(s)} campaign="api_nejrosetej" className="btn btn-brass btn-sm">
                    Перейти в {s.name}
                  </OutLink>
                </div>
              </div>
            ))}
            {timeweb && (
              <div className="card">
                <div className="card-top">
                  <span className="badge">Timeweb Cloud AI Gateway</span>
                </div>
                <ul className="list-check" style={{ margin: 0 }}>
                  {A.timeweb.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <div className="row" style={{ marginTop: 14 }}>
                  <OutLink provider={timeweb} campaign="api_nejrosetej" className="btn btn-brass btn-sm">
                    Перейти в Timeweb Cloud
                  </OutLink>
                  <Link href={A.timeweb.href} className="btn btn-ghost btn-sm">
                    Все модели и цены
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section paper-alt">
        <div className="wrap">
          <div className="grid-2">
            <div className="prose">
              <h2>Что это значит для бюджета</h2>
              {A.budget.map((t) => (
                <p key={t.slice(0, 40)}>{t}</p>
              ))}
            </div>
            <div>
              <div className="eyebrow">
                <span className="label">Ограничения</span>
              </div>
              <ul className="list-check list-minus">
                {A.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <FaqBlock title="Частые вопросы про API нейросетей" faq={A.faq} />

      <section className="section-tight paper-alt">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Читайте также</span>
          </div>
          <div className="chips">
            {A.links.map((l) => (
              <Link key={l.href} href={l.href} className="chip chip-light">
                {l.label}
              </Link>
            ))}
          </div>
          <p className="faint mt">
            Цены сняты с сайтов Polza AI, AITunnel и BotHub {ruDate(A.verifiedAt)}, Timeweb Cloud 1 ноября 2026. Агрегаторы меняют цены часто, итог показывает их кабинет
          </p>
        </div>
      </section>
    </>
  );
}
