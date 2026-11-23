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
 * - Порядок по умолчанию «Оптимально» (04.11.2026): 60% надёжность провайдера (payload.providers[].quality из lib/quality.js) и 40% цена.
 *   Остальные: дешевле, цена за гигабайт, больше памяти. Рекламный блок payload.featured стоит над результатами отдельно, с пометкой «Реклама».
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import OutLink from './OutLink';
import TaskIcon from './TaskIcon';
import { measureGeo, PING_GEOS } from '@/lib/ping';
import { price, plural, ruDateShort } from '@/lib/format';
import { goal, GOALS } from '@/lib/metrika';
import { CAMPAIGN } from '@/lib/utm';
import { readParams, num, list, writeParams } from '@/lib/url-state';

const RAM_OPTS = [0, 1, 2, 4, 8, 16];
const CPU_OPTS = [0, 1, 2, 4, 8];
const BUDGET_OPTS = [0, 300, 500, 1000, 2000, 3000, 5000];
// ползунок бюджета: шаги слева направо, последний «без лимита»
const BUDGET_STEPS = [300, 500, 1000, 2000, 3000, 5000, 0];
const PAYS = [
  { key: 'mir', label: 'Карта РФ', title: 'Карта российского банка, в том числе МИР' },
  { key: 'card', label: 'Зарубежная карта', title: 'Visa или Mastercard' },
  { key: 'sbp', label: 'СБП' },
  { key: 'crypto', label: 'Криптовалюта' },
];
const EXTRAS = [
  { key: 'ddos', label: 'Защита от DDoS' },
  { key: 'nvme', label: 'NVMe' },
  { key: 'hourly', label: 'Почасовая оплата' },
  { key: 'testPeriod', label: 'Тест-период' },
  { key: 'port10', label: 'Канал от 10 Гбит/с' },
  { key: 'win', label: 'Windows' },
  { key: 'ru', label: 'Российский провайдер' },
];
// страна внутри региона (09.11.2026): кнопки показываем только для стран, где тарифы есть хотя бы у двух провайдеров
const COUNTRIES = [
  ['nl', 'Нидерланды'], ['de', 'Германия'], ['pl', 'Польша'], ['fi', 'Финляндия'], ['se', 'Швеция'],
  ['kz', 'Казахстан'], ['us', 'США'], ['gb', 'Великобритания'], ['tr', 'Турция'], ['sg', 'Сингапур'],
];
// игровой сервер (09.11.2026): ориентир памяти и ядер на ванильный сервер, моды и плагины добавляют память
const GAMES = [
  { key: 'mc-java', label: 'Minecraft Java', by: { 10: [4, 2], 20: [8, 2], 50: [8, 4] } },
  { key: 'mc-bedrock', label: 'Minecraft Bedrock', by: { 10: [2, 1], 20: [2, 2], 50: [4, 2] } },
  { key: 'cs2', label: 'CS2', by: { 10: [2, 2], 20: [4, 2], 50: [4, 4] } },
  { key: 'rust', label: 'Rust', by: { 10: [8, 2], 20: [8, 4], 50: [16, 4] } },
  { key: 'terraria', label: 'Terraria', by: { 10: [1, 1], 20: [2, 1], 50: [2, 2] } },
];
const PLAYERS = [10, 20, 50];
const SORTS = [
  { key: 'opt', label: 'Оптимально' },
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
  if (f.extras.includes('port10') && !(p.portGbit >= 10)) return false;
  if (f.country && !(p.countries || []).includes(f.country)) return false;
  return true;
}

