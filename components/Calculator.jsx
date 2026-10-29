'use client';

/**
 * Подбор сервера, вариант «одна строка фильтров, всё строго» (30.10.2026, решение Антона).
 *
 * - Все условия строгие: показываем только тарифы, которые проходят каждое из них.
 *   «До 500 ₽» значит до 500 ₽, «криптовалюта» значит провайдер её принимает.
 * - Скрытых настроек нет: по умолчанию ничего не выбрано. Задача подставляет
 *   рекомендуемые память и ядра видимыми плашками, их можно снять.
 * - Всё выбранное видно плашками с крестиком и снимается по одному или разом.
 * - Если ничего не нашлось, говорим, какое условие мешает, и сколько найдётся без него.
 * - Порядок: дешевле, цена за гигабайт памяти или больше памяти. Партнёрство на порядок не влияет.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import OutLink from './OutLink';
import TaskIcon from './TaskIcon';
import { measureGeo, PING_GEOS } from '@/lib/ping';
import { price, plural } from '@/lib/format';
import { goal, GOALS } from '@/lib/metrika';
import { CAMPAIGN } from '@/lib/utm';
import { readParams, num, list, writeParams } from '@/lib/url-state';

const RAM_OPTS = [0, 1, 2, 4, 8, 16, 32];
const CPU_OPTS = [0, 1, 2, 4, 8];
const BUDGET_OPTS = [0, 300, 500, 1000, 2000, 5000];
const PAYS = [
  { key: 'mir', label: 'Карта МИР' },
  { key: 'sbp', label: 'СБП' },
  { key: 'crypto', label: 'Криптовалюта' },
];
const EXTRAS = [
  { key: 'nvme', label: 'NVMe' },
  { key: 'hourly', label: 'Почасовая оплата' },
  { key: 'testPeriod', label: 'Тест-период' },
  { key: 'ddos', label: 'Защита от DDoS' },
  { key: 'win', label: 'Windows' },
  { key: 'ru', label: 'Российский провайдер' },
];
const SORTS = [
  { key: 'price', label: 'Дешевле' },
  { key: 'perGb', label: 'Цена за ГБ' },
  { key: 'ram', label: 'Больше памяти' },
];

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const coresWord = (n) => plural(n, 'ядро', 'ядра', 'ядер');
// после «от»: от 1 ядра, от 2 ядер
const coresFrom = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'ядра' : 'ядер');

function planPasses(p, f) {
  if (f.geoCode && !(p.geo === f.geoCode || (p.alsoIn || []).includes(f.geoCode))) return false;
  if (f.ram && p.ram < f.ram) return false;
  if (f.cpu && p.cpu < f.cpu) return false;
  if (f.budget && p.priceRub > f.budget) return false;
  if (f.extras.includes('nvme') && p.diskType !== 'NVMe') return false;
  return true;
}

function providerPasses(pr, f) {
  if (f.task && !(pr.tasks || []).includes(f.task)) return false;
  for (const k of f.extras) {
    if (k === 'nvme') continue;
    if (k === 'ru') { if (pr.country !== 'RU') return false; continue; }
    if (k === 'win') { if (!(pr.tasks || []).includes('windows')) return false; continue; }
    if (!(pr.requirements || []).includes(k)) return false;
  }
  for (const k of f.pay) if (pr.payments?.[k] !== true) return false;
  return true;
}

/** Для каждого провайдера самый дешёвый тариф, который проходит все условия */
function match(payload, f) {
  const byProv = new Map();
  for (const p of payload.plans) {
    if (!planPasses(p, f)) continue;
    if (!byProv.has(p.providerSlug)) byProv.set(p.providerSlug, []);
    byProv.get(p.providerSlug).push(p);
  }
  const out = [];
  for (const pr of payload.providers) {
    if (!providerPasses(pr, f)) continue;
    const plans = (byProv.get(pr.slug) || []).sort((a, b) => a.priceRub - b.priceRub);
    if (plans.length) out.push({ provider: pr, plan: plans[0], more: plans.length - 1 });
  }
  return out;
}

