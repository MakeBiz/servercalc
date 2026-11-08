import FeaturedPartner from '@/components/FeaturedPartner';
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
import { price, plural, ruDate, termShort } from '@/lib/format';
import { taskAnswer, geoAnswer, itemListLd } from '@/lib/geo-answer';
import { taskLead, checkedAt, checkedLine, yearOf, planName, provName, termNote } from '@/lib/answer-first';
import { windowsLead, windowsFrom } from '@/lib/windows';
import { cheapestForRow, windowsByProvider, separateLicenses } from '@/lib/sizing-prices';
import { absUrl } from '@/lib/site';

export function generateStaticParams() {
  return TASKS.map((t) => ({ task: t.slug }));
}

export async function generateMetadata({ params }) {
  const { task: slug } = await params;
  const task = getTask(slug);
  if (!task) return {};
  const providers = providersForTask(slug);
  const suited = VISIBLE_PLANS.filter(
    (p) => p.ram >= task.ram && p.cpu >= task.cpu && providers.some((x) => x.slug === p.providerSlug)
  ).sort((a, b) => a.priceRub - b.priceRub);
  const year = yearOf(checkedAt(suited, STATS.verifiedAt));
  const winFrom = slug === 'windows' ? windowsFrom(suited) : null;
  const from = slug === 'windows'
    ? (winFrom ? `: от ${price(winFrom)}/мес с лицензией` : '')
    : !task.noTariffs && suited[0] ? `: от ${price(suited[0].priceRub)}/мес` : '';
  return {
    title: { absolute: `${task.titleShort || task.h1}, цены ${year}${from}` },
    description: `${task.intent}. Рекомендованная конфигурация, что проверить у провайдера и подходящие тарифы с проверенной ценой`,
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
  const checked = checkedAt(suited, STATS.verifiedAt);
  const quick = taskAnswer(task, suited, providers, checked);
  const lead = slug === 'windows' ? windowsLead(suited, checked) : taskLead(task, suited, VISIBLE_PLANS, checked, { what: task.leadWhat });
  // 08.11.2026: цена у каждой конфигурации и честное число провайдеров с подходящими тарифами
  const isWin = slug === 'windows';
  const taskPlans = VISIBLE_PLANS.filter((p) => providers.some((x) => x.slug === p.providerSlug));
  const rowPrices = task.noTariffs ? [] : (content?.sizing || []).map((row) => cheapestForRow(row, taskPlans, { windows: isWin }));
  const winRows = isWin && content?.sizing?.[1] ? windowsByProvider(content.sizing[1], taskPlans) : [];
  const provCount = task.noTariffs || !suited.length ? providers.length : new Set(suited.map((p) => p.providerSlug)).size;
  const extraFaq = sizingFaq(slug, content, rowPrices, checked);
  const faqAll = [...(content?.faq || []), ...extraFaq, ...(quick ? [quick.faq] : [])];
  const pageUrl = absUrl(`/vps-dlya/${slug}/`);

  return (
    <>
      {faqAll.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqAll.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }}
        />
      )}

      {quick && <JsonLd data={itemListLd(task.h1, pageUrl, suited, providers, checked)} />}

      <PageHead
        eyebrow={!task.noTariffs && suited.length ? checkedLine(checked) : 'Подбор под задачу'}
        title={task.h1}
        lead={lead || task.intent}
        crumbs={[
          { href: '/vps-dlya', label: 'Задачи' },
          { href: `/vps-dlya/${slug}`, label: task.name },
        ]}
        badges={
          <>
            <span className="badge badge-brass">рекомендуем {task.cpu} × {task.ram} ГБ</span>
            <span className="badge">{provCount} {plural(provCount, 'подходящий провайдер', 'подходящих провайдера', 'подходящих провайдеров')}</span>
            {!task.noTariffs && cheapest && (slug === 'windows' && windowsFrom(suited)
              ? <span className="badge">от {price(windowsFrom(suited))} в месяц с лицензией</span>
              : <span className="badge">от {price(cheapest.priceRub)} в месяц</span>)}
            <span className="badge">проверено {ruDate(checked)}</span>
          </>
        }
      />

      {quick && (
        <section className="section-tight paper">
          <div className="wrap">
            <div className="notice">
              <strong>{task.intent}.</strong> {quick.text}
            </div>
          </div>
        </section>
      )}

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
                {rowPrices[i] && (
                  <p className="mono" style={{ fontSize: '0.9rem', marginTop: 8 }}>
                    {isWin ? 'с лицензией ' : ''}от {price(rowPrices[i].total)} в месяц: {planName(rowPrices[i].p)}
                    {termNote(rowPrices[i].p) ? `, ${termNote(rowPrices[i].p)}` : ''}
                  </p>
                )}
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

      {/* Windows: итог с лицензией по провайдерам (08.11.2026) */}
      {isWin && winRows.length > 0 && (
        <section className="section-tight paper">
          <div className="wrap">
            <div className="eyebrow">
              <span className="label">Цена с лицензией</span>
            </div>
            <h2>
              Windows VPS {content.sizing[1].cpu} × {content.sizing[1].ram} ГБ с лицензией: итог в месяц
            </h2>
            <p className="lead mb">
              Голая машина дешевле, но без лицензии Windows Server на ней не запустить ни 1С, ни RDP.
              Поэтому сравниваем итог: цена сервера плюс лицензия, если провайдер берёт её отдельно
            </p>
            <div className="tbl-wrap">
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Провайдер</th>
                      <th>Тариф</th>
                      <th>CPU</th>
                      <th>Память</th>
                      <th>Сервер</th>
                      <th>Лицензия</th>
                      <th>Проверено</th>
                      <th style={{ textAlign: 'right' }}>Итог</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winRows.map(({ p, total, license }) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/provajdery/${p.providerSlug}`} style={{ textDecoration: 'none', fontWeight: 600 }}>
                            {provName(p)}
                          </Link>
                        </td>
                        <td>{p.name}</td>
                        <td className="td-num">{p.cpu}</td>
                        <td className="td-num">{p.ram} ГБ</td>
                        <td className="td-num">{price(p.priceRub)}</td>
                        <td className="td-num">{license ? price(license) : 'в цене'}</td>
                        <td className="td-num faint">{ruDate(p.verifiedAt)}</td>
                        <td className="td-num" style={{ textAlign: 'right', fontWeight: 600 }}>{price(total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

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
          {providers.some((p) => p.slug === 'timeweb') && <FeaturedPartner task={slug} place={`task_${slug}`} compact />}
          <div className="between mb">
            <div>
              <div className="eyebrow">
                <span className="label">Тарифы</span>
              </div>
              <h2>{task.noTariffs ? 'Сервер с GPU: цену считают отдельно' : 'Подходящие тарифы из базы'}</h2>
              {task.noTariffs ? (
                <p className="lead">
                  Цена сервера с видеокартой зависит от модели GPU и объёма видеопамяти и считается
                  отдельно от обычных VPS. Ниже провайдеры, у которых есть GPU-серверы
                </p>
              ) : (
                <p className="lead">
                  Отобраны те, что перекрывают рекомендуемую конфигурацию: не меньше {task.cpu}{' '}
                  {plural(task.cpu, 'ядра', 'ядер', 'ядер')} и {task.ram} ГБ памяти
                </p>
              )}
            </div>
            <Link href="/catalog" className="btn btn-ghost">
              Весь каталог
            </Link>
          </div>

          {task.noTariffs ? (
            <div className="notice">
              <strong>Почему здесь нет таблицы цен.</strong> Тарифы с GPU провайдеры выносят отдельно
              от обычных VPS, а цена зависит от модели видеокарты и объёма видеопамяти. В нашей базе
              цена за ресурс считается для обычных серверов, поэтому цену за GPU мы тут не показываем,
              чтобы не вводить в заблуждение: актуальную конфигурацию и цену смотрите у провайдера
            </div>
          ) : suited.length === 0 ? (
            <div className="notice notice-warn">
              <strong>Пока пусто.</strong> В базе нет тарифов с проверенной ценой, которые
              перекрывают эту конфигурацию. Список появится после ближайшей еженедельной сверки цен
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
                          <td className="td-price" style={{ textAlign: 'right' }}>{price(p.priceRub)}{termShort(p) && <div className="faint" style={{ fontSize: '0.75rem', fontWeight: 400 }}>{termShort(p)}</div>}</td>
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
              <ProviderCard key={p.slug} provider={p} minPrice={task.noTariffs ? null : minPriceOf(p.slug)} campaign={CAMPAIGN.task(slug)} />
            ))}
          </div>
        </div>
      </section>

      {/* вопросы */}
      {faqAll.length > 0 && (
        <section className="section paper">
          <div className="wrap">
            <div className="eyebrow">
              <span className="label">Вопросы</span>
            </div>
            <h2 style={{ marginBottom: 26 }}>Что спрашивают про {task.name.toLowerCase()}</h2>
            <div className="stack-lg">
              {faqAll.map((f) => (
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

const cores = (n) => `${n} ${plural(n, 'ядро', 'ядра', 'ядер')}`;
const tn = (p) => (termNote(p) ? `, ${termNote(p)}` : '');

/**
 * Вопросы с ценой по конфигурациям (08.11.2026): «1С на 10 пользователей» и
 * «Windows VPS с лицензией» дословно из опроса нейросетей. Ответ собирается
 * из базы, поэтому цена и дата всегда совпадают с карточками
 */
function sizingFaq(slug, content, rowPrices, checked) {
  const rows = content?.sizing || [];
  const [min, work] = [rowPrices[0], rowPrices[1]];
  if (slug === '1c-bitrix' && rows[1] && work) {
    return [{
      q: 'Какой VPS выбрать для 1С на 10 пользователей и сколько он стоит',
      a: `На десять пользователей в клиент-серверном режиме берут рабочую конфигурацию: ${cores(rows[1].cpu)}, ${rows[1].ram} ГБ памяти и диск от ${rows[1].disk} ГБ. В нашей базе она стоит от ${price(work.total)} в месяц (${planName(work.p)}${tn(work.p)}), проверено ${ruDate(checked)}.` +
        (min ? ` Файловой базе до пяти сеансов хватает ${rows[0].cpu} ${plural(rows[0].cpu, 'ядра', 'ядер', 'ядер')} и ${rows[0].ram} ГБ, от ${price(min.total)} в месяц (${planName(min.p)}${tn(min.p)}).` : '') +
        ' Если сотрудники работают через RDP на Windows, к цене сервера прибавьте лицензию Windows Server',
    }];
  }
  if (slug === 'windows' && rows[1] && work) {
    const sep = separateLicenses()
      .map((x) => `${provName({ providerSlug: x.slug })} ${price(x.licenseRub)} в месяц`)
      .join(', ');
    return [{
      q: 'Сколько стоит Windows VPS с лицензией',
      a: (min ? `С лицензией Windows Server в нашей базе от ${price(min.total)} в месяц за ${min.p.cpu} × ${min.p.ram} ГБ (${planName(min.p)}${tn(min.p)}). ` : '') +
        `Рабочая конфигурация под 1С и RDP, ${cores(rows[1].cpu)} и ${rows[1].ram} ГБ, стоит от ${price(work.total)} в месяц (${planName(work.p)}${tn(work.p)}), проверено ${ruDate(checked)}.` +
        (sep ? ` Где лицензия идёт отдельной строкой, мы прибавляем её к цене сервера: ${sep}` : ''),
    }];
  }
  return [];
}
