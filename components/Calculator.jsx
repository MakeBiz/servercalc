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

  const segBtn = (on) => (on ? 'on' : '');
  const controls = (
    <div className="flt-side">
      <div className="fblock">
        <div className="flbl">Регион</div>
        <div className="fbtns">
          <button type="button" className={geo === 'any' ? 'fbtn on' : 'fbtn'} aria-pressed={geo === 'any'} onClick={() => { setGeo('any'); setShowAll(false); track('geo', { geo: 'any' }); }}>Любой</button>
          {geoOptions.map((g) => (
            <button key={g.slug} type="button" className={geo === g.slug ? 'fbtn on' : 'fbtn'} aria-pressed={geo === g.slug} onClick={() => { setGeo(geo === g.slug ? 'any' : g.slug); setShowAll(false); track('geo', { geo: g.slug }); }}>
              {g.name}
              {pings[g.code] !== undefined && <span className={pings[g.code] === null ? 'ping-v' : pings[g.code] < 80 ? 'ping-v ping-good' : pings[g.code] < 200 ? 'ping-v ping-mid' : 'ping-v ping-bad'}>{pings[g.code] === null ? '—' : `${pings[g.code]} мс`}</span>}
            </button>
          ))}
        </div>
        <button type="button" className="ping-btn" onClick={runPing} disabled={pinging}>
          {pinging ? 'Замеряем задержку…' : Object.keys(pings).length ? 'Замерить ещё раз' : 'Проверить задержку из вашей сети'}
        </button>
      </div>

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
        <div className="flbl">Бюджет в месяц <b>{budget ? `до ${price(budget)}` : 'без лимита'}</b></div>
        <input
          className="range"
          type="range"
          min={0}
          max={BUDGET_STEPS.length - 1}
          step={1}
          value={Math.max(0, BUDGET_STEPS.indexOf(budget))}
          onChange={(e) => { setBudget(BUDGET_STEPS[Number(e.target.value)]); setShowAll(false); }}
          onMouseUp={() => track('budget', { budget })}
          onTouchEnd={() => track('budget', { budget })}
          aria-label="Бюджет в месяц"
          aria-valuetext={budget ? `до ${price(budget)}` : 'без лимита'}
        />
        <div className="range-scale"><span>300 ₽</span><span>без лимита</span></div>
      </div>

      <div className="fblock">
        <div className="flbl">Оплата</div>
        <div className="fbtns">
          {PAYS.map((x) => (
            <button key={x.key} type="button" className={pay.includes(x.key) ? 'fbtn on' : 'fbtn'} aria-pressed={pay.includes(x.key)} onClick={() => { setPay((v) => toggle(v, x.key)); setShowAll(false); track('pay', { pay: x.key }); }}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fblock">
        <div className="flbl">Ещё</div>
        <div className="fbtns">
          {EXTRAS.map((x) => (
            <button key={x.key} type="button" className={extras.includes(x.key) ? 'fbtn on' : 'fbtn'} aria-pressed={extras.includes(x.key)} onClick={() => { setExtras((v) => toggle(v, x.key)); setShowAll(false); track('req', { req: x.key }); }}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {active.length > 0 && <button type="button" className="flt-reset" onClick={resetAll}>Сбросить все фильтры</button>}
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
        <aside className="flt" id="params" aria-label="Фильтры подбора">
          <button type="button" className="flt-toggle" aria-expanded={panelOpen} onClick={() => setPanelOpen((v) => !v)}>
            Фильтры{active.length ? ` · ${active.length}` : ''}
            <span aria-hidden="true">{panelOpen ? '▲' : '▼'}</span>
          </button>
          <div className={panelOpen ? 'flt-body open' : 'flt-body'}>{controls}</div>
        </aside>

        <div className="results">
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
            const p = r.plan;
            const pr = r.provider;
            const whereFull = (p.cityByRu && geoObj && p.cityByRu[geoObj.code]) || p.location || payload.geos.find((g) => g.code === p.geo)?.name || (p.geo === 'global' ? 'несколько регионов' : p.geo);
            // длинный список городов сокращаем: «США (Нью-Йорк, Лос-Анджелес и ещё 3)»
            const where = (() => {
              const m = String(whereFull).match(/^(.*?)\((.*)\)$/);
              const head = m ? m[1].trim() : '';
              const list = (m ? m[2] : whereFull).split(',').map((x) => x.trim()).filter(Boolean);
              if (list.length <= 3) return whereFull;
              const short = `${list.slice(0, 2).join(', ')} и ещё ${list.length - 2}`;
              return head ? `${head} (${short})` : short;
            })();
            const ini = pr.name.replace(/[^A-Za-zА-Яа-я0-9]/g, '').slice(0, 2).toUpperCase();
            const pays = [pr.payments?.mir && 'Карта МИР', pr.payments?.sbp && 'СБП', pr.payments?.card && 'Visa/Mastercard', pr.payments?.crypto && 'Криптовалюта'].filter(Boolean);
            const feats = [pr.features?.hourly && 'Почасовая оплата', pr.features?.testPeriod && 'Тест-период', pr.features?.ddos && 'Защита от DDoS', pr.features?.backup && 'Бэкапы', pr.features?.panel && 'Панель управления'].filter(Boolean);
            const desc = pr.description && pr.description.length > 150 ? pr.description.slice(0, 148).replace(/[ ,.]+[^ ]*$/, '') + '…' : pr.description;
            return (
              <article className="rescard rescard-v3" key={pr.slug}>
                <div className="rc-head">
                  <span className="res-logo" style={{ background: pr.color }} aria-hidden="true">{ini}</span>
                  <div className="rc-who">
                    <Link href={`/provajdery/${pr.slug}`} className="rc-name">{pr.name}</Link>
                    <div className="rc-meta">{pr.country === 'RU' ? 'Российская компания' : 'Зарубежная компания'}{pr.virtualization?.length ? ` · ${pr.virtualization.join(', ')}` : ''}</div>
                  </div>
                  <div className="rc-price">
                    <div className="res-price">{price(p.priceRub)}<span> в месяц</span></div>
                    <div className="res-terms">{termTotal(p)}</div>
                  </div>
                </div>
                {desc && <p className="rc-desc">{desc}</p>}
                <dl className="rc-specs">
                  <div><dt>Тариф</dt><dd>{p.name}</dd></div>
                  <div><dt>Процессор</dt><dd>{p.cpu} {coresWord(p.cpu)}</dd></div>
                  <div><dt>Память</dt><dd>{p.ram} ГБ</dd></div>
                  <div><dt>Диск</dt><dd>{p.disk} ГБ {p.diskType}</dd></div>
                  <div><dt>Где</dt><dd>{where}</dd></div>
                  <div><dt>IPv4</dt><dd>{p.ipv4 === false ? 'нет' : 'есть'}</dd></div>
                  {p.trafficTb != null && <div><dt>Трафик</dt><dd>{p.trafficTb} ТБ в месяц</dd></div>}
                </dl>
                {(pays.length > 0 || feats.length > 0) && (
                  <div className="res-chips">
                    {pays.map((c) => <span key={c} className="pchip pchip-pay">{c}</span>)}
                    {feats.map((c) => <span key={c} className="pchip">{c}</span>)}
                  </div>
                )}
                <div className="rc-foot">
                  <span className="rc-checked">Цена проверена {ruDateShort(p.verifiedAt)}{r.more > 0 && <> · <Link href={`/provajdery/${pr.slug}`} className="res-more">ещё {r.more} {plural(r.more, 'подходящий тариф', 'подходящих тарифа', 'подходящих тарифов')}</Link></>}</span>
                  <OutLink provider={pr} campaign={campaign} goalName="calc_click" className="btn btn-brass rc-cta">
                    Тарифы {pr.name} <span className="nowrap">от {price(p.priceRub)}</span>
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
