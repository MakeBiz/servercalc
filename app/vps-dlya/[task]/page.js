import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHead from '@/components/PageHead';
import Calculator from '@/components/Calculator';
import ProviderCard from '@/components/ProviderCard';
import JsonLd from '@/components/JsonLd';
import TaskIcon from '@/components/TaskIcon';
import { TASKS, getTask, providersForTask, minPriceOf, calculatorPayload, VISIBLE_PLANS, STATS } from '@/lib/data';
import { taskContent } from '@/lib/task-content';
import { postsForTask, rubricName } from '@/lib/news';
import { CAMPAIGN } from '@/lib/utm';
import { price, plural, ruDate } from '@/lib/format';

export function generateStaticParams() {
  return TASKS.map((t) => ({ task: t.slug }));
}

export async function generateMetadata({ params }) {
  const { task: slug } = await params;
  const task = getTask(slug);
  if (!task) return {};
  return {
    title: task.h1,
    description: `${task.intent}. Рекомендуемая конфигурация с объяснением, почему именно столько ресурсов, что проверить у провайдера и подходящие тарифы с датой проверки цены`,
    alternates: { canonical: `/vps-dlya/${slug}` },
  };
}

export default async function TaskPage({ params }) {
  const { task: slug } = await params;
  const task = getTask(slug);
  if (!task) notFound();

  const content = taskContent(slug);
  const providers = providersForTask(slug);
  const related = postsForTask(slug);
  const payload = calculatorPayload();
  const suited = VISIBLE_PLANS.filter(
    (p) => p.ram >= task.ram && p.cpu >= task.cpu && providers.some((x) => x.slug === p.providerSlug)
  ).sort((a, b) => a.priceRub - b.priceRub);
  const cheapest = suited[0];

  return (
    <>
      {content?.faq && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: content.faq.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }}
        />
      )}

      <PageHead
        eyebrow="Подбор под задачу"
        title={task.h1}
        lead={task.intent}
        crumbs={[
          { href: '/vps-dlya', label: 'Задачи' },
          { href: `/vps-dlya/${slug}`, label: task.name },
        ]}
        badges={
          <>
            <span className="badge badge-brass">рекомендуем {task.cpu} × {task.ram} ГБ</span>
            <span className="badge">{providers.length} подходящих провайдеров</span>
            {cheapest && <span className="badge">от {price(cheapest.priceRub)} в месяц</span>}
            <span className="badge">проверено {ruDate(STATS.verifiedAt)}</span>
          </>
        }
      />

      {/* конфигурация с объяснением: то, за чем приходят на такую страницу */}
      <section className="section paper">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Сколько ресурсов нужно</span>
          </div>
          <h2>Почему именно столько</h2>
          <p className="lead mb">{content?.why}</p>

          <div className="cards" style={{ marginTop: 26 }}>
            {content?.sizing.map((row, i) => (
              <div className="card" key={row.label}>
                <div className="card-top">
                  <span className="label" style={{ margin: 0 }}>
                    {String(i + 1).padStart(2, '0')} · {row.label}
                  </span>
                  {i === 1 && <span className="badge badge-brass">типовой выбор</span>}
                </div>
                <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
                  {row.cpu} × {row.ram} ГБ
                </div>
                <p className="faint" style={{ margin: 0 }}>диск от {row.disk} ГБ</p>
                <p className="dim" style={{ fontSize: '0.92rem', marginTop: 6 }}>{row.note}</p>
              </div>
            ))}
          </div>

          <div className="grid-2 mt-lg">
            <div>
              <div className="eyebrow">
                <span className="label">Что проверить до оплаты</span>
              </div>
              <ul className="list-check">
                {content?.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="notice">
              <strong>Как это связано с подбором.</strong> Калькулятор ниже уже настроен под эту
              задачу: подставлены {task.cpu} {plural(task.cpu, 'ядро', 'ядра', 'ядер')} и {task.ram} ГБ
              памяти из рекомендации. Значения можно поменять, подбор пересчитается сразу.
              Соответствие задаче даёт провайдеру +25 баллов,{' '}
              <Link href="/metodologiya">вся формула</Link>
            </div>
          </div>
        </div>
      </section>

      {/* калькулятор с предустановкой */}
      <section className="section ink">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label label-brass">Подбор</span>
          </div>
          <h2 style={{ marginBottom: 24 }}>Подберём под {task.name.toLowerCase()}</h2>
          <Calculator payload={payload} presetTask={slug} campaign={CAMPAIGN.task(slug)} />
        </div>
      </section>

      {/* тарифы */}
      <section className="section paper">
        <div className="wrap">
          <div className="between mb">
            <div>
              <div className="eyebrow">
                <span className="label">Тарифы</span>
              </div>
              <h2>Подходящие тарифы из базы</h2>
              <p className="lead">
                Отобраны те, что перекрывают рекомендуемую конфигурацию: не меньше {task.cpu}{' '}
                {plural(task.cpu, 'ядра', 'ядер', 'ядер')} и {task.ram} ГБ памяти
              </p>
            </div>
            <Link href="/catalog" className="btn btn-ghost">
              Весь каталог
            </Link>
          </div>

          {suited.length === 0 ? (
            <div className="notice notice-warn">
              <strong>Пока пусто.</strong> В базе нет тарифов с проверенной ценой, которые
              перекрывают эту конфигурацию. Как только парсер обновит цены, список появится
            </div>
          ) : (
            <div className="tbl-wrap">
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Провайдер</th>
                      <th>Тариф</th>
                      <th>CPU</th>
                      <th>Память</th>
                      <th>Диск</th>
                      <th>Цена за ГБ</th>
                      <th>Проверено</th>
                      <th style={{ textAlign: 'right' }}>Цена</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suited.slice(0, 12).map((p) => {
                      const provider = providers.find((x) => x.slug === p.providerSlug);
                      return (
                        <tr key={p.id}>
                          <td>
                            <Link href={`/provajdery/${p.providerSlug}`} style={{ textDecoration: 'none', fontWeight: 600 }}>
                              {provider?.name || p.providerSlug}
                            </Link>
                          </td>
                          <td>{p.name}</td>
                          <td className="td-num">{p.cpu}</td>
                          <td className="td-num">{p.ram} ГБ</td>
                          <td className="td-num">{p.disk} ГБ <span className="faint">{p.diskType}</span></td>
                          <td className="td-num">{price(p.priceRub / p.ram)}</td>
                          <td className="td-num faint">{ruDate(p.verifiedAt)}</td>
                          <td className="td-price" style={{ textAlign: 'right' }}>{price(p.priceRub)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* провайдеры */}
      <section className="section paper-alt">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Провайдеры</span>
          </div>
          <h2 style={{ marginBottom: 24 }}>Кто заявляет эту задачу</h2>
          <div className="cards cards-2">
            {providers.map((p) => (
              <ProviderCard key={p.slug} provider={p} minPrice={minPriceOf(p.slug)} campaign={CAMPAIGN.task(slug)} />
            ))}
          </div>
        </div>
      </section>

      {/* вопросы */}
      {content?.faq && (
        <section className="section paper">
          <div className="wrap">
            <div className="eyebrow">
              <span className="label">Вопросы</span>
            </div>
            <h2 style={{ marginBottom: 26 }}>Что спрашивают про {task.name.toLowerCase()}</h2>
            <div className="stack-lg">
              {content.faq.map((f) => (
                <div key={f.q}>
                  <h3>{f.q}</h3>
                  <p className="dim">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* разборы по этой задаче */}
      {related.length > 0 && (
        <section className="section paper-alt">
          <div className="wrap">
            <div className="eyebrow">
              <span className="label">Разборы по теме</span>
            </div>
            <h2 style={{ marginBottom: 26 }}>Что почитать перед выбором</h2>
            <div className="cards cards-2">
              {related.map((p) => (
                <Link key={p.slug} href={`/novosti/${p.slug}`} className="card">
                  <div className="card-top">
                    <span className="badge">{rubricName(p.rubric)}</span>
                    <span className="faint mono">{ruDate(p.date)}</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem' }}>{p.title}</h3>
                  <p className="faint" style={{ margin: 0 }}>{p.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* другие задачи */}
      <section className="section-tight paper">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Другие задачи</span>
          </div>
          <div className="chips">
            {TASKS.filter((t) => t.slug !== slug).map((t) => (
              <Link key={t.slug} href={`/vps-dlya/${t.slug}`} className="chip chip-light">
                <TaskIcon slug={t.slug} size={16} />
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
