import Link from 'next/link';
import Calculator from '@/components/Calculator';
import TaskIcon from '@/components/TaskIcon';
import JsonLd from '@/components/JsonLd';
import { FreshnessRule } from '@/components/Freshness';
import { calculatorPayload, TASKS, GEO_PAGES, PROVIDERS, STATS, VISIBLE_PLANS, minPriceOf, plansOf, plansForGeo, sortProvidersByPriority, getProvider, bonusDisclosure } from '@/lib/data';
import { qualityOf } from '@/lib/quality';
import { logoOf } from '@/lib/logos';
import { PAY_METHODS } from '@/lib/payments';
import { allPosts, rubricName } from '@/lib/news';
import { price, plural, ruDate, num } from '@/lib/format';
import { dmy } from '@/lib/answer-first';
import { CAMPAIGN } from '@/lib/utm';
import { absUrl, SITE_NAME, SITE_URL } from '@/lib/site';

/* ---------- живые цифры для заголовков, ответа и разметки (18.11.2026) ---------- */
const byPrice = (a, b) => a.priceRub - b.priceRub;
// для «самый дешёвый» берём тарифы с помесячной оплатой: цена при оплате за год вперёд вводит в заблуждение
const monthly = (p) => !(p.term && p.term > 1);
const ALL = [...VISIBLE_PLANS].filter(monthly).sort(byPrice);
const RU = plansForGeo('ru').filter(monthly);
const MIN_ALL = ALL[0]?.priceRub;
const MIN_RU = RU[0]?.priceRub;
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
// таблица «цена по объёму памяти»: самый дешёвый в России, в мире и обычная цена
const RAM_ROWS = [1, 2, 4, 8].map((ram) => ({
  ram,
  ru: RU.find((p) => p.ram >= ram) || null,
  any: ALL.find((p) => p.ram >= ram) || null,
  med: median(VISIBLE_PLANS.filter((p) => p.ram === ram).map((p) => p.priceRub)),
}));
const provName = (p) => getProvider(p.providerSlug)?.name || p.providerSlug;
const tar = (n) => `${n} ${plural(n, 'тариф', 'тарифа', 'тарифов')}`;
const prv = (n) => `${n} ${plural(n, 'провайдера', 'провайдеров', 'провайдеров')}`;

export const metadata = {
  title: `Аренда VPS (ВПС) и VDS от ${price(MIN_ALL)}/мес: подбор под задачу | ServerCalc`,
  description: `Аренда VPS (ВПС) и VDS: подбор сервера под задачу, регион и бюджет. ${tar(STATS.plans)} от ${prv(STATS.providers)}, в России от ${price(MIN_RU)} в месяц, у каждой цены дата проверки (${dmy(STATS.verifiedAt)})`,
  alternates: { canonical: '/' },
};

