import Link from 'next/link';
import Calculator from '@/components/Calculator';
import ProviderCard from '@/components/ProviderCard';
import TaskIcon from '@/components/TaskIcon';
import JsonLd from '@/components/JsonLd';
import { FreshnessRule } from '@/components/Freshness';
import { calculatorPayload, TASKS, GEOS, PROVIDERS, STATS, minPriceOf, plansOf } from '@/lib/data';
import { allPosts, rubricName } from '@/lib/news';
import { price, plural, ruDate, num } from '@/lib/format';
import { CAMPAIGN } from '@/lib/utm';
import { absUrl, SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata = {
  title: 'Подберём VPS под вашу задачу',
  description:
    'Калькулятор подбора виртуального сервера: выберите задачу, ресурсы и географию, получите список провайдеров с объяснением, почему подходит именно этот тариф. У каждой цены есть дата проверки',
  alternates: { canonical: '/' },
};

const FAQ = [
  {
    q: 'Как считается процент соответствия',
    a: 'Каждый провайдер начинает с базовых 42 баллов, дальше добавляются или снимаются баллы за соответствие задаче, географию, закрытые требования, перекрытие ресурсов, попадание в бюджет и цену за гигабайт памяти относительно медианы по базе. Размер партнёрского вознаграждения в формулу не входит ни одним слагаемым, веса опубликованы на странице методологии',
  },
  {
    q: 'Почему в подборе есть провайдеры, с которыми у вас нет партнёрства',
    a: 'Потому что каталог без них был бы неполным. Провайдеры без партнёрских отношений участвуют в подборе наравне со всеми и помечены отдельно, ссылка на их сайт обычная, без партнёрской метки',
  },
  {
    q: 'Насколько актуальны цены',
    a: 'У каждого тарифа есть дата проверки, она видна на витрине. Тариф, который не проверялся дольше семи дней, автоматически скрывается, а не показывается со старой ценой. Цены сверены вручную с прайсами провайдеров 3 августа 2026 и пересчитаны в рубли по курсу ЦБ. У провайдеров, чей прайс мы ещё не проверили, цены не показываются вовсе: их 8 из 14',
  },
  {
    q: 'Вы берёте деньги с провайдеров за место в списке',
    a: 'Нет. Порядок в подборе определяется формулой, платного размещения в каталоге нет. Мы зарабатываем на партнёрских переходах, и это никак не влияет на позицию провайдера в выдаче калькулятора',
  },
];

export default function HomePage() {
  const payload = calculatorPayload();
  const posts = allPosts().slice(0, 3);
  const providers = [...PROVIDERS].sort((a, b) => {
    const pa = minPriceOf(a.slug) ?? Infinity;
    const pb = minPriceOf(b.slug) ?? Infinity;
    return pa - pb;
  });

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE_URL,
          inLanguage: 'ru-RU',
          description:
            'Справочный каталог виртуальных серверов с подбором под задачу и датой проверки у каждой цены',
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

      {/* ---------- герой и калькулятор ---------- */}
      <section className="hero ink">
        <div className="wrap hero-in">
          <div className="hero-grid">
            <div>
              <div className="eyebrow">
                <span className="label label-brass">Справочный каталог серверов</span>
              </div>
              <h1 className="display">
                Подберём сервер
                <br />
                под конкретную задачу
              </h1>
              <p className="lead">
                Считаем по задаче, ресурсам, географии и требованиям. Показываем не витрину, а
                объяснение: почему подошёл именно этот тариф и чего у провайдера нет
              </p>
            </div>
            <div className="hero-note">
              Размер партнёрского вознаграждения не входит в формулу подбора ни одним слагаемым.
              Провайдеры, с которыми у нас нет партнёрства, участвуют в подборе наравне со всеми и
              помечены отдельно
              <div className="mt">
                <Link href="/metodologiya" className="link-arrow">
                  Формула целиком
                </Link>
              </div>
            </div>
          </div>

          <div className="stat-row mb">
            <div className="stat">
              <div className="stat-v">{STATS.plans}</div>
              <div className="stat-k">{plural(STATS.plans, 'тариф с проверенной ценой', 'тарифа с проверенной ценой', 'тарифов с проверенной ценой')}</div>
            </div>
            <div className="stat">
              <div className="stat-v">{STATS.providers}</div>
              <div className="stat-k">провайдеров в сравнении</div>
            </div>
            <div className="stat">
              <div className="stat-v">{STATS.providers - STATS.partners}</div>
              <div className="stat-k">из них без партнёрства с нами</div>
            </div>
            <div className="stat">
              <div className="stat-v">{STATS.staleDays} дн</div>
              <div className="stat-k">срок, после которого цена скрывается</div>
            </div>
          </div>

          <Calculator payload={payload} campaign={CAMPAIGN.calculator} />

          <div style={{ height: 72 }} />
        </div>
      </section>

      {/* ---------- три принципа ---------- */}
      <section className="section paper">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Как устроен сервис</span>
          </div>
          <div className="cards" style={{ marginTop: 8 }}>
            <div className="card">
              <div className="card-top">
                <h3>Дата у каждой цены</h3>
                <span className="badge badge-brass">главное отличие</span>
              </div>
              <p className="dim" style={{ fontSize: '0.95rem' }}>
                У 11 из 13 проверенных нами каталогов даты проверки цен нет вообще. У нас она стоит
                у каждого тарифа, а устаревшие уходят с витрины автоматически
              </p>
              <div className="card-foot">
                <span className="faint">база проверена</span>
                <span className="mono">{ruDate(STATS.verifiedAt)}</span>
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <h3>Открытая формула</h3>
              </div>
              <p className="dim" style={{ fontSize: '0.95rem' }}>
                Веса подбора опубликованы: видно, сколько баллов даёт задача, география, требования
                и бюджет. Комиссия провайдера в расчёт не входит
              </p>
              <div className="card-foot">
                <Link href="/metodologiya" className="link-arrow">
                  Методология
                </Link>
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <h3>Одинаковая подача</h3>
              </div>
              <p className="dim" style={{ fontSize: '0.95rem' }}>
                Никаких закреплённых блоков, ярлыков «выбор редакции» и платных мест. Все карточки
                оформлены одинаково, в обзорах есть раздел с ограничениями
              </p>
              <div className="card-foot">
                <Link href="/kak-my-zarabatyvaem" className="link-arrow">
                  Как мы зарабатываем
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- задачи ---------- */}
      <section className="section paper-alt">
        <div className="wrap">
          <div className="between mb">
            <div>
              <div className="eyebrow">
                <span className="label">Подбор под задачу</span>
              </div>
              <h2>С чем должен справляться сервер</h2>
              <p className="lead">
                На каждой странице собрана рекомендуемая конфигурация с объяснением, почему именно
                столько ресурсов, и подходящие тарифы
              </p>
            </div>
          </div>
          <div className="cards cards-4">
            {TASKS.map((task) => (
              <Link key={task.slug} href={`/vps-dlya/${task.slug}`} className="card">
                <div className="card-top">
                  <span className="card-ico"><TaskIcon slug={task.slug} size={24} /></span>
                </div>
                <h3 style={{ fontSize: '1.05rem' }}>{task.name}</h3>
                <p className="faint" style={{ margin: 0 }}>
                  {task.cpu} × {task.ram} ГБ рекомендуем
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- география ---------- */}
      <section className="section paper">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">География</span>
          </div>
          <h2>Где разместить сервер</h2>
          <div className="cards cards-4 mt">
            {GEOS.map((geo) => (
              <Link key={geo.slug} href={`/vps/${geo.slug}`} className="card">
                <h3 style={{ fontSize: '1.05rem' }}>{geo.name}</h3>
                <p className="faint" style={{ margin: 0 }}>{geo.note}</p>
                <div className="card-foot">
                  <span className="faint">тарифов</span>
                  <span className="mono">{payload.plans.filter((p) => p.geo === geo.code).length}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- провайдеры ---------- */}
      <section className="section paper-alt">
        <div className="wrap">
          <div className="between mb">
            <div>
              <div className="eyebrow">
                <span className="label">Провайдеры</span>
              </div>
              <h2>Кто участвует в сравнении</h2>
              <p className="lead">
                Отсортированы по минимальной цене в базе. {STATS.providers - STATS.partners} из{' '}
                {STATS.providers} включены без партнёрских отношений: каталог без них был бы неполным
              </p>
            </div>
            <Link href="/provajdery" className="btn btn-ghost">
              Все провайдеры
            </Link>
          </div>
          <div className="cards cards-2">
            {providers.slice(0, 6).map((p) => (
              <ProviderCard key={p.slug} provider={p} minPrice={minPriceOf(p.slug)} campaign={CAMPAIGN.providers} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- каталог ---------- */}
      <section className="section ink">
        <div className="wrap">
          <div className="grid-2">
            <div>
              <div className="eyebrow">
                <span className="label label-brass">Каталог</span>
              </div>
              <h2>Все тарифы одной таблицей</h2>
              <p className="lead">
                Фильтры по географии, памяти, ядрам и требованиям. Сортировка по цене, по объёму
                памяти и по цене за гигабайт памяти: нормализованная метрика, которая показывает,
                где вы переплачиваете за бренд
              </p>
              <div className="row mt">
                <Link href="/catalog" className="btn btn-brass">
                  Открыть каталог
                </Link>
                <Link href="/metodologiya" className="btn btn-ghost">
                  Как считаем
                </Link>
              </div>
            </div>
            <div>
              <div className="notice">
                <strong>Правило свежести.</strong> Тариф, который не проверялся дольше{' '}
                {STATS.staleDays} дней, автоматически скрывается с витрины, а не показывается со
                старой ценой. Сейчас в базе {num(STATS.plansTotal)}{' '}
                {plural(STATS.plansTotal, 'тариф', 'тарифа', 'тарифов')}, из них скрыто{' '}
                {STATS.hidden}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- материалы ---------- */}
      <section className="section paper">
        <div className="wrap">
          <div className="between mb">
            <div>
              <div className="eyebrow">
                <span className="label">Разборы и новости</span>
              </div>
              <h2>Что почитать перед выбором</h2>
            </div>
            <Link href="/novosti" className="btn btn-ghost">
              Все материалы
            </Link>
          </div>
          <div className="cards cards-2">
            {posts.map((post) => (
              <Link key={post.slug} href={`/novosti/${post.slug}`} className="card">
                <div className="card-top">
                  <span className="badge">{rubricName(post.rubric)}</span>
                  <span className="faint mono">{ruDate(post.date)}</span>
                </div>
                <h3 style={{ fontSize: '1.1rem' }}>{post.title}</h3>
                <p className="faint" style={{ margin: 0 }}>{post.description}</p>
                <div className="card-foot">
                  <span className="faint">{post.minutes} мин чтения</span>
                  <span className="link-arrow" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- вопросы ---------- */}
      <section className="section paper-alt">
        <div className="wrap-narrow" style={{ padding: 0 }}>
          <div className="wrap">
            <div className="eyebrow">
              <span className="label">Частые вопросы</span>
            </div>
            <h2>Что спрашивают чаще всего</h2>
            <div className="stack-lg mt">
              {FAQ.map((item) => (
                <div key={item.q}>
                  <h3>{item.q}</h3>
                  <p className="dim">{item.a}</p>
                </div>
              ))}
            </div>
            <div className="mt-lg">
              <FreshnessRule />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
