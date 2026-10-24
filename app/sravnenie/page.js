import Link from 'next/link';
import PageHead from '@/components/PageHead';
import { PAIRS, side, pairTitle } from '@/lib/compare';
import { STATS } from '@/lib/data';
import { price, ruDate } from '@/lib/format';

export const metadata = {
  title: 'Сравнение VPS-провайдеров: кого выбрать',
  description:
    'Сравнения VPS-хостингов попарно по данным каталога: стартовая цена, локации, задачи, возможности и действующие промокоды. Цены сверены с сайтами провайдеров',
  alternates: { canonical: '/sravnenie' },
};

export default function ComparisonsPage() {
  return (
    <>
      <PageHead
        eyebrow="Сравнение"
        title="Сравнение VPS-провайдеров"
        lead={`Пары провайдеров, которые чаще всего выбирают между собой. Цифры берутся из каталога, цены проверены ${ruDate(STATS.verifiedAt)}`}
        crumbs={[{ href: '/sravnenie', label: 'Сравнение' }]}
      />
      <section className="section paper">
        <div className="wrap">
          <div className="tbl-wrap">
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Сравнение</th>
                    <th style={{ textAlign: 'right' }}>Старт первого</th>
                    <th style={{ textAlign: 'right' }}>Старт второго</th>
                  </tr>
                </thead>
                <tbody>
                  {PAIRS.map((p) => {
                    const a = side(p.a);
                    const b = side(p.b);
                    return (
                      <tr key={p.slug}>
                        <td style={{ fontWeight: 600 }}>
                          <Link href={`/sravnenie/${p.slug}`} className="link-brass">{pairTitle(p)}</Link>
                        </td>
                        <td className="td-price" style={{ textAlign: 'right' }}>{a.min ? `от ${price(a.min)}` : '—'}</td>
                        <td className="td-price" style={{ textAlign: 'right' }}>{b.min ? `от ${price(b.min)}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="faint mt">
            Нужной пары нет? Задайте задачу и бюджет в <Link href="/kalkulyator">калькуляторе</Link> или
            посмотрите <Link href="/luchshie-vps-rossii">рейтинг VPS России</Link>
          </p>
        </div>
      </section>
    </>
  );
}