const FAQ = [
  {
    // 08.11.2026: брендовый вопрос из опроса нейросетей, ответ из базы
    q: 'Что такое ServerCalc',
    a: `ServerCalc (servercalc.ru) это независимый справочный каталог виртуальных серверов (VPS, ВПС, VDS) с подбором под задачу. В базе ${STATS.plans} ${plural(STATS.plans, 'тариф', 'тарифа', 'тарифов')} от ${STATS.providers} ${plural(STATS.providers, 'провайдера', 'провайдеров', 'провайдеров')}, у каждой цены дата проверки, сверка с сайтами провайдеров раз в неделю. Мы не хостинг-провайдер и серверы не продаём: зарабатываем на партнёрских переходах. Порядок «Оптимально» считается по надёжности и цене, ${bonusDisclosure()}`,
  },
  {
    // 18.11.2026: прямой ответ с цифрами из базы, обновляется при каждой сборке
    q: 'Сколько стоит самый дешёвый VPS сейчас',
    a: `По нашей базе на ${dmy(STATS.verifiedAt)} самый дешёвый VPS с помесячной оплатой стоит ${price(MIN_ALL)} (${ALL[0] ? `${provName(ALL[0])}, ${ALL[0].cpu} ${plural(ALL[0].cpu, 'ядро', 'ядра', 'ядер')} и ${ALL[0].ram} ГБ памяти` : ''}), с сервером в России от ${price(MIN_RU)}${RU[0] ? ` (${provName(RU[0])})` : ''}. Обычная цена сервера с 2 ГБ памяти около ${price(RAM_ROWS[1].med)} в месяц. Цены сверяем с сайтами провайдеров раз в неделю, перед оплатой проверьте цену у провайдера`,
  },
  {
    q: 'Чем VPS отличается от виртуального хостинга и что такое VDS',
    a: 'На виртуальном хостинге вы делите один сервер и его настройки с другими сайтами. VPS это изолированный виртуальный сервер с собственной операционной системой, root-доступом и выделенными ресурсами: ядрами, памятью и диском. VPS и VDS на практике означают одно и то же, аббревиатуры прижились у разных провайдеров, а различий в технологии за ними обычно нет. Отдельный сервер берут, когда обычного хостинга уже мало: нужен свой софт, фоновые процессы или полный контроль над окружением',
  },
  {
    q: 'Как выбрать VPS под свою задачу',
    a: 'Отталкивайтесь от задачи, а не от тарифа. Сайту на WordPress обычно хватает 1–2 ядер и 2 ГБ памяти, интернет-магазину или 1С 2–4 ядра и 4 ГБ, базе данных под нагрузкой от 8 ГБ. Дальше определитесь с географией: для аудитории внутри России это локация в стране и меньшая задержка. Учтите тип диска: NVMe быстрее обычного SSD. Калькулятор на этой странице подбирает тарифы под заданные параметры и показывает, насколько каждый провайдер им соответствует',
  },
  {
    q: 'Сколько стоит аренда VPS',
    a: 'Простой сервер под сайт или бота начинается от нескольких сотен рублей в месяц, конфигурации под базы данных и нагруженные сервисы от полутора-двух тысяч. Цена зависит от числа ядер, объёма памяти, диска и локации: серверы в России за те же ресурсы обычно дороже европейских. В каталоге у каждого тарифа указана проверенная цена с датой сверки и пересчётом в рубли по курсу ЦБ',
  },
  {
    q: 'Как подбор решает, какой тариф выше',
    a: `Все условия подбора строгие: задача, регион, память, ядра, бюджет, способ оплаты и требования. В списке остаются только тарифы, которые проходят все выбранные условия, по каждому провайдеру самый дешёвый. Порядок задаёт сортировка: дешевле, цена за гигабайт памяти или больше памяти. Если ничего не нашлось, подбор подскажет, какое условие мешает. По умолчанию подбор сортирует «Оптимально»: 60% балла надёжность провайдера (опыт, договор для юрлиц, защита, бэкапы, оплата, сервисы кроме VPS), 40% цена, ${bonusDisclosure()}. Надёжность видна на каждой карточке числом из 10 вместе с причинами. Рекламный блок с пометкой «Реклама» стоит отдельно над списком. Другие сортировки: дешевле, цена за гигабайт памяти, больше памяти`,
  },
  {
    q: 'Почему в подборе есть провайдеры, с которыми у вас нет партнёрства',
    a: 'Потому что каталог без них был бы неполным. Провайдеры без партнёрских отношений участвуют в подборе наравне со всеми, ссылка на их сайт обычная, без партнёрской метки',
  },
  {
    q: 'Насколько актуальны цены',
    a: 'У каждого тарифа есть дата проверки, она видна на витрине. Раз в неделю мы сверяем каждую цену с прайсом на сайте провайдера. Тариф, который не проверялся дольше 30 дней, автоматически скрывается, а не показывается со старой ценой. Цены в валюте пересчитаны в рубли по курсу ЦБ. Если прайс провайдера мы ещё не проверили, цена не показывается вовсе: вместо неё стоит пометка, что данные уточняются',
  },
  {
    q: 'Вы берёте деньги с провайдеров за место в списке',
    a: 'Нет. Порядок в подборе задают условия запроса и формула «Оптимально» (надёжность и цена). Партнёры сервиса получают в ней прибавку 10 баллов, это описано в методологии. Над результатами может стоять один рекламный блок, он всегда с пометкой «Реклама» и в список не встроен',
  },
];

