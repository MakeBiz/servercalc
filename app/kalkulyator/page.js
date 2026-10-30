import Link from 'next/link';
import PageHead from '@/components/PageHead';
import Calculator from '@/components/Calculator';
import JsonLd from '@/components/JsonLd';
import { TASKS, VISIBLE_PLANS, STATS, calculatorPayload } from '@/lib/data';
import { CAMPAIGN } from '@/lib/utm';
import { price } from '@/lib/format';
import { absUrl } from '@/lib/site';
import { checkedAt, checkedLine, yearOf, cheapestWith, planName, priceText, dmy, termNote } from '@/lib/answer-first';

/**
 * «Онлайн калькулятор конфигурации сервера» (21.10.2026). Нейросети на этот вопрос
 * цитируют калькуляторы железа (brigo, serverflow); у нас калькулятор VPS с ценами
 * на дату сверки. Старый адрес /kalkulyator/ с 17.10 отдавал 404, теперь здесь страница
 */
const PATH = '/kalkulyator';
const CHECKED = checkedAt(VISIBLE_PLANS, STATS.verifiedAt);
const ROWS = TASKS.filter((t) => !t.noTariffs && t.cpu && t.ram).map((t) => ({ t, p: cheapestWith(VISIBLE_PLANS, { ram: t.ram, cpu: t.cpu }) }));

export const metadata = {
  title: { absolute: `Онлайн калькулятор конфигурации сервера ${yearOf(CHECKED)}: ядра, память и цена VPS` },
  description: `Калькулятор конфигурации виртуального сервера: задайте задачу, ядра, память, географию и бюджет и получите подходящие тарифы VPS с ценой, проверенной ${dmy(CHECKED)}`,
  alternates: { canonical: `${PATH}/` },
};

export default function CalcPage() {
  const payload = calculatorPayload();
  const site = ROWS.find((r) => r.t.slug === 'sajt');
  const shop = ROWS.find((r) => r.t.slug === 'magazin');
  const lead =
    'Задайте задачу, число ядер, память, географию и бюджет: калькулятор подберёт конфигурацию сервера и покажет подходящие тарифы VPS с ценой и датой проверки. ' +
    (site?.p ? `Например, сайту нужно ${site.t.cpu} ядро и ${site.t.ram} ГБ памяти, это от ${price(site.p.priceRub)} в месяц у ${planName(site.p)}${termNote(site.p) ? ` (${termNote(site.p)})` : ''}; ` : '') +
    (shop?.p ? `интернет-магазину ${shop.t.cpu} ядра и ${shop.t.ram} ГБ, от ${price(shop.p.priceRub)} в месяц у ${planName(shop.p)}${termNote(shop.p) ? ` (${termNote(shop.p)})` : ''}. ` : '') +
    `Цены проверены ${dmy(CHECKED)}.`;

  const faq = [
    {
      q: 'Как рассчитать конфигурацию сервера',
      a: 'Начните с задачи: она задаёт память, а память чаще всего упирается раньше процессора. Боту хватает 1 ядра и 1-2 ГБ, сайту с базой 2 ГБ, магазину и 1С 2 ядра и 4 ГБ, базе данных под нагрузкой и игровому серверу 4 ядра и 8 ГБ. Диск берите с запасом в 2-3 раза под данные и копии',
    },
    {
      q: 'Сколько стоит сервер под мою конфигурацию',
      a: `Таблица ниже показывает самый дешёвый тариф под типовую конфигурацию каждой задачи на ${dmy(CHECKED)}. Точный подбор под ваши ядра, память и географию делает калькулятор выше`,
    },
  ];

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Онлайн калькулятор конфигурации сервера',
          url: absUrl(PATH),
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          inLanguage: 'ru-RU',
          dateModified: CHECKED,
          offers: { '@type': 'Offer', price: 0, priceCurrency: 'RUB' },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />

      <PageHead
        eyebrow={checkedLine(CHECKED)}
        title="Онлайн калькулятор конфигурации сервера"
        lead={lead}
        crumbs={[{ href: PATH, label: 'Калькулятор конфигурации' }]}
      />

      <section className="section paper">
        <div className="wrap">
          <Calculator payload={payload} presetGeo="rossiya" campaign="kalkulyator" />
        </div>
      </section>

      <section className="section paper-alt">
        <div className="wrap">
          <h2>Типовые конфигурации и цена на {dmy(CHECKED)}</h2>
          <div className="tbl-wrap mt">
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr><th>Задача</th><th>Конфигурация</th><th>Самый дешёвый тариф</th><th style={{ textAlign: 'right' }}>Цена в месяц</th></tr>
                </thead>
                <tbody>
                  {ROWS.map(({ t, p }) => (
                    <tr key={t.slug}>
                      <td><Link href={`/vps-dlya/${t.slug}`} style={{ textDecoration: 'none', fontWeight: 600 }}>{t.name}</Link></td>
                      <td className="td-num">{t.cpu} × {t.ram} ГБ</td>
                      <td>{p ? planName(p) : 'нет проверенных тарифов'}</td>
                      <td className="td-price" style={{ textAlign: 'right' }}>{p ? priceText(p) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="stack-lg mt-lg">
            {faq.map((f) => (
              <div key={f.q}><h3>{f.q}</h3><p className="dim">{f.a}</p></div>
            ))}
          </div>
          <div className="row mt-lg">
            <Link href="/catalog" className="btn btn-ghost">Каталог тарифов</Link>
            <Link href="/luchshie-vps-rossii" className="btn btn-ghost">Рейтинг VPS в России</Link>
            <Link href="/metodologiya" className="btn btn-ghost">Как считается подбор</Link>
          </div>
        </div>
      </section>
    </>
  );
}