function providerPasses(pr, f) {
  if (f.task && !(pr.tasks || []).includes(f.task)) return false;
  for (const k of f.extras) {
    if (k === 'nvme' || k === 'port10') continue;
    if (k === 'ru') { if (pr.country !== 'RU') return false; continue; }
    if (k === 'win') { if (!(pr.tasks || []).includes('windows')) return false; continue; }
    if (!(pr.requirements || []).includes(k)) return false;
  }
  // оплата: подходит любой из выбранных способов
  if (f.pay.length && !f.pay.some((k) => pr.payments?.[k] === true)) return false;
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

export default function Calculator({ payload, presetTask = null, presetGeo = 'any', presetCountry = null, campaign = CAMPAIGN.calculator, compact = false, intro = null, hero = false }) {
  const presetTaskObj = payload.tasks.find((t) => t.slug === presetTask) || null;

  const [task, setTask] = useState(presetTask);
  const [geo, setGeo] = useState(presetGeo);
  // страница страны (/vps/niderlandy) открывает подбор сразу с регионом и страной
  const [country, setCountry] = useState(presetCountry);
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState(10);
  const [ram, setRam] = useState(presetTaskObj?.ram ?? 0);
  const [cpu, setCpu] = useState(presetTaskObj?.cpu ?? 0);
  const [budget, setBudget] = useState(0);
  const [pay, setPay] = useState([]);
  const [extras, setExtras] = useState([]);
  const [sort, setSort] = useState('opt');
  const [showAll, setShowAll] = useState(false);
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
    const ct = p.get('country');
    if (ct && COUNTRIES.some(([c]) => c === ct)) setCountry(ct);
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
      geo: geo && geo !== presetGeo ? geo : null,
      country: country && country !== presetCountry ? country : null,
      ram: ram || null,
      cpu: cpu || null,
      budget: budget || null,
      pay: pay.length ? pay.join(',') : null,
      req: extras.length ? extras.join(',') : null,
      sort: sort !== 'opt' ? sort : null,
    });
  }, [task, geo, country, ram, cpu, budget, pay, extras, sort, presetTask, presetGeo, presetCountry]);

  const taskObj = payload.tasks.find((t) => t.slug === task) || null;
  const geoObj = geo && geo !== 'any' ? payload.geos.find((g) => g.slug === geo) : null;
  const f = useMemo(
    () => ({ task, geoCode: geoObj?.code || null, country, ram, cpu, budget, pay, extras }),
    [task, geoObj, country, ram, cpu, budget, pay, extras]
  );

  const results = useMemo(() => {
    const r = match(payload, f);
    const perGb = (x) => x.plan.priceRub / x.plan.ram;
    if (sort === 'perGb') r.sort((a, b) => perGb(a) - perGb(b) || a.plan.priceRub - b.plan.priceRub);
    else if (sort === 'ram') r.sort((a, b) => b.plan.ram - a.plan.ram || a.plan.priceRub - b.plan.priceRub);
    else if (sort === 'opt') {
      // формула та же, что в lib/quality.js optimalScore: 60 × надёжность + 40 × √(самая низкая цена / цена) − 5 за предоплату + прибавка партнёру
      const floor = r.length ? Math.min(...r.map((x) => x.plan.priceRub)) : 0;
      const opt = (x) => 60 * (x.provider.quality || 0) + 40 * Math.sqrt(floor / x.plan.priceRub) - (x.plan.term > 1 ? 5 : 0) + (x.provider.bonus || 0);
      r.forEach((x) => { x.opt = Math.round(opt(x)); });
      r.sort((a, b) => b.opt - a.opt || a.plan.priceRub - b.plan.priceRub);
    }
    else r.sort((a, b) => a.plan.priceRub - b.plan.priceRub);
    return r;
  }, [payload, f, sort]);
  const plansTotal = results.reduce((n, r) => n + 1 + r.more, 0);
  // обычная цена на рынке: медиана по базе для того же объёма памяти и медиана цены гигабайта
  const market = useMemo(() => {
    const med = (arr) => {
      if (!arr.length) return null;
      const s = [...arr].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    const byRam = new Map();
    for (const p of payload.plans) {
      if (!byRam.has(p.ram)) byRam.set(p.ram, []);
      byRam.get(p.ram).push(p.priceRub);
    }
    const ram = new Map();
    for (const [k, v] of byRam) if (v.length >= 3) ram.set(k, med(v));
    return { ram, perGb: med(payload.plans.map((p) => p.priceRub / p.ram)) };
  }, [payload]);
  const visible = showAll ? results : results.slice(0, 5);

  function chooseTask(slug) {
    const next = task === slug ? null : slug;
    const prev = taskObj;
    const t = payload.tasks.find((x) => x.slug === next);
    setTask(next);
    if (next !== 'game') setGame(null);
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
  if (country) active.push({ key: 'country', label: COUNTRIES.find(([c]) => c === country)?.[1] || country, clear: () => setCountry(null), with: { country: null } });
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
    setCountry(null);
    setGame(null);
    setRam(0);
    setCpu(0);
    setBudget(0);
    setPay([]);
    setExtras([]);
    setSort('opt');
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
  const countryOptions = useMemo(() => {
    const by = new Map();
    for (const p of payload.plans) for (const c of p.countries || []) {
      if (!by.has(c)) by.set(c, new Set());
      by.get(c).add(p.providerSlug);
    }
    return COUNTRIES.filter(([c]) => (by.get(c)?.size || 0) >= 2 || c === country);
  }, [payload, country]);
  const hasPort10 = useMemo(() => payload.plans.some((p) => p.portGbit >= 10), [payload]);
  const extrasShown = EXTRAS.filter((x) => x.key !== 'port10' || hasPort10);
  function applyGame(g, n) {
    const def = GAMES.find((x) => x.key === g);
    setGame(g);
    setPlayers(n);
    if (def) {
      const [r, c] = def.by[n];
      setRam(r);
      setCpu(c);
    }
    setShowAll(false);
    track('game', { game: g, players: n });
  }
  const termTotal = (p) => (p.term && p.term > 1 ? `оплата сразу ${price(Math.round(p.priceRub * p.term))} за ${p.term === 12 ? 'год' : p.term === 24 ? '2 года' : p.term + ' мес.'}` : 'оплата помесячно');

  const segBtn = (on) => (on ? 'on' : '');

  // ---------- вариант 1 главной (18.11.2026): подбор слева, ответ справа, компактные карточки ----------
  const [moreOpen, setMoreOpen] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const resRef = useRef(null);

  // мобильная липкая кнопка: видна, пока результаты ниже экрана
  useEffect(() => {
    const el = resRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top > 0), { threshold: 0, rootMargin: '0px 0px -45% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const moreCount = (country ? 1 : 0) + (ram ? 1 : 0) + (cpu ? 1 : 0) + pay.length + extras.length;
  const resultsTitle = `Лучшие VPS${taskObj ? ` ${TASK_FOR[taskObj.slug] || `для задачи «${taskObj.name}»`}` : ''}${geoObj ? ` ${GEO_IN[geoObj.code] || `: ${geoObj.name}`}` : ''}`;
  const cheapest = results.length > 1 ? Math.min(...results.map((x) => x.plan.priceRub)) : null;
  const sumText = results.length
    ? `${plansTotal} ${plural(plansTotal, 'тариф', 'тарифа', 'тарифов')} у ${results.length} ${plural(results.length, 'провайдера', 'провайдеров', 'провайдеров')}`
    : 'Под все условия тарифов нет';

  function scrollToResults() {
    resRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    track('jump_results');
  }

  const pingBadge = (code) =>
    pings[code] !== undefined && (
      <span className={pings[code] === null ? 'ping-v' : pings[code] < 80 ? 'ping-v ping-good' : pings[code] < 200 ? 'ping-v ping-mid' : 'ping-v ping-bad'}>
        {pings[code] === null ? '—' : `${pings[code]} мс`}
      </span>
    );

  const side = (
    <div className="cv5-side">
      {intro}
      <div className="cv5-panel" aria-label="Условия подбора">
        <div className="cv5-step">
          <div className="cv5-lbl">
            <span>1. Что запускаем</span>
            {taskObj && ram === taskObj.ram && cpu === taskObj.cpu && <small>подставили от {taskObj.ram} ГБ и {taskObj.cpu} {coresFrom(taskObj.cpu)}</small>}
          </div>
          <div className="cv5-chips">
            {payload.tasks.filter((t) => !t.hideInCalc || t.slug === task).map((t) => (
              <button key={t.slug} type="button" className={task === t.slug ? 'cv5-chip on' : 'cv5-chip'} aria-pressed={task === t.slug} onClick={() => chooseTask(t.slug)}>
                <TaskIcon slug={t.slug} />
                {t.name}
              </button>
            ))}
          </div>
          {task === 'game' && (
            <div className="calc-games" aria-label="Игра и число игроков">
              <div className="cv5-chips">
                {GAMES.map((g) => (
                  <button key={g.key} type="button" className={game === g.key ? 'cv5-chip on' : 'cv5-chip'} aria-pressed={game === g.key} onClick={() => applyGame(g.key, players)}>{g.label}</button>
                ))}
              </div>
              <div className="cv5-seg" role="group" aria-label="Игроков на сервере">
                {PLAYERS.map((n) => (
                  <button key={n} type="button" className={players === n ? 'on' : ''} aria-pressed={players === n} onClick={() => applyGame(game || 'mc-java', n)}>до {n} игроков</button>
                ))}
              </div>
              {game && <p className="faint calc-games-note">Ориентир для сервера без модов: память от {ram} ГБ и от {cpu} {coresFrom(cpu)}. Моды и плагины добавляют память</p>}
            </div>
          )}
        </div>

        <div className="cv5-step" id="region">
          <div className="cv5-lbl">
            <span>2. Где сервер</span>
            <button type="button" className="ping-btn" onClick={runPing} disabled={pinging}>
              {pinging ? 'Замеряем…' : Object.keys(pings).length ? 'Замерить ещё раз' : 'Проверить задержку'}
            </button>
          </div>
          <div className="cv5-seg" role="group" aria-label="Регион">
            {geoOptions.map((g) => (
              <button key={g.slug} type="button" className={geo === g.slug ? 'on' : ''} aria-pressed={geo === g.slug} onClick={() => { setGeo(geo === g.slug ? 'any' : g.slug); setCountry(null); setShowAll(false); track('geo', { geo: g.slug }); }}>
                {g.name}
                {pingBadge(g.code)}
              </button>
            ))}
            <button type="button" className={geo === 'any' ? 'on' : ''} aria-pressed={geo === 'any'} onClick={() => { setGeo('any'); setShowAll(false); track('geo', { geo: 'any' }); }}>Любой</button>
          </div>
        </div>

        <div className="cv5-step">
          <div className="cv5-lbl">
            <label htmlFor="cv5-budget">3. Бюджет в месяц</label>
            <b>{budget ? `до ${price(budget)}` : 'без лимита'}</b>
          </div>
          <input
            id="cv5-budget"
            className="range"
            type="range"
            min={0}
            max={BUDGET_STEPS.length - 1}
            step={1}
            value={Math.max(0, BUDGET_STEPS.indexOf(budget))}
            onChange={(e) => { setBudget(BUDGET_STEPS[Number(e.target.value)]); setShowAll(false); }}
            onMouseUp={() => track('budget', { budget })}
            onTouchEnd={() => track('budget', { budget })}
            aria-valuetext={budget ? `до ${price(budget)}` : 'без лимита'}
          />
          <div className="cv5-scale" aria-hidden="true">
            {BUDGET_STEPS.map((v) => <span key={v}>{v ? (v >= 1000 ? `${v / 1000} тыс` : v) : '∞'}</span>)}
          </div>
        </div>

        <div className="cv5-more">
          <button type="button" className="cv5-more-btn" aria-expanded={moreOpen} aria-controls="cv5-more-body" onClick={() => { setMoreOpen((v) => !v); track('more', { open: !moreOpen }); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            <span>Ещё фильтры: память, ядра, оплата, NVMe</span>
            {moreCount > 0 && <b className="cv5-count">{moreCount}</b>}
            <svg className="cv5-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <div id="cv5-more-body" className={moreOpen ? 'cv5-more-body open' : 'cv5-more-body'}>
            {countryOptions.length > 0 && (
              <div className="fblock">
                <div className="flbl">Страна</div>
                <div className="fbtns">
                  {countryOptions.map(([c, name]) => (
                    <button key={c} type="button" className={country === c ? 'fbtn on' : 'fbtn'} aria-pressed={country === c} onClick={() => { setCountry(country === c ? null : c); setShowAll(false); track('country', { country: c }); }}>{name}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="fblock">
              <div className="flbl">Память, ГБ</div>
              <div className="fseg" role="group" aria-label="Память">
                {RAM_OPTS.map((v) => (
                  <button key={v} type="button" className={segBtn(ram === v)} aria-pressed={ram === v} onClick={() => { setRam(v); setShowAll(false); track('ram', { ram: v }); }}>{v || 'все'}</button>
                ))}
              </div>
            </div>
            <div className="fblock">
              <div className="flbl">Ядра</div>
              <div className="fseg" role="group" aria-label="Ядра">
                {CPU_OPTS.map((v) => (
                  <button key={v} type="button" className={segBtn(cpu === v)} aria-pressed={cpu === v} onClick={() => { setCpu(v); setShowAll(false); track('cpu', { cpu: v }); }}>{v || 'все'}</button>
                ))}
              </div>
            </div>
            <div className="fblock">
              <div className="flbl">Оплата</div>
              <div className="fbtns">
                <button type="button" className={pay.length === 0 ? 'fbtn on' : 'fbtn'} aria-pressed={pay.length === 0} onClick={() => { setPay([]); setShowAll(false); track('pay', { pay: 'any' }); }}>Любая</button>
                {PAYS.map((x) => (
                  <button key={x.key} type="button" className={pay.includes(x.key) ? 'fbtn on' : 'fbtn'} aria-pressed={pay.includes(x.key)} title={x.title} onClick={() => { setPay((v) => toggle(v, x.key)); setShowAll(false); track('pay', { pay: x.key }); }}>
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="fblock">
              <div className="flbl">Условия</div>
              <div className="fbtns">
                {extrasShown.map((x) => (
                  <button key={x.key} type="button" className={extras.includes(x.key) ? 'fbtn on' : 'fbtn'} aria-pressed={extras.includes(x.key)} onClick={() => { setExtras((v) => toggle(v, x.key)); setShowAll(false); track('req', { req: x.key }); }}>
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cv5-sum">
        <p><span className="cv5-dot" aria-hidden="true" /><b>{sumText}</b>{results.length > 0 && active.length > 0 ? ' подходят под все условия' : ''}</p>
        {active.length > 0 && (
          <div className="cv5-active" aria-label="Выбранные условия">
            {active.map((a) => (
              <button key={a.key} type="button" className="achip" onClick={() => { a.clear(); setShowAll(false); track('clear', { what: a.key }); }} aria-label={`Убрать: ${a.label}`}>
                {a.label} <span aria-hidden="true">✕</span>
              </button>
            ))}
            <button type="button" className="flt-reset" onClick={resetAll}>Сбросить</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div id="podbor" className={hero ? 'anchor calc-v5 calc-v5-hero' : 'anchor calc-v5'}>
      {side}

      <section className="cv5-res" ref={resRef} id="rezultaty" aria-label="Результаты подбора">
        <div className="cv5-res-head">
          <h2>{resultsTitle}</h2>
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

        {payload.featured && results.length > 0 && (() => {
          const ad = payload.providers.find((x) => x.slug === payload.featured.slug);
          if (!ad) return null;
          return (
            <div className="adbar" aria-label="Реклама">
              <span className="adbar-label">{payload.featured.adLabel || 'Реклама'}</span>
              <span className="adbar-text"><b>{ad.name}</b>: {payload.featured.promo?.text} по промокоду <code className="cv5-code">{payload.featured.promo?.code}</code></span>
              <OutLink provider={ad} campaign={`${campaign}_ad`} goalName="featured_click" className="btn btn-ghost btn-sm">Перейти</OutLink>
            </div>
          );
        })()}

        <ol className="cv5-list">
          {visible.map((r, i) => {
            const p = r.plan;
            const pr = r.provider;
            const whereFull = (p.cityByRu && geoObj && p.cityByRu[geoObj.code]) || p.location || payload.geos.find((g) => g.code === p.geo)?.name || (p.geo === 'global' ? 'несколько регионов' : p.geo);
            const m = String(whereFull).match(/^(.*?)\s*\((.*)\)$/);
            const cities = (m ? m[2] : whereFull).split(',').map((x) => x.trim()).filter(Boolean);
            const where = m ? (cities.length === 1 ? cities[0] : m[1]) : cities.length > 1 ? `${cities[0]} и ещё ${cities.length - 1}` : whereFull;
            const ini = pr.name.replace(/[^A-Za-zА-Яа-яÉé0-9]/g, '').slice(0, 2);
            const prepaid = p.term && p.term > 1;
            const q = Math.max(0, Math.min(1, pr.quality || 0));
            const qText = (q * 10).toFixed(1).replace('.', ',');
            const why = reasonsOf(pr).slice(0, 3);
            const ramBase = market.ram.get(p.ram);
            const diff = ramBase ? Math.round((1 - p.priceRub / ramBase) * 100) : 0;
            const tag = cheapest != null && p.priceRub === cheapest ? 'самая низкая цена в подборе' : diff >= 5 ? `на ${diff}% дешевле рынка за ${p.ram} ГБ` : null;
            const feat = payload.featured && payload.featured.slug === pr.slug ? payload.featured : null;
            const top = i === 0;
            return (
              <li key={pr.slug}>
                <article className={`rc5${top ? ' rc5-top' : ''}${feat ? ' rc5-feat' : ''}`}>
                  {feat && <span className="rc5-ribbon">{feat.label} · {feat.promo?.text}</span>}
                  {pr.logo ? (
                    <span className={pr.logo.dark ? 'rc5-logo rc5-img rc5-dark' : 'rc5-logo rc5-img'} aria-hidden="true">
                      <img src={pr.logo.src} alt="" width="40" height="40" loading={i < 3 ? 'eager' : 'lazy'} decoding="async" />
                    </span>
                  ) : (
                    <span className="rc5-logo" style={{ '--c': pr.color }} aria-hidden="true">{ini}</span>
                  )}
                  <div className="rc5-body">
                    <div className="rc5-l1">
                      <Link href={`/provajdery/${pr.slug}`} className="rc5-name">{pr.name}</Link>
                      <span className="rc5-tag">{pr.country === 'RU' ? 'Российская компания' : 'Зарубежная компания'}</span>
                      {tag && <span className="rc5-tag rc5-good">{tag}</span>}
                      {prepaid && <span className="rc5-tag rc5-warn">оплата за {p.term === 12 ? 'год' : `${p.term} мес.`} вперёд</span>}
                    </div>
                    <div className="rc5-cfg">
                      {p.cpu} {coresWord(p.cpu)} · {p.ram} ГБ · {p.disk} ГБ {p.diskType}{p.trafficTb != null ? ` · ${p.trafficTb} ТБ трафика` : ''} · {where}
                    </div>
                    <div className="rc5-rel">
                      <span className="rc5-meter" aria-hidden="true"><i style={{ width: `${Math.round(q * 100)}%` }} /></span>
                      <span>
                        <b>Надёжность {qText}</b>
                        {why.length > 0 && <> · {why.join(', ')}</>} · цена проверена {ruDateShort(p.verifiedAt)}
                      </span>
                    </div>
                    {payList(pr).length > 0 && (
                      <div className="rc5-pay" aria-label="Способы оплаты">
                        <span>Оплата: </span>
                        {payList(pr).map((x, k, arr) => <span key={x} className="rc5-paychip">{x}{k < arr.length - 1 && <span className="vh">, </span>}</span>)}
                      </div>
                    )}
                    {feat?.promo && <div className="rc5-promo">Промокод <code className="cv5-code">{feat.promo.code}</code>: {feat.promo.text}</div>}
                  </div>
                  <div className="rc5-side">
                    <div className="rc5-price">{price(p.priceRub)}<span> в месяц</span></div>
                    {prepaid && <div className="rc5-term">{termTotal(p)}</div>}
                    <OutLink provider={pr} campaign={campaign} goalName="calc_click" className={top ? 'btn btn-brass rc5-cta' : 'btn btn-line rc5-cta'} ariaLabel={`К тарифу ${pr.name} за ${price(p.priceRub)} в месяц`}>
                      К тарифу
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </OutLink>
                    <Link href={`/provajdery/${pr.slug}`} className="rc5-more">
                      {r.more > 0 ? `Обзор и ещё ${r.more} ${plural(r.more, 'тариф', 'тарифа', 'тарифов')}` : 'Обзор провайдера'}
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>

        {results.length > visible.length && (
          <button type="button" className="btn btn-ghost btn-sm cv5-showall" onClick={() => { setShowAll(true); track('show_all'); }}>
            Показать ещё {results.length - visible.length} {plural(results.length - visible.length, 'провайдера', 'провайдеров', 'провайдеров')}
          </button>
        )}

        {!compact && (
          <p className="disclosure cv5-disc">
            Часть ссылок партнёрские: при оформлении услуги по ним мы можем получить вознаграждение, цена для вас не меняется.
            Порядок «Оптимально»: 60% надёжность провайдера, 40% цена, партнёры сервиса получают прибавку 10 баллов.
            Надёжность из 10 считается по одинаковым для всех критериям. <Link href="/metodologiya">Как мы считаем</Link>
          </p>
        )}
      </section>

      {results.length > 0 && (
        <div className={showBar ? 'cv5-bar show' : 'cv5-bar'} aria-hidden={!showBar}>
          <span>{sumText}</span>
          <button type="button" onClick={scrollToResults} tabIndex={showBar ? 0 : -1}>
            Смотреть
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}

/** Почему провайдеру можно доверять: факты из карточки провайдера, одинаковые для всех */
function reasonsOf(pr) {
  const f = pr.features || {};
  const out = [];
  if (f.ddos) out.push('защита от DDoS');
  if (f.backup) out.push('бэкапы');
  if (f.hourly) out.push('почасовая оплата');
  if (pr.years != null && pr.years >= 10) out.push(`${pr.years} ${plural(pr.years, 'год', 'года', 'лет')} на рынке`);
  if (f.testPeriod) out.push('тест-период');
  if (f.panel) out.push('своя панель');
  return out;
}

/** Способы оплаты на карточке (18.11.2026, Антон): для посетителя из России часто решающий фактор */
function payList(pr) {
  const p = pr.payments || {};
  return [p.mir && 'Карта РФ', p.sbp && 'СБП', p.crypto && 'Криптовалюта', p.card && 'Зарубежная карта'].filter(Boolean);
}

const TASK_FOR = {
  sajt: 'под сайт',
  magazin: 'под интернет-магазин',
  '1c-bitrix': 'под 1С и Битрикс',
  'telegram-bot': 'под Telegram-бота',
  'baza-dannyh': 'под базу данных',
  ai: 'под AI и ML',
  game: 'под игровой сервер',
  dev: 'для разработки',
  n8n: 'под n8n',
  windows: 'на Windows',
  gpu: 'с GPU',
};
const GEO_IN = { ru: 'в России', eu: 'в Европе', us: 'в США', asia: 'в Азии', kz: 'в Казахстане', uae: 'в ОАЭ', global: 'по всему миру' };
