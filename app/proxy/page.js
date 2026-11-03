import Link from 'next/link';
import PageHead from '@/components/PageHead';
import OutLink from '@/components/OutLink';
import JsonLd from '@/components/JsonLd';
import SimpleTable from '@/components/SimpleTable';
import FaqBlock from '@/components/FaqBlock';
import { PROXY, asPartner } from '@/lib/partners-extra';
import { ruDate } from '@/lib/format';
import { absUrl } from '@/lib/site';

const H = PROXY.hub;

export const metadata = {
  title: { absolute: H.title },
  description: H.description,
  alternates: { canonical: '/proxy' },
};

const COMPARE = {
  cols: ['Что сравниваем', 'Proxy6', 'Proxyline', 'Astroproxy'],
  rows: [
    ['IPv4 индивидуальный, месяц', '120 ₽', '$1,77', ''],
    ['IPv4 shared, месяц', '33 ₽', '$0,99', ''],
    ['IPv6, месяц', '20,66 ₽', '$0,51', ''],
    ['Резидентные, 1 ГБ', '', '', '$7,30 + порт'],
    ['Мобильные, 1 ГБ', '', '', '$13,14 + порт'],
    ['Минимальный срок', '7 дней (IPv6 3 дня)', '5 дней', 'от 100 МБ'],
    ['Российские IP', 'есть', 'есть', 'не указано'],
    ['Протоколы', 'HTTP(S), SOCKS5', 'HTTP(S), SOCKS5', 'HTTP(S), SOCKS5'],
    ['Возврат', '1 сутки', '48 часов', '14 дней'],
    ['Валюта цен', 'рубли', 'доллары', 'доллары'],
  ],
};

export default function ProxyHub() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Прокси-сервисы',
          numberOfItems: PROXY.providers.length,
          itemListElement: PROXY.providers.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: absUrl(`/proxy/${p.slug}/`), name: p.h1 })),
        }}
      />
      <PageHead
        eyebrow="Прокси"
        title={H.h1}
        lead={H.answer}
        crumbs={[{ href: '/proxy', label: 'Прокси' }]}
        badges={<span className="badge">цены на {ruDate(PROXY.verifiedAt)}</span>}
      >
        <p className="disclosure" style={{ maxWidth: 640 }}>
          Ссылки на сервисы партнёрские: если вы оплатите прокси, мы получим вознаграждение. Цена для вас не меняется, на порядок в таблице это не влияет
        </p>
      </PageHead>

      <section className="section paper">
        <div className="wrap">
          <div className="grid-2">
            <div className="prose">
              <h2>Тип прокси важнее сервиса</h2>
              {H.intro.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
            <div>
              <div className="eyebrow">
                <span className="label">Для чего берут</span>
              </div>
              <ul className="list-check">
                {H.uses.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section paper-alt" id="ceny">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Сравнение</span>
          </div>
          <h2>Цены трёх сервисов рядом</h2>
          <p className="faint" style={{ marginBottom: 20 }}>Минимальная цена за 1 прокси или 1 ГБ с официальных сайтов на {ruDate(PROXY.verifiedAt)}</p>
          <SimpleTable cols={COMPARE.cols} rows={COMPARE.rows} />
        </div>
      </section>

      <section className="section paper">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Сервисы</span>
          </div>
          <h2 style={{ marginBottom: 20 }}>Обзоры с ценами по срокам</h2>
          <div className="cards cards-2">
            {PROXY.providers.map((p) => (
              <div key={p.slug} className="card">
                <div className="card-top">
                  <span className="badge">{p.name}</span>
                </div>
                <h3 style={{ fontSize: '1.1rem' }}>
                  <Link href={`/proxy/${p.slug}`}>{p.h1}</Link>
                </h3>
                <p className="faint" style={{ margin: 0 }}>{p.short}</p>
                <div className="row mt" style={{ marginTop: 14 }}>
                  <OutLink provider={asPartner(p)} campaign="proxy_hub" className="btn btn-brass btn-sm">
                    Перейти в {p.name}
                  </OutLink>
                  <Link href={`/proxy/${p.slug}`} className="btn btn-ghost btn-sm">
                    Обзор
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section paper-alt">
        <div className="wrap">
          <div className="grid-2">
            <div className="prose">
              <h2>Что это значит для бюджета</h2>
              {H.budget.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
            <div>
              <div className="eyebrow">
                <span className="label">Ограничения</span>
              </div>
              <ul className="list-check list-minus">
                {H.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <FaqBlock title="Частые вопросы про покупку прокси" faq={H.faq} />

      <section className="section-tight paper-alt">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Читайте также</span>
          </div>
          <div className="chips">
            {H.links.map((l) => (
              <Link key={l.href} href={l.href} className="chip chip-light">
                {l.label}
              </Link>
            ))}
          </div>
          <p className="faint mt">
            Цены и условия сняты с официальных сайтов Proxy6, Proxyline и Astroproxy {ruDate(PROXY.verifiedAt)}. Сервисы меняют их без предупреждения, итог показывает страница заказа
          </p>
        </div>
      </section>
    </>
  );
}
