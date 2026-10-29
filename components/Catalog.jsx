'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import OutLink from './OutLink';
import { price, plural, ruDateShort, termShort } from '@/lib/format';
import { goal, GOALS } from '@/lib/metrika';
import { CAMPAIGN } from '@/lib/utm';
import { readParams, num, list, writeParams } from '@/lib/url-state';

const RAM_STEPS = [0, 1, 2, 4, 8, 16, 32];
const CPU_STEPS = [0, 1, 2, 4, 6, 8];
const PRICE_MAX = 12000;

// Сортировка кликом по заголовку таблицы: ключ и направление по умолчанию
const COLS = [
  { code: 'provider', label: 'Провайдер', dir: 1, fn: (a, b) => a.providerName.localeCompare(b.providerName, 'ru') || a.priceRub - b.priceRub },
  { code: 'name', label: 'Тариф', dir: 1, fn: (a, b) => a.name.localeCompare(b.name, 'ru') },
  { code: 'cpu', label: 'CPU', dir: -1, num: true, fn: (a, b) => a.cpu - b.cpu || b.priceRub - a.priceRub },
  { code: 'ram', label: 'Память', dir: -1, num: true, fn: (a, b) => a.ram - b.ram || b.priceRub - a.priceRub },
  { code: 'disk', label: 'Диск', dir: -1, num: true, fn: (a, b) => a.disk - b.disk || b.priceRub - a.priceRub },
  { code: 'geo', label: 'Локация', dir: 1, fn: (a, b) => (a.geoName || '').localeCompare(b.geoName || '', 'ru') || a.priceRub - b.priceRub },
  { code: 'perGb', label: 'Цена за ГБ', dir: 1, num: true, fn: (a, b) => a.priceRub / a.ram - b.priceRub / b.ram },
  { code: 'checked', label: 'Проверено', dir: -1, num: true, fn: (a, b) => String(a.verifiedAt).localeCompare(String(b.verifiedAt)) },
  { code: 'price', label: 'Цена', dir: 1, num: true, right: true, fn: (a, b) => a.priceRub - b.priceRub },
];
const SORTS = COLS;
const PRICE_STEPS = [300, 500, 1000, 2000, 5000];

export default function Catalog({ rows, providers, geos, requirements, presetGeo = null }) {
  const [geo, setGeo] = useState(presetGeo);
  const [minRam, setMinRam] = useState(0);
  const [minCpu, setMinCpu] = useState(0);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [reqs, setReqs] = useState([]);
  const [sort, setSort] = useState('price');
  const [dir, setDir] = useState(1);

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
    if (p.get('dir') === 'desc') setDir(-1);
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
      dir: dir === -1 ? 'desc' : null,
    });
  }, [geo, minRam, minCpu, maxPrice, reqs, sort, dir, presetGeo]);

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
    const s = SORTS.find((x) => x.code === sort) || SORTS[SORTS.length - 1];
    return [...list].sort((a, b) => dir * s.fn(a, b));
  }, [rows, geo, minRam, minCpu, maxPrice, reqs, sort, dir]);

  function sortBy(code) {
    const col = COLS.find((c) => c.code === code);
    if (sort === code) setDir((d) => -d);
    else { setSort(code); setDir(col.dir); }
    touch('sort', code);
  }

  function reset() {
    setGeo(presetGeo);
    setMinRam(0);
    setMinCpu(0);
    setMaxPrice(PRICE_MAX);
    setReqs([]);
    setSort('price');
    setDir(1);
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
      <div className="cat-filters">
        <div className="cat-row" role="group" aria-label="География">
          <button type="button" className={geo === null ? 'qchip on' : 'qchip'} aria-pressed={geo === null} onClick={() => { setGeo(null); touch('geo', 'all'); }}>
            Все страны
          </button>
          {geos.map((g) => (
            <button key={g.code} type="button" className={geo === g.code ? 'qchip on' : 'qchip'} aria-pressed={geo === g.code} onClick={() => { setGeo(g.code); touch('geo', g.code); }}>
              {g.name}
            </button>
          ))}
        </div>
        <div className="cat-row" role="group" aria-label="Требования">
          {requirements.map((r) => (
            <button key={r.code} type="button" className={reqs.includes(r.code) ? 'qchip on' : 'qchip'} aria-pressed={reqs.includes(r.code)} onClick={() => toggleReq(r.code)} title={r.note}>
              {r.short}
            </button>
          ))}
        </div>
        <div className="cat-row cat-selects">
          <label className="fsel">
            <span>Память</span>
            <select value={minRam} onChange={(e) => { setMinRam(Number(e.target.value)); touch('ram', e.target.value); }}>
              {RAM_STEPS.map((v) => <option key={v} value={v}>{v === 0 ? 'любая' : `от ${v} ГБ`}</option>)}
            </select>
          </label>
          <label className="fsel">
            <span>Ядра</span>
            <select value={minCpu} onChange={(e) => { setMinCpu(Number(e.target.value)); touch('cpu', e.target.value); }}>
              {CPU_STEPS.map((v) => <option key={v} value={v}>{v === 0 ? 'любое' : `от ${v}`}</option>)}
            </select>
          </label>
          <label className="fsel">
            <span>Цена в месяц</span>
            <select value={PRICE_STEPS.includes(maxPrice) ? maxPrice : PRICE_MAX} onChange={(e) => { setMaxPrice(Number(e.target.value)); touch('price', e.target.value); }}>
              <option value={PRICE_MAX}>любая</option>
              {PRICE_STEPS.map((v) => <option key={v} value={v}>до {price(v)}</option>)}
            </select>
          </label>
          <span className="cat-count">
            {filtered.length} {plural(filtered.length, 'тариф', 'тарифа', 'тарифов')} из {rows.length}
          </span>
          <button type="button" className="cat-reset" onClick={reset}>Сбросить</button>
        </div>
      </div>

      <div className="tbl-wrap">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                {COLS.map((c) => {
                  const on = sort === c.code;
                  return (
                    <th key={c.code} aria-sort={on ? (dir === 1 ? 'ascending' : 'descending') : 'none'} style={c.right ? { textAlign: 'right' } : undefined}>
                      <button type="button" className={on ? 'th-sort on' : 'th-sort'} onClick={() => sortBy(c.code)} title="Сортировать">
                        {c.label}
                        <span className="th-arrow" aria-hidden="true">{on ? (dir === 1 ? '↑' : '↓') : '↕'}</span>
                      </button>
                    </th>
                  );
                })}
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
                  <td className="td-price" style={{ textAlign: 'right' }}>{price(r.priceRub)}{termShort(r) && <div className="faint" style={{ fontSize: '0.75rem', fontWeight: 400 }}>{termShort(r)}</div>}</td>
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
