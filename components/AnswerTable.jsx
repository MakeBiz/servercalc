import Link from 'next/link';
import OutLink from '@/components/OutLink';
import { getProvider } from '@/lib/data';
import { price, ruDateShort, termShort } from '@/lib/format';
import { placeOf } from '@/lib/answer-first';

/**
 * Таблица тарифов для посадочных страниц (перенос с servercalc.com, 29.10.2026):
 * провайдер и тариф, конфигурация, где стоит, дата проверки, цена с условием оплаты
 */
export default function AnswerTable({ plans, campaign, highlight, geo }) {
  return (
    <div className="tbl-wrap">
      <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Провайдер и тариф</th>
              <th>CPU × RAM</th>
              <th>Диск</th>
              <th>Где</th>
              <th>Проверено</th>
              <th style={{ textAlign: 'right' }}>Цена в месяц</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {plans.map((p, i) => {
              const provider = getProvider(p.providerSlug);
              return (
                <tr key={p.id} style={highlight && highlight(p) ? { fontWeight: 600 } : undefined}>
                  <td className="td-num faint">{String(i + 1).padStart(2, '0')}</td>
                  <td>
                    <Link href={`/provajdery/${p.providerSlug}`} style={{ textDecoration: 'none', fontWeight: 600 }}>
                      {provider?.name || p.providerSlug}
                    </Link>{' '}
                    <span className="dim">{p.name}</span>
                  </td>
                  <td className="td-num">{p.cpu} × {p.ram} ГБ</td>
                  <td className="td-num">{p.disk} ГБ <span className="faint">{p.diskType}</span></td>
                  <td className="faint">{placeOf(p, geo)}</td>
                  <td className="td-num faint">{ruDateShort(p.verifiedAt)}</td>
                  <td className="td-price" style={{ textAlign: 'right' }}>
                    {price(p.priceRub)}
                    {termShort(p) && <div className="faint" style={{ fontSize: '0.75rem', fontWeight: 400 }}>{termShort(p)}</div>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {provider && (
                      <OutLink provider={provider} campaign={campaign} content={p.providerSlug} className="btn btn-ghost btn-sm">
                        Открыть
                      </OutLink>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