export default function Calculator({ payload, presetTask = null, presetGeo = 'any', campaign = CAMPAIGN.calculator, compact = false, split = false }) {
  const presetTaskObj = payload.tasks.find((t) => t.slug === presetTask) || null;

  const [task, setTask] = useState(presetTask);
  const [geo, setGeo] = useState(presetGeo);
  const [ram, setRam] = useState(presetTaskObj?.ram ?? 0);
  const [cpu, setCpu] = useState(presetTaskObj?.cpu ?? 0);
  const [budget, setBudget] = useState(0);
  const [pay, setPay] = useState([]);
  const [extras, setExtras] = useState([]);
  const [sort, setSort] = useState('price');
  const [showAll, setShowAll] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pings, setPings] = useState({});
  const [pinging, setPinging] = useState(false);
  const started = useRef(false);
  const restored = useRef(false);

  const track = useCallback((what, extra) => {
    if (!started.current) {
      started.current = true;
      goal(GOALS.calcStart);
    }
    goal(GOALS.calcResult, { field: what, ...extra });
  }, []);

  // подбор из адреса страницы (ссылку можно переслать)
  useEffect(() => {
    const p = readParams();
    const t = p.get('task');
    const tObj = t ? payload.tasks.find((x) => x.slug === t) : null;
    if (tObj) {
      setTask(t);
      // задача из ссылки без явных ресурсов: подставляем её рекомендацию видимыми плашками
      if (!p.has('ram')) setRam(tObj.ram);
      if (!p.has('cpu')) setCpu(tObj.cpu);
    }
    const g = p.get('geo');
    if (g && (g === 'any' || payload.geos.some((x) => x.slug === g))) setGeo(g);
    const r = num(p, 'ram', null);
    if (r !== null && RAM_OPTS.includes(r)) setRam(r);
    const c = num(p, 'cpu', null);
    if (c !== null && CPU_OPTS.includes(c)) setCpu(c);
    const b = num(p, 'budget', null);
    if (b !== null && BUDGET_OPTS.includes(b)) setBudget(b);
    const pp = list(p, 'pay');
    if (pp) setPay(pp.filter((k) => PAYS.some((x) => x.key === k)));
    const ex = list(p, 'req');
    if (ex) setExtras(ex.filter((k) => EXTRAS.some((x) => x.key === k)));
    const s = p.get('sort');
    if (s && SORTS.some((x) => x.key === s)) setSort(s);
    restored.current = true;
  }, [payload]);

  useEffect(() => {
    if (!restored.current) return;
    writeParams({
      task: task && task !== presetTask ? task : null,
      geo: geo && geo !== 'any' && geo !== presetGeo ? geo : null,
      ram: ram || null,
      cpu: cpu || null,
      budget: budget || null,
      pay: pay.length ? pay.join(',') : null,
      req: extras.length ? extras.join(',') : null,
      sort: sort !== 'price' ? sort : null,
    });
  }, [task, geo, ram, cpu, budget, pay, extras, sort, presetTask, presetGeo]);

  const taskObj = payload.tasks.find((t) => t.slug === task) || null;
  const geoObj = geo && geo !== 'any' ? payload.geos.find((g) => g.slug === geo) : null;
  const f = useMemo(
    () => ({ task, geoCode: geoObj?.code || null, ram, cpu, budget, pay, extras }),
    [task, geoObj, ram, cpu, budget, pay, extras]
  );

  const results = useMemo(() => {
    const r = match(payload, f);
    const perGb = (x) => x.plan.priceRub / x.plan.ram;
    if (sort === 'perGb') r.sort((a, b) => perGb(a) - perGb(b) || a.plan.priceRub - b.plan.priceRub);
    else if (sort === 'ram') r.sort((a, b) => b.plan.ram - a.plan.ram || a.plan.priceRub - b.plan.priceRub);
    else r.sort((a, b) => a.plan.priceRub - b.plan.priceRub);
    return r;
  }, [payload, f, sort]);
  const plansTotal = results.reduce((n, r) => n + 1 + r.more, 0);
  const visible = showAll ? results : results.slice(0, 8);

  function chooseTask(slug) {
    const next = task === slug ? null : slug;
    const prev = taskObj;
    const t = payload.tasks.find((x) => x.slug === next);
    setTask(next);
    if (t) {
      setRam(t.ram);
      setCpu(t.cpu);
    } else if (prev) {
      // сняли задачу: убираем и подставленные ею ресурсы, если человек их не менял
      if (ram === prev.ram) setRam(0);
      if (cpu === prev.cpu) setCpu(0);
    }
    setShowAll(false);
    track('task', { task: next || 'none' });
  }

  // активные условия: плашки с крестиком и разбор пустой выдачи
  const active = [];
  if (taskObj) active.push({ key: 'task', label: taskObj.name, clear: () => chooseTask(taskObj.slug), with: { task: null } });
  if (geoObj) active.push({ key: 'geo', label: geoObj.name, clear: () => setGeo('any'), with: { geoCode: null } });
  if (ram) active.push({ key: 'ram', label: `от ${ram} ГБ памяти`, clear: () => setRam(0), with: { ram: 0 } });
  if (cpu) active.push({ key: 'cpu', label: `от ${cpu} ${coresFrom(cpu)}`, clear: () => setCpu(0), with: { cpu: 0 } });
  if (budget) active.push({ key: 'budget', label: `до ${price(budget)}`, clear: () => setBudget(0), with: { budget: 0 } });
  pay.forEach((k) => active.push({ key: `pay:${k}`, label: PAYS.find((x) => x.key === k).label, clear: () => setPay((v) => toggle(v, k)), with: { pay: pay.filter((x) => x !== k) } }));
  extras.forEach((k) => active.push({ key: `ex:${k}`, label: EXTRAS.find((x) => x.key === k).label, clear: () => setExtras((v) => toggle(v, k)), with: { extras: extras.filter((x) => x !== k) } }));

  const blocker = useMemo(() => {
    if (results.length || !active.length) return null;
    let best = null;
    for (const a of active) {
      const r = match(payload, { ...f, ...a.with });
      if (r.length && (!best || r.length > best.n)) best = { ...a, n: r.length, from: Math.min(...r.map((x) => x.plan.priceRub)) };
    }
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.length, payload, f]);

  function resetAll() {
    setTask(null);
    setGeo('any');
    setRam(0);
    setCpu(0);
    setBudget(0);
    setPay([]);
    setExtras([]);
    setSort('price');
    setShowAll(false);
    track('reset');
  }

  async function runPing() {
    setPinging(true);
    const next = {};
    for (const code of PING_GEOS) {
      next[code] = await measureGeo(code);
      setPings({ ...next });
    }
    setPinging(false);
    track('ping', { ru: next.ru, eu: next.eu });
  }
  const pingText = (code) => (pings[code] === undefined ? '' : pings[code] === null ? ' · нет ответа' : ` · ${pings[code]} мс`);

  const geoOptions = payload.geos.filter((g) => !g.hideInCalc || g.slug === geo);
  const termTotal = (p) => (p.term && p.term > 1 ? `оплата сразу ${price(Math.round(p.priceRub * p.term))} за ${p.term === 12 ? 'год' : p.term === 24 ? '2 года' : p.term + ' мес.'}` : 'оплата помесячно');

  const controls = (
    <div className="flt-grid">
      <label className="fsel">
        <span>Регион</span>
        <select value={geo} onChange={(e) => { setGeo(e.target.value); setShowAll(false); track('geo', { geo: e.target.value }); }}>
          <option value="any">любой</option>
          {geoOptions.map((g) => (
            <option key={g.slug} value={g.slug}>{g.name}{pingText(g.code)}</option>
          ))}
        </select>
      </label>
      <label className="fsel">
        <span>Память</span>
        <select value={ram} onChange={(e) => { setRam(Number(e.target.value)); setShowAll(false); track('ram', { ram: e.target.value }); }}>
          {RAM_OPTS.map((v) => <option key={v} value={v}>{v ? `от ${v} ГБ` : 'любая'}</option>)}
        </select>
      </label>
      <label className="fsel">
        <span>Ядра</span>
        <select value={cpu} onChange={(e) => { setCpu(Number(e.target.value)); setShowAll(false); track('cpu', { cpu: e.target.value }); }}>
          {CPU_OPTS.map((v) => <option key={v} value={v}>{v ? `от ${v}` : 'любое'}</option>)}
        </select>
      </label>
      <label className="fsel">
        <span>Бюджет</span>
        <select value={budget} onChange={(e) => { setBudget(Number(e.target.value)); setShowAll(false); track('budget', { budget: e.target.value }); }}>
          {BUDGET_OPTS.map((v) => <option key={v} value={v}>{v ? `до ${price(v)}` : 'любой'}</option>)}
        </select>
      </label>
      <div className="flt-group" role="group" aria-label="Оплата">
        <span className="flt-cap">Оплата</span>
        {PAYS.map((x) => (
          <button key={x.key} type="button" className={pay.includes(x.key) ? 'qchip on' : 'qchip'} aria-pressed={pay.includes(x.key)} onClick={() => { setPay((v) => toggle(v, x.key)); setShowAll(false); track('pay', { pay: x.key }); }}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="flt-group" role="group" aria-label="Дополнительно">
        <span className="flt-cap">Ещё</span>
        {EXTRAS.map((x) => (
          <button key={x.key} type="button" className={extras.includes(x.key) ? 'qchip on' : 'qchip'} aria-pressed={extras.includes(x.key)} onClick={() => { setExtras((v) => toggle(v, x.key)); setShowAll(false); track('req', { req: x.key }); }}>
            {x.label}
          </button>
        ))}
      </div>
      <button type="button" className="ping-btn" onClick={runPing} disabled={pinging}>
        {pinging ? 'Замеряем задержку…' : Object.keys(pings).length ? 'Замерить задержку ещё раз' : 'Проверить задержку до регионов из вашей сети'}
      </button>
    </div>
  );

  return (
    <div id="podbor" className={split ? 'anchor calc-split calc-v2' : 'anchor calc-v2'}>
      <div className="calc-tasks">
        <div className="calc-tasks-head">
          <span className="label">Ваша задача</span>
          {taskObj && ram === taskObj.ram && cpu === taskObj.cpu && <span className="field-val">подставили память от {taskObj.ram} ГБ и от {taskObj.cpu} {coresFrom(taskObj.cpu)}, можно изменить</span>}
        </div>
        <div className="chips">
          {payload.tasks.filter((t) => !t.hideInCalc || t.slug === task).map((t) => (
            <button key={t.slug} type="button" className={task === t.slug ? 'chip on' : 'chip'} aria-pressed={task === t.slug} onClick={() => chooseTask(t.slug)}>
              <TaskIcon slug={t.slug} />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="calc-main calc-main-v2">
        <div className="flt" id="params">
          <button type="button" className="flt-toggle" aria-expanded={panelOpen} onClick={() => setPanelOpen((v) => !v)}>
            Фильтры{active.length ? ` · ${active.length}` : ''}
            <span aria-hidden="true">{panelOpen ? '▲' : '▼'}</span>
          </button>
          <div className={panelOpen ? 'flt-body open' : 'flt-body'}>{controls}</div>

          {active.length > 0 && (
            <div className="flt-active" aria-label="Выбранные условия">
              {active.map((a) => (
                <button key={a.key} type="button" className="achip" onClick={() => { a.clear(); setShowAll(false); track('clear', { what: a.key }); }} aria-label={`Убрать: ${a.label}`}>
                  {a.label} <span aria-hidden="true">✕</span>
                </button>
              ))}
              <button type="button" className="flt-reset" onClick={resetAll}>Сбросить всё</button>
            </div>
          )}
        </div>

        <div className="results">
          <div className="results-bar">
            <p className="results-sum">
              {results.length
                ? `${plansTotal} ${plural(plansTotal, 'тариф', 'тарифа', 'тарифов')} у ${results.length} ${plural(results.length, 'провайдера', 'провайдеров', 'провайдеров')}${active.length ? ' подходят под все условия' : ''}`
                : 'Под все условия тарифов нет'}
            </p>
            <div className="sortseg" role="group" aria-label="Сортировка">
              {SORTS.map((s) => (
                <button key={s.key} type="button" className={sort === s.key ? 'on' : ''} aria-pressed={sort === s.key} onClick={() => { setSort(s.key); track('sort', { sort: s.key }); }}>{s.label}</button>
              ))}
            </div>
          </div>

          {results.length === 0 && (
            <div className="notice">
              {blocker ? (
                <>
                  <strong>Мешает условие «{blocker.label}».</strong> Без него найдётся {blocker.n}{' '}
                  {plural(blocker.n, 'провайдер', 'провайдера', 'провайдеров')}, тарифы от {price(blocker.from)} в месяц
                  <div className="row mt">
                    <button type="button" className="btn btn-brass btn-sm" onClick={() => { blocker.clear(); track('clear', { what: blocker.key }); }}>Убрать «{blocker.label}»</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={resetAll}>Сбросить всё</button>
                  </div>
                </>
              ) : (
                <>
                  <strong>Ничего не нашлось.</strong> Снимите пару условий или начните заново
                  <div className="row mt">
                    <button type="button" className="btn btn-brass btn-sm" onClick={resetAll}>Сбросить всё</button>
                  </div>
                </>
              )}
            </div>
          )}

          {visible.map((r) => {
            const geoName = payload.geos.find((g) => g.code === r.plan.geo)?.name || (r.plan.geo === 'global' ? 'несколько регионов' : r.plan.geo);
            const ini = r.provider.name.replace(/[^A-Za-zА-Яа-я0-9]/g, '').slice(0, 2).toUpperCase();
            const chips = [geoName];
            if (r.provider.features?.hourly) chips.push('Почасовая оплата');
            if (r.provider.features?.testPeriod) chips.push('Тест-период');
            if (r.provider.payments?.mir) chips.push('Карта МИР');
            if (r.provider.payments?.sbp) chips.push('СБП');
            if (r.provider.payments?.crypto) chips.push('Крипта');
            return (
              <article className="rescard" key={r.provider.slug}>
                <span className="res-logo" style={{ background: r.provider.color }} aria-hidden="true">{ini}</span>
                <div className="res-main">
                  <div className="res-title">
                    <strong>{r.provider.name}</strong>
                  </div>
                  <div className="res-plan">
                    {r.plan.name} · {r.plan.cpu} {coresWord(r.plan.cpu)} · {r.plan.ram} ГБ · {r.plan.disk} ГБ {r.plan.diskType}
                  </div>
                  <div className="res-chips">
                    {chips.map((c) => <span key={c} className="pchip">{c}</span>)}
                  </div>
                  {r.more > 0 && (
                    <Link href={`/provajdery/${r.provider.slug}`} className="res-more">
                      ещё {r.more} {plural(r.more, 'подходящий тариф', 'подходящих тарифа', 'подходящих тарифов')} у {r.provider.name}
                    </Link>
                  )}
                </div>
                <div className="res-side">
                  <div className="res-price">{price(r.plan.priceRub)}<span> в месяц</span></div>
                  <div className="res-terms">{termTotal(r.plan)}</div>
                  <OutLink provider={r.provider} campaign={campaign} goalName="calc_click" className="btn btn-brass btn-block">
                    Тарифы {r.provider.name} <span className="nowrap">от {price(r.plan.priceRub)}</span>
                  </OutLink>
                </div>
              </article>
            );
          })}

          {results.length > visible.length && (
            <button type="button" className="btn btn-ghost btn-sm mt" onClick={() => setShowAll(true)}>
              Показать остальных провайдеров: {results.length - visible.length}
            </button>
          )}

          {!compact && (
            <p className="disclosure" style={{ marginTop: 18 }}>
              Часть ссылок партнёрские: при оформлении услуги по ним мы можем получить вознаграждение, цена
              для вас не меняется. В списке только тарифы, которые подходят под все выбранные условия, порядок
              задаёт выбранная сортировка,{' '}
              <Link href="/metodologiya">как мы считаем</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
