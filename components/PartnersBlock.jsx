'use client';

/**
 * Блок «Партнёры ServerCalc» (09.11.2026, решение Антона): над результатами подбора и над списками.
 * Пометка «Реклама» обязательна. В блоке у каждого партнёра лучший тариф под выбранные условия,
 * партнёров без подходящего тарифа не показываем. Общий список ниже идёт своим порядком и не меняется
 */
import Link from 'next/link';
import OutLink from './OutLink';
import { price, plural } from '@/lib/format';

const coresWord = (n) => plural(n, 'ядро', 'ядра', 'ядер');

export default function PartnersBlock({ items, label = 'Партнёры ServerCalc', adLabel = 'Реклама', campaign = 'partners', note = null }) {
  if (!items || !items.length) return null;
  return (
    <section className="pblock" aria-label={`${adLabel}. ${label}`}>
      <div className="pblock-head">
        <span className="adbar-label">{adLabel}</span>
        <b>{label}</b>
        {note && <span className="pblock-note">{note}</span>}
      </div>
      <div className="pblock-grid">
        {[...items].sort((a, b) => (a.other ? 1 : 0) - (b.other ? 1 : 0)).map(({ provider: pr, plan: p, why, from, other }) => {
          const ini = pr.name.replace(/[^A-Za-zА-Яа-я0-9]/g, '').slice(0, 2).toUpperCase();
          const where = p?.location ? String(p.location).split(',')[0].replace(/\s*\(.*$/, '') : null;
          return (
            <div className="pcard" key={pr.slug}>
              <div className="pcard-top">
                <span className="res-logo pcard-logo" style={{ background: pr.color }} aria-hidden="true">{ini}</span>
                <Link href={`/provajdery/${pr.slug}`} className="pcard-name">{pr.name}</Link>
                <span className="pcard-price">
                  {p ? price(p.priceRub) : from ? `от ${price(from)}` : ''}
                  <small> в месяц</small>
                </span>
              </div>
              {p && (
                <div className="pcard-spec">
                  {p.cpu} {coresWord(p.cpu)}, {p.ram} ГБ, {p.disk} ГБ {p.diskType}{where ? ` · ${where}` : ''}
                </div>
              )}
              {other && <span className="pcard-other">в другом регионе</span>}
              {why && <p className="pcard-why">{why}</p>}
              <OutLink provider={pr} campaign={campaign} content={pr.slug} goalName="partner_click" className="btn btn-brass btn-sm pcard-cta">
                Перейти в {pr.name}
              </OutLink>
            </div>
          );
        })}
      </div>
    </section>
  );
}