export default function HomePage() {
  const payload = calculatorPayload();
  const posts = allPosts().slice(0, 3);
  const providers = sortProvidersByPriority(PROVIDERS).filter((p) => minPriceOf(p.slug) != null).slice(0, 8);
  const top = ALL.length ? sortProvidersByPriority(PROVIDERS).filter((p) => RU.some((x) => x.providerSlug === p.slug)).slice(0, 10) : [];
  const ruCount = (code) => payload.plans.filter((p) => p.geo === code || (p.alsoIn || []).includes(code)).length;

  const intro = (
    <div className="cv5-intro">
      <p className="cv5-fresh">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        Цены проверены {ruDate(STATS.verifiedAt)} · {tar(STATS.plans)}
      </p>
      <h1>Подберём VPS под вашу задачу</h1>
      <p className="lead">
        Аренда VPS (ВПС) и VDS у {prv(STATS.providers)}: показываем только тарифы, которые проходят все
        условия, с проверенной ценой и датой проверки у каждого. В России от {price(MIN_RU)} в месяц
      </p>
    </div>
  );

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          '@id': `${SITE_URL}/#org`,
          name: SITE_NAME,
          alternateName: 'ServerCalc.ru',
          url: SITE_URL,
          logo: absUrl('/icon.svg'),
          email: 'info@servercalc.ru',
          description:
            'Независимый справочный каталог виртуальных серверов (VPS/ВПС) с подбором под задачу по открытой формуле и проверенной ценой у каждого тарифа',
          areaServed: 'RU',
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#site`,
          name: SITE_NAME,
          url: SITE_URL,
          inLanguage: 'ru-RU',
          publisher: { '@id': `${SITE_URL}/#org` },
          description:
            'Справочный каталог виртуальных серверов с подбором под задачу и датой проверки у каждой цены',
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': `${SITE_URL}/#page`,
          url: SITE_URL,
          name: 'Аренда VPS (ВПС) и VDS: подбор под задачу',
          inLanguage: 'ru-RU',
          isPartOf: { '@id': `${SITE_URL}/#site` },
          about: { '@type': 'Thing', name: 'Аренда VPS (виртуального сервера)' },
          dateModified: STATS.verifiedAt,
          mainEntity: {
            '@type': 'ItemList',
            name: `Провайдеры VPS в России: самый дешёвый тариф на ${dmy(STATS.verifiedAt)}`,
            numberOfItems: top.length,
            itemListElement: top.map((p, i) => {
              const plan = RU.find((x) => x.providerSlug === p.slug);
              return {
                '@type': 'ListItem',
                position: i + 1,
                url: absUrl(`/provajdery/${p.slug}`),
                name: `${p.name}: VPS от ${price(plan.priceRub)} в месяц`,
              };
            }),
          },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: `Калькулятор подбора VPS ${SITE_NAME}`,
          url: SITE_URL,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          inLanguage: 'ru-RU',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
          description:
            'Подбор виртуального сервера по задаче, ресурсам, географии и бюджету с проверенными ценами провайдеров',
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }}
      />

      {/* ---------- герой: подбор слева, ответ справа ---------- */}
      <section className="hero hero-v5 ink">
        <div className="wrap">
          <Calculator payload={payload} presetGeo="rossiya" campaign={CAMPAIGN.calculator} intro={intro} hero />
        </div>
      </section>

      {/* ---------- доверие одной полосой ---------- */}
      <section className="trust" aria-label="Почему подбору можно верить">
        <div className="wrap trust-grid">
          <div className="trust-item">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" /></svg>
            <div><b>Дата у каждой цены</b><span>Сверяем с прайсами раз в неделю, тариф без проверки {STATS.staleDays} дней скрываем</span></div>
          </div>
          <div className="trust-item">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16M6 16V9M10 16V5M14 16v-6M18 16V8" /></svg>
            <div><b>Открытая формула</b><span>Комиссия провайдера в подбор не входит, прибавка партнёрам раскрыта. <Link href="/metodologiya">Методология</Link></span></div>
          </div>
          <div className="trust-item">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="6" rx="1.5" /><rect x="4" y="14" width="16" height="6" rx="1.5" /><path d="M8 7h.01M8 17h.01" /></svg>
            <div><b>{STATS.providers} {plural(STATS.providers, 'провайдер', 'провайдера', 'провайдеров')}, {tar(STATS.plans)}</b><span>В том числе без партнёрства: без них каталог неполный</span></div>
          </div>
          <div className="trust-item">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12h4l3-8 4 16 3-8h6" /></svg>
            <div><b>Задержка из вашей сети</b><span>Замер до дата-центров прямо в браузере. <a href="#region">Измерить</a></span></div>
          </div>
        </div>
      </section>

      {/* ---------- короткий ответ с цифрами: для поиска и нейросетей ---------- */}
      <section className="section paper" aria-labelledby="otvet">
        <div className="wrap answer">
          <div className="answer-text">
            <h2 id="otvet">Сколько стоит аренда VPS в {new Date(STATS.verifiedAt).getUTCFullYear()} году</h2>
            <p>
              <strong>Коротко:</strong> по нашей базе на {dmy(STATS.verifiedAt)} самый дешёвый VPS с помесячной оплатой стоит{' '}
              <strong>{price(MIN_ALL)} в месяц</strong>, с сервером в России от <strong>{price(MIN_RU)}</strong>.
              Обычная цена сервера с 2 ГБ памяти около {price(RAM_ROWS[1].med)}, с 4 ГБ около {price(RAM_ROWS[2].med)} в месяц.
              Сравниваем {tar(STATS.plans)} от {prv(STATS.providers)}.
            </p>
            <p>
              Сайту на WordPress и Telegram-боту обычно хватает 1 ядра и 1–2 ГБ памяти, интернет-магазину и 1С нужно
              2–4 ядра и 4 ГБ, базе данных под нагрузкой от 8 ГБ. Для аудитории в России берите сервер в России:
              меньше задержка и оплата картой РФ. Подробнее в <Link href="/novosti/kak-vybrat-vps-hosting">чек-листе выбора VPS</Link>{' '}
              и <Link href="/indeks-cen-vps">индексе цен по месяцам</Link>
            </p>
          </div>
          <div className="tbl-wrap">
            <div className="tbl-scroll">
              <table className="tbl tbl-answer">
                <thead>
                  <tr><th>Память</th><th>В России от</th><th>Везде от</th><th style={{ textAlign: 'right' }}>Обычно</th></tr>
                </thead>
                <tbody>
                  {RAM_ROWS.map((r) => (
                    <tr key={r.ram}>
                      <td className="td-num"><Link href={`/deshevye-vps/${r.ram}-gb`} style={{ fontWeight: 600, textDecoration: 'none' }}>{r.ram} ГБ</Link></td>
                      <td>{r.ru ? <><b>{price(r.ru.priceRub)}</b> <span className="faint">{provName(r.ru)}</span></> : '—'}</td>
                      <td>{r.any ? <><b>{price(r.any.priceRub)}</b> <span className="faint">{provName(r.any)}</span></> : '—'}</td>
                      <td className="td-num" style={{ textAlign: 'right' }}>{r.med ? price(r.med) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="faint" style={{ margin: '10px 4px 0', fontSize: '0.8rem' }}>
              Цены в месяц на {dmy(STATS.verifiedAt)} при помесячной оплате: самый дешёвый тариф с памятью не меньше указанной. «Обычно»: медиана по базе
            </p>
          </div>
        </div>
      </section>

      {/* ---------- провайдеры ---------- */}
      <section className="section paper-alt" aria-labelledby="providers-h">
        <div className="wrap">
          <div className="between mb">
            <div>
              <h2 id="providers-h">Кто участвует в сравнении</h2>
              <p className="lead" style={{ margin: 0 }}>Обзор каждого провайдера: цены, лимиты, оплата из России и ограничения</p>
            </div>
            <Link href="/provajdery" className="btn btn-ghost">Все провайдеры</Link>
          </div>
          <div className="pv-grid">
            {providers.map((p) => {
              const q = qualityOf(p).score;
              const locs = [...new Set(plansOf(p.slug).map((x) => (x.location || '').replace(/\s*\(.*\)$/, '').trim()).filter(Boolean))].slice(0, 3);
              return (
                <Link key={p.slug} href={`/provajdery/${p.slug}`} className="pv-tile" style={{ '--c': p.color }}>
                  <span className="pv-tile-top">
                    {logoOf(p.slug) && <span className={logoOf(p.slug).dark ? 'pv-tile-logo rc5-dark' : 'pv-tile-logo'} aria-hidden="true"><img src={logoOf(p.slug).src} alt="" width="28" height="28" loading="lazy" decoding="async" /></span>}
                    <span className="pv-tile-name">{p.name}</span>
                  </span>
                  <span className="pv-tile-meta">от {price(minPriceOf(p.slug))} в месяц{locs.length ? ` · ${locs.join(', ')}` : ''}</span>
                  <span className="pv-tile-rel"><span className="rc5-meter" aria-hidden="true"><i style={{ width: `${Math.round(q * 100)}%` }} /></span>Надёжность {(q * 10).toFixed(1).replace('.', ',')}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- готовые подборы ---------- */}
      <section className="section paper" aria-label="Готовые подборы">
        <div className="wrap pick-grid">
          <div className="pick-card">
            <h2>Готовые подборы под задачу</h2>
            <div className="pick-links">
              {TASKS.map((t) => (
                <Link key={t.slug} href={`/vps-dlya/${t.slug}`}><TaskIcon slug={t.slug} />{t.name}</Link>
              ))}
            </div>
          </div>
          <div className="pick-card">
            <h2>Где разместить и как оплатить</h2>
            <div className="pick-links">
              {GEO_PAGES.map((g) => (
                <Link key={g.slug} href={`/vps/${g.slug}`}>{g.name} <small>{ruCount(g.code)}</small></Link>
              ))}
              {PAY_METHODS.map((m) => (
                <Link key={m.slug} href={`/vps-s-oplatoj/${m.slug}`}>Оплата {m.name}</Link>
              ))}
              <Link href="/deshevye-vps">Самые дешёвые VPS</Link>
              <Link href="/luchshie-vps-rossii">Лучшие VPS в России</Link>
              <Link href="/catalog">Все тарифы таблицей</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- материалы ---------- */}
      <section className="section paper-alt">
        <div className="wrap">
          <div className="between mb">
            <h2 style={{ margin: 0 }}>Что почитать перед выбором</h2>
            <Link href="/novosti" className="btn btn-ghost">Все материалы</Link>
          </div>
          <div className="cards cards-3">
            {posts.map((post) => (
              <Link key={post.slug} href={`/novosti/${post.slug}`} className="card">
                <div className="card-top">
                  <span className="badge">{rubricName(post.rubric)}</span>
                  <span className="faint">{ruDate(post.date)}</span>
                </div>
                <h3 style={{ fontSize: '1.1rem' }}>{post.title}</h3>
                <div className="card-foot">
                  <span className="faint">{post.minutes} мин чтения</span>
                  <span className="link-arrow" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- вопросы аккордеоном ---------- */}
      <section className="section paper" aria-labelledby="faq-h">
        <div className="wrap-narrow">
          <h2 id="faq-h">Что спрашивают чаще всего</h2>
          <div className="faq5 mt">
            {FAQ.map((item, i) => (
              <details key={item.q} open={i < 3}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-lg">
            <FreshnessRule />
          </div>
        </div>
      </section>
    </>
  );
}
