import Link from 'next/link';
import OutLink from '@/components/OutLink';
import { price, termShort } from '@/lib/format';
import { FEATURE_NAMES, FEATURE_KEYS } from '@/lib/provider-stats';

/**
 * Две колонки провайдеров по одинаковым строкам (волна 04.11.2026, по образцу
 * servercalc.com): цены на 1/2/4/8 ГБ, регионы, возможности, оплата, переход
 */
function Cell({ plan }) {
  if (!plan) return <span className="faint">нет тарифа</span>;
  return (
    <>
      <span className="td-price">{price(plan.priceRub)}</span>{' '}
      <span className="faint">
        {plan.name}, {plan.cpu} × {plan.ram} ГБ
      </span>
      {termShort(plan) && <div className="faint" style={{ fontSize: '0.75rem' }}>{termShort(plan)}</div>}
    </>
  );
}

const yes = (v) => (v ? 'да' : 'нет');
const LABEL = { panel: 'Панель управления', ddos: 'Защита от DDoS', backup: 'Бэкапы', hourly: 'Почасовая оплата', testPeriod: 'Тестовый период' };

export default function PairTable({ A, B, campaign }) {
  const rows = [
    ['Самый дешёвый тариф', (s) => <Cell plan={s.entry} />],
    ['От 2 ГБ памяти', (s) => <Cell plan={s.gb2} />],
    ['От 4 ГБ памяти', (s) => <Cell plan={s.gb4} />],
    ['От 8 ГБ памяти', (s) => <Cell plan={s.gb8} />],
    ['Тарифов со свежей ценой', (s) => s.plans.length],
    ['Регионы с тарифами', (s) => s.regions.join(', ') || '—'],
    ['Валюта цены', (s) => (s.rub ? 'рубли' : s.currencies.join(', ') || '—')],
    ['NVMe хотя бы в одном тарифе', (s) => yes(s.nvme)],
    ...FEATURE_KEYS.map((k) => [LABEL[k] || FEATURE_NAMES[k], (s) => yes(s.features.includes(k))]),
    ['Оплата', (s) => s.pay.join(', ') || 'смотрите на сайте провайдера'],
    ['Предоплата', (s) => (s.allPrepay ? 'все тарифы за срок вперёд' : s.prepay ? 'у части тарифов' : 'помесячно')],
    ['Промокод', (s) => (s.promos.length ? s.promos.map((p) => p.code || p.title).join(', ') : 'нет')],
  ];
  return (
    <div className="tbl-wrap mt-lg">
      <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th />
              {[A, B].map((s) => (
                <th key={s.slug}>
                  <Link href={`/provajdery/${s.slug}/`} style={{ textDecoration: 'none' }}>{s.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label}>
                <td className="faint">{label}</td>
                <td>{fn(A)}</td>
                <td>{fn(B)}</td>
              </tr>
            ))}
            <tr>
              <td />
              {[A, B].map((s) => (
                <td key={s.slug}>
                  <OutLink provider={s.provider} campaign={campaign} content={s.slug} className="btn btn-ghost btn-sm">
                    {`Сайт ${s.name}`}
                  </OutLink>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
