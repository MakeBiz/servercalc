'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import OutLink from './OutLink';
import { price, plural, ruDateShort } from '@/lib/format';
import { goal, GOALS } from '@/lib/metrika';
import { CAMPAIGN } from '@/lib/utm';
import { readParams, num, list, writeParams } from '@/lib/url-state';

const RAM_STEPS = [0, 1, 2, 4, 8, 16, 32];
const CPU_STEPS = [0, 1, 2, 4, 6, 8];
const PRICE_MAX = 12000;

const SORTS = [
  { code: 'price', label: 'Дешевле', fn: (a, b) => a.priceRub - b.priceRub },
  { code: 'ram', label: 'Больше памяти', fn: (a, b) => b.ram - a.ram || a.priceRub - b.priceRub },
  { code: 'cpu', label: 'Больше ядер', fn: (a, b) => b.cpu - a.cpu || a.priceRub - b.priceRub },
  {
    code: 'perGb',
    label: 'Цена за ГБ памяти',
    fn: (a, b) => a.priceRub / a.ram - b.priceRub / b.ram,
  },
];

export default function Catalog({ rows, providers, geos, requirements, presetGeo = null }) {
  const [geo, setGeo] = useState(presetGeo);
  const [minRam, setMinRam] = useState(0);
  const [minCpu, setMinCpu] = useState(0);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [reqs, setReqs] = useState([]);
  const [sort, setSort] = useState('price');

  const providerBySlug = useMemo(
    () => Object.fromEntries(providers.map((p) => [p.slug, p])),
    [providers]
  );

  const restored = useRef(false);

  // фильтры каталога восстанавливаются из адреса и переживают перезагрузку
  useEffect(() => {
    const p = readParams();
    const g = p.get('geo');
    if (g && geos.some((x) => x.code === g)) setGeo(g);
    const r = num(p, 'ram', null);
    if (r !== null && RAM_STEPS.includes(r)) setMinRam(r);
    const c = num(p, 'cpu', null);
    if (c !== null && CPU_STEPS.includes(c)) setMinCpu(c);
    const pr = num(p, 'price', null);
    if (pr !== null && pr > 0 && pr <= PRICE_MAX) setMaxPrice(pr);
    const rq = list(p, 'req');
    if (rq) setReqs(rq.filter((code) => requirements.some((x) => x.code === code)));
    const s = p.get('sort');
    if (s && SORTS.some((x) => x.code === s)) setSort(s);
    restored.current = true;
  }, [geos, requirements]);

  useEffect(() => {
    if (!restored.current) return;
    writeParams({
      geo: geo && geo !== presetGeo ? geo : null,
      ram: minRam || null,
      cpu: minCpu || null,
      price: maxPrice < PRICE_MAX ? maxPrice : null,
      req: reqs.length ? reqs.join(',') : null,
      sort: sort !== 'price' ? sort : null,
    });
  }, [geo, minRam, minCpu, maxPrice, reqs, sort, presetGeo]);

  function touch(field, value) {
    goal(GOALS.catalogFilter, { field, value: String(value) });
  }

  function toggleReq(code) {
    setReqs((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
    touch('requirement', code);
  }

  const filtered = useMemo(() => {
    const list = rows.filter((r) => {
      if (geo && r.geo !== geo) return false;
      if (r.ram < minRam) return false;
      if (r.cpu < minCpu) return false;
      if (maxPrice < PRICE_MAX && r.priceRub > maxPrice) return false;
      for (const code of reqs) {
        if (code === 'nvme') {
          if (r.diskType !== 'NVMe') return false;
        } else if (!r.requirements.includes(code)) return false;
      }
      return true;
    });
    const s = SORTS.find((x) => x.code === sort) || SORTS[0];
    return [...list].sort(s.fn);
  }, [rows, geo, minRam, minCpu, maxPrice, reqs, sort]);

  function reset() {
    setGeo(presetGeo);
    setMinRam(0);
    setMinCpu(0);
    setMaxPrice(PRICE_MAX);
    setReqs([]);
    setSort('price');
  }

  /**
   * Когда выдача пуста, человеку нужно знать не «ничего не найдено»,
   * а какой именно фильтр всё отсёк. Поочерёдно снимаем каждый активный
   * фильтр и смотрим, какой из них возвращает больше всего тарифов
   */
  const blocker = useMemo(() => {
    if (filtered.length > 0) return null;
    const pass = (r, skip) => {
      if (skip !== 'geo' && geo && r.geo !== geo) return false;
      if (skip !== 'ram' && r.ram < minRam) return false;
      if (skip !== 'cpu' && r.cpu < minCpu) return false;
      if (skip !== 'price' && maxPrice < PRICE_MAX && r.priceRub > maxPrice) return false;
      for (const code of reqs) {
        if (skip === `req:${code}`) continue;
        if (code === 'nvme') {
          if (r.diskType !== 'NVMe') return false;
        } else if (!r.requirements.includes(code)) return false;
      }
      return true;
    };
    const candidates = [];
    if (geo) candidates.push({ key: 'geo', label: `география: ${geos.find((g) => g.code === geo)?.name || geo}`, clear: () => setGeo(null) });
    if (minRam > 0) candidates.push({ key: 'ram', label: `память от ${minRam} ГБ`, clear: () => setMinRam(0) });
    if (minCpu > 0) candidates.push({ key: 'cpu', label: `ядер от ${minCpu}`, clear: () => setMinCpu(0) });
    if (maxPrice < PRICE_MAX) candidates.push({ key: 'price', label: `цена до ${maxPrice} ₽`, clear: () => setMaxPrice(PRICE_MAX) });
    reqs.forEach((code) => {
      const name = requirements.find((r) => r.code === code)?.short || code;
      candidates.push({ key: `req:${code}`, label: `требование «${name}»`, clear: () => toggleReq(code) });
    });
    const scored = candidates
      .map((c) => ({ ...c, gain: rows.filter((r) => pass(r, c.key)).length }))
      .filter((c) => c.gain > 0)
      .sort((a, b) => b.gain - a.gain);
    return scored[0] || null;
  }, [filtered.length, rows, geo, minRam, minCpu, maxPrice, reqs, geos, requirements]);

  return (
    <div>
      <div className="filters">
        <div className="field">
          <span className="label">География</span>
          <div className="chips">
            <button
              type="button"
              className={geo === null ? 'chip chip-light on' : 'chip chip-light'}
              aria-pressed={geo === null}
              onClick={() => { setGeo(null); touch('geo', 'all'); }}
            >
              Все
            </button>
            {geos.map((g) => (
              <button
                key={g.code}
                type="button"
                className={geo === g.code ? 'chip chip-light on' : 'chip chip-light'}
                aria-pressed={geo === g.code}
                onClick={() => { setGeo(g.code); touch('geo', g.code); }}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label">Требования</span>
          <div className="chips">
            {requirements.map((r) => (
              <button
                key={r.code}
                type="button"
                className={reqs.includes(r.code) ? 'chip chip-light on' : 'chip chip-light'}
                aria-pressed={reqs.includes(r.code)}
                onClick={() => toggleReq(r.code)}
                title={r.note}
              >
                {r.short}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-head">
            <span className="label">Минимум памяти</span>
            <span className="field-val" style={{ color: 'var(--brass-deep)' }}>
              {minRam === 0 ? 'любая' : `от ${minRam} ГБ`}
            </span>
          </div>
          <input
            className="range range-light"
            type="range"
            min={0}
            max={RAM_STEPS.length - 1}
            value={RAM_STEPS.indexOf(minRam)}
            onChange={(e) => setMinRam(RAM_STEPS[Number(e.target.value)])}
            onMouseUp={() => touch('ram', minRam)}
            aria-label="Минимальный объём памяти"
          />
          <div className="field-head" style={{ marginTop: 14, marginBottom: 0 }}>
            <span className="label">Минимум ядер</span>
            <span className="field-val" style={{ color: 'var(--brass-deep)' }}>
              {minCpu === 0 ? 'любое' : `от ${minCpu}`}
            </span>
          </div>
          <input
            className="range range-light"
            type="range"
            min={0}
            max={CPU_STEPS.length - 1}
            value={CPU_STEPS.indexOf(minCpu)}
            onChange={(e) => setMinCpu(CPU_STEPS[Number(e.target.value)])}
            onMouseUp={() => touch('cpu', minCpu)}
            aria-label="Минимальное число ядер"
          />
        </div>

        <div className="field">
          <div className="field-head">
            <span className="label">Цена в месяц</span>
            <span className="field-val" style={{ color: 'var(--brass-deep)' }}>
              {maxPrice >= PRICE_MAX ? 'любая' : `до ${price(maxPrice)}`}
            </span>
          </div>
          <input
            className="range range-light"
            type="range"
            min={200}
            max={PRICE_MAX}
            step={100}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            onMouseUp={() => touch('price', maxPrice)}
            aria-label="Максимальная цена"
          />
          <div className="range-scale" style={{ color: 'var(--text-faint)' }}>
            <span>200 ₽</span>
            <span>без лимита</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={reset}>
            Сбросить фильтры
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <span className="dim">
          {filtered.length} {plural(filtered.length, 'тариф', 'тарифа', 'тарифов')} из {rows.length}
        </span>
        <div className="chips">
          <span className="label" style={{ margin: 0, alignSelf: 'center' }}>Сортировка</span>
          {SORTS.map((s) => (
            <button
              key={s.code}
              type="button"
              className={sort === s.code ? 'chip chip-light on' : 'chip chip-light'}
              aria-pressed={sort === s.code}
              onClick={() => { setSort(s.code); touch('sort', s.code); }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

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
                <th>Локация</th>
                <th>Цена за ГБ</th>
                <th>Проверено</th>
                <th style={{ textAlign: 'right' }}>Цена</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/provajdery/${r.providerSlug}`} style={{ textDecoration: 'none', fontWeight: 600 }}>
                      {r.providerName}
                    </Link>
                    {!r.partner && (
                      <div className="faint" style={{ fontSize: '0.72rem' }}>без партнёрства</div>
                    )}
                  </td>
                  <td>{r.name}</td>
                  <td className="td-num">{r.cpu}</td>
                  <td className="td-num">{r.ram} ГБ</td>
                  <td className="td-num">
                    {r.disk} ГБ <span className="faint">{r.diskType}</span>
                  </td>
                  <td>{r.geoName}</td>
                  <td className="td-num">{price(r.priceRub / r.ram)}</td>
                  <td className="td-num faint">{ruDateShort(r.verifiedAt)}</td>
                  <td className="td-price" style={{ textAlign: 'right' }}>{price(r.priceRub)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {providerBySlug[r.providerSlug] && (
                      <OutLink
                        provider={providerBySlug[r.providerSlug]}
                        campaign={CAMPAIGN.catalog}
                        content={r.id}
                        className="btn btn-ghost btn-sm"
                      >
                        Открыть
                      </OutLink>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="dim" style={{ padding: 28, textAlign: 'center' }}>
                    {blocker ? (
                      <>
                        Под такие фильтры в базе ничего нет: всё отсекает {blocker.label}.{' '}
                        {blocker.gain} {plural(blocker.gain, 'тариф найдётся', 'тарифа найдётся', 'тарифов найдётся')},
                        если снять этот фильтр
                        <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
                          <button type="button" className="btn btn-brass btn-sm" onClick={blocker.clear}>
                            Снять этот фильтр
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
                            Сбросить все
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        Под такие фильтры в базе ничего нет, и снятие одного фильтра не помогает
                        <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
                          <button type="button" className="btn btn-brass btn-sm" onClick={reset}>
                            Сбросить все фильтры
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="disclosure mt">
        Часть переходов партнёрские: при оформлении услуги мы получаем вознаграждение, цена для вас
        не меняется. Порядок строк задаётся выбранной сортировкой, платных мест в таблице нет,{' '}
        <Link href="/metodologiya">формула подбора открыта</Link>
      </p>
    </div>
  );
}
