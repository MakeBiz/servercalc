'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import OutLink from './OutLink';
import TaskIcon from './TaskIcon';
import { runMatch, featuredResult } from '@/lib/score';
import { price, plural, ruDate, termShort } from '@/lib/format';
import { goal, GOALS } from '@/lib/metrika';
import { CAMPAIGN } from '@/lib/utm';
import { readParams, num, list, writeParams } from '@/lib/url-state';

const RAM_STEPS = [1, 2, 4, 8, 16, 32, 64];
const CPU_STEPS = [1, 2, 4, 6, 8, 12, 16];
const BUDGET_MIN = 200;
const BUDGET_MAX = 10000;
const BUDGET_STEP = 100;

function nearestIndex(steps, value) {
  let best = 0;
  for (let i = 0; i < steps.length; i += 1) {
    if (Math.abs(steps[i] - value) < Math.abs(steps[best] - value)) best = i;
  }
  return best;
}

export default function Calculator({ payload, presetTask = null, presetGeo = 'any', campaign = CAMPAIGN.calculator, compact = false, split = false }) {
  const presetTaskObj = payload.tasks.find((t) => t.slug === presetTask) || null;

  const [task, setTask] = useState(presetTask);
  const [geo, setGeo] = useState(presetGeo);
  const [requirements, setRequirements] = useState([]);
  const [ram, setRam] = useState(presetTaskObj?.ram ?? 4);
  const [cpu, setCpu] = useState(presetTaskObj?.cpu ?? 2);
  const [budget, setBudget] = useState(2000);
  const [showAll, setShowAll] = useState(false);
  const [sort, setSort] = useState('fit');
  const [quick, setQuick] = useState([]);
  const resourcesTouched = useRef(Boolean(presetTask));
  const started = useRef(false);
  const [copied, setCopied] = useState(false);
  // до первого чтения адреса ничего в него не пишем, иначе на монтировании
  // затрём параметры, с которыми человек пришёл по ссылке
  const restored = useRef(false);

  // восстановление подбора из адреса страницы
  useEffect(() => {
    const p = readParams();
    if ([...p.keys()].some((k) => ['task', 'geo', 'ram', 'cpu', 'budget', 'req'].includes(k))) {
      const t = p.get('task');
      if (t && payload.tasks.some((x) => x.slug === t)) setTask(t);
      const g = p.get('geo');
      if (g && (g === 'any' || payload.geos.some((x) => x.slug === g))) setGeo(g);
      const r = num(p, 'ram', null);
      if (r && RAM_STEPS.includes(r)) { setRam(r); resourcesTouched.current = true; }
      const c = num(p, 'cpu', null);
      if (c && CPU_STEPS.includes(c)) { setCpu(c); resourcesTouched.current = true; }
      const b = num(p, 'budget', null);
      if (b && b >= BUDGET_MIN && b <= BUDGET_MAX) setBudget(b);
      const reqs = list(p, 'req');
      if (reqs) setRequirements(reqs.filter((code) => payload.requirements.some((x) => x.code === code)));
    }
    restored.current = true;
  }, [payload]);

  // запись текущего состояния в адрес: ссылку можно переслать
  useEffect(() => {
    if (!restored.current) return;
    writeParams({
      task: task || null,
      geo: geo && geo !== 'any' ? geo : null,
      ram: ram === 4 && !resourcesTouched.current ? null : ram,
      cpu: cpu === 2 && !resourcesTouched.current ? null : cpu,
      budget: budget === 2000 ? null : budget,
      req: requirements.length ? requirements.join(',') : null,
    });
  }, [task, geo, ram, cpu, budget, requirements]);

  function copyLink() {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done).catch(() => {});
    else done();
  }

  const track = useCallback((what, extra) => {
    if (!started.current) {
      started.current = true;
      goal(GOALS.calcStart);
    }
    goal(GOALS.calcResult, { field: what, ...extra });
  }, []);

  function chooseTask(slug) {
    const next = task === slug ? null : slug;
    setTask(next);
    const t = payload.tasks.find((x) => x.slug === next);
    if (t && !resourcesTouched.current) {
      setRam(t.ram);
      setCpu(t.cpu);
    }
    setShowAll(false);
    track('task', { task: next || 'none' });
  }

  function toggleRequirement(code) {
    setRequirements((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
    track('requirements', { req: code });
  }

  const query = useMemo(
    () => ({ task, geo, ram, cpu, budget: budget >= BUDGET_MAX ? null : budget, requirements }),
    [task, geo, ram, cpu, budget, requirements]
  );

  const pool = useMemo(() => {
    if (!quick.length) return payload;
    const providers = payload.providers.filter((p) =>
      (!quick.includes('ru') || p.country === 'RU') && (!quick.includes('win') || (p.tasks || []).includes('windows')));
    return { ...payload, providers };
  }, [payload, quick]);
  const results = useMemo(() => runMatch(pool, query, sort), [pool, query, sort]);
  const featured = useMemo(() => featuredResult(runMatch(payload, query)), [payload, query]);
  const visible = showAll ? results : results.slice(0, 6);
  const taskObj = payload.tasks.find((t) => t.slug === task) || null;
  const budgetLabel = budget >= BUDGET_MAX ? 'без ограничения' : `до ${price(budget)} в месяц`;

  function reset() {
    setTask(null);
    setGeo('any');
    setRequirements([]);
    setRam(4);
    setCpu(2);
    setBudget(2000);
    setShowAll(false);
    setQuick([]);
    setSort('fit');
    resourcesTouched.current = false;
  }

  const QUICK = [
    { key: 'b500', label: 'До 500 ₽', on: budget <= 500, toggle: () => setBudget(budget <= 500 ? 2000 : 500) },
    { key: 'ru', label: 'Российский провайдер', on: quick.includes('ru'), toggle: () => setQuick((q) => (q.includes('ru') ? q.filter((x) => x !== 'ru') : [...q, 'ru'])) },
    { key: 'win', label: 'С Windows', on: quick.includes('win'), toggle: () => setQuick((q) => (q.includes('win') ? q.filter((x) => x !== 'win') : [...q, 'win'])) },
    { key: 'nvme', label: 'Только NVMe', on: requirements.includes('nvme'), toggle: () => toggleRequirement('nvme') },
    { key: 'hourly', label: 'Почасовая оплата', on: requirements.includes('hourly'), toggle: () => toggleRequirement('hourly') },
  ];

  const fitText = (r) => {
    if (!r.fit.total) return 'Подходит под запрос';
    if (r.fit.met === r.fit.total) return `Подходит по ${r.fit.met} из ${r.fit.total} условий`;
    const miss = r.reasons.find((x) => !x.ok && ['task', 'geo', 'requirements', 'resources', 'budget'].includes(x.code));
    return `Подходит по ${r.fit.met} из ${r.fit.total}${miss ? `: ${miss.text.charAt(0).toLowerCase()}${miss.text.slice(1)}` : ''}`;
  };
  const termTotal = (p) => (p.term && p.term > 1 ? `оплата сразу ${price(Math.round(p.priceRub * p.term))} за ${p.term === 12 ? 'год' : p.term === 24 ? '2 года' : p.term + ' мес.'}` : 'оплата помесячно');

  return (
    <div id="podbor" className={split ? 'anchor calc-split' : 'anchor'}>
      <div className="calc">
        <div className="calc-head">
          <h2>Подбор сервера</h2>
          <span className="faint">
            {payload.stats.plans} {plural(payload.stats.plans, 'тариф', 'тарифа', 'тарифов')} с
            проверенной ценой, база проверена {ruDate(payload.stats.verifiedAt)}
          </span>
        </div>

        <div className="field">
          <div className="field-head">
            <span className="label">01 · Задача</span>
            {taskObj && <span className="field-val">рекомендуем {taskObj.cpu} × {taskObj.ram} ГБ</span>}
          </div>
          <div className="chips">
            {payload.tasks.filter((t) => !t.hideInCalc).map((t) => (
              <button
                key={t.slug}
                type="button"
                className={task === t.slug ? 'chip on' : 'chip'}
                aria-pressed={task === t.slug}
                onClick={() => chooseTask(t.slug)}
              >
                <TaskIcon slug={t.slug} />
                {t.name}
              </button>
            ))}
          </div>
          {taskObj && <p className="faint" style={{ marginTop: 10 }}>{taskObj.intent}</p>}
        </div>

        <div className="calc-cols">
          <div className="field span-2">
            <div className="field-head">
              <span className="label">02 · География</span>
            </div>
            {split ? (
              <div className="chips">
                <button
                  type="button"
                  className={geo === 'any' ? 'chip on' : 'chip'}
                  aria-pressed={geo === 'any'}
                  onClick={() => { setGeo('any'); track('geo', { geo: 'any' }); }}
                >
                  Не важна
                </button>
                {payload.geos.filter((g) => !g.hideInCalc).map((g) => (
                  <button
                    key={g.slug}
                    type="button"
                    className={geo === g.slug ? 'chip on' : 'chip'}
                    aria-pressed={geo === g.slug}
                    onClick={() => { setGeo(g.slug); track('geo', { geo: g.slug }); }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="seg">
                <button type="button" className={geo === 'any' ? 'on' : ''} onClick={() => { setGeo('any'); track('geo', { geo: 'any' }); }}>
                  Не важна
                </button>
                {payload.geos.filter((g) => !g.hideInCalc).map((g) => (
                  <button
                    key={g.slug}
                    type="button"
                    className={geo === g.slug ? 'on' : ''}
                    onClick={() => { setGeo(g.slug); track('geo', { geo: g.slug }); }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="field">
            <div className="field-head">
              <span className="label">03 · Память</span>
              <span className="field-val">{ram} ГБ</span>
            </div>
            <input
              className="range"
              type="range"
              min={0}
              max={RAM_STEPS.length - 1}
              step={1}
              value={nearestIndex(RAM_STEPS, ram)}
              onChange={(e) => { resourcesTouched.current = true; setRam(RAM_STEPS[Number(e.target.value)]); }}
              onMouseUp={() => track('ram', { ram })}
              onTouchEnd={() => track('ram', { ram })}
              aria-label="Объём оперативной памяти"
            />
            <div className="range-scale">
              <span>1 ГБ</span>
              <span>64 ГБ</span>
            </div>
          </div>

          <div className="field">
            <div className="field-head">
              <span className="label">04 · Ядра</span>
              <span className="field-val">{cpu} {plural(cpu, 'ядро', 'ядра', 'ядер')}</span>
            </div>
            <input
              className="range"
              type="range"
              min={0}
              max={CPU_STEPS.length - 1}
              step={1}
              value={nearestIndex(CPU_STEPS, cpu)}
              onChange={(e) => { resourcesTouched.current = true; setCpu(CPU_STEPS[Number(e.target.value)]); }}
              onMouseUp={() => track('cpu', { cpu })}
              onTouchEnd={() => track('cpu', { cpu })}
              aria-label="Количество ядер"
            />
            <div className="range-scale">
              <span>1</span>
              <span>16</span>
            </div>
          </div>

          <div className="field">
            <div className="field-head">
              <span className="label">05 · Бюджет</span>
              <span className="field-val">{budgetLabel}</span>
            </div>
            <input
              className="range"
              type="range"
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={BUDGET_STEP}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              onMouseUp={() => track('budget', { budget })}
              onTouchEnd={() => track('budget', { budget })}
              aria-label="Бюджет в месяц"
            />
            <div className="range-scale">
              <span>200 ₽</span>
              <span>без лимита</span>
            </div>
          </div>

          <div className="field">
            <div className="field-head">
              <span className="label">06 · Требования</span>
              {requirements.length > 0 && <span className="field-val">выбрано {requirements.length}</span>}
            </div>
            <div className="chips">
              {payload.requirements.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  className={requirements.includes(r.code) ? 'chip on' : 'chip'}
                  aria-pressed={requirements.includes(r.code)}
                  onClick={() => toggleRequirement(r.code)}
                  title={r.note}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="calc-foot">
          <span className="faint">
            Комиссия провайдеров на порядок не влияет.{' '}
            <Link href="/metodologiya" className="link-brass">Как мы считаем</Link>
          </span>
          <div className="row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink}>
              {copied ? 'Ссылка скопирована' : 'Скопировать подбор'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
              Сбросить
            </button>
          </div>
        </div>
      </div>

      <div className="results">
        <div className="results-head">
          <span className="faint">
            {results.length} {plural(results.length, 'подходящий тариф', 'подходящих тарифа', 'подходящих тарифов')}
          </span>
          <div className="sortseg" role="group" aria-label="Сортировка">
            <button type="button" className={sort === 'fit' ? 'on' : ''} aria-pressed={sort === 'fit'} onClick={() => { setSort('fit'); track('sort', { sort: 'fit' }); }}>Подходящие</button>
            <button type="button" className={sort === 'price' ? 'on' : ''} aria-pressed={sort === 'price'} onClick={() => { setSort('price'); track('sort', { sort: 'price' }); }}>Дешёвые</button>
          </div>
        </div>

        <div className="quick" aria-label="Быстрые фильтры">
          {QUICK.map((q) => (
            <button key={q.key} type="button" className={q.on ? 'qchip on' : 'qchip'} aria-pressed={q.on} onClick={() => { q.toggle(); setShowAll(false); track('quick', { quick: q.key }); }}>
              {q.label}
            </button>
          ))}
        </div>

        {featured && !compact && (
          <div className="featured">
            <span className="featured-tag">Реклама</span>
            <span className="featured-text">
              <strong>{featured.provider.name}</strong> · {featured.plan.name} · {featured.plan.cpu} × {featured.plan.ram} ГБ · {price(featured.plan.priceRub)} в месяц
            </span>
            <OutLink provider={featured.provider} campaign={`${campaign}_featured`} goalName="calc_click" className="btn btn-ghost btn-sm">
              Перейти
            </OutLink>
          </div>
        )}

        {visible.length === 0 && (
          <p className="dim">
            Под такие условия в базе ничего нет. Попробуйте ослабить требования, снять быстрые фильтры или поднять бюджет
          </p>
        )}

        {visible.map((r, i) => {
          const full = r.fit.met === r.fit.total;
          const geoName = payload.geos.find((g) => g.code === r.plan.geo)?.name || r.plan.geo;
          return (
            <article className="rescard" key={r.provider.slug}>
              <div className="res-rank">{i + 1}</div>
              <div className="res-body">
                <div>
                  <div className="res-title">
                    <strong>{r.provider.name}</strong>
                    {r.provider.partner ? <span className="badge">Партнёр</span> : <span className="badge badge-plain">без партнёрства</span>}
                  </div>
                  <div className="res-plan">
                    {r.plan.name} · {r.plan.cpu} × {r.plan.ram} ГБ · {r.plan.disk} ГБ {r.plan.diskType} · {geoName}
                  </div>
                  <div className={full ? 'res-fit' : 'res-fit res-fit-part'}>{full ? '✓ ' : ''}{fitText(r)}</div>
                  <div className="reasons">
                    {r.reasons.filter((reason) => reason.ok && !['resources', 'budget'].includes(reason.code)).map((reason) => (
                      <span key={reason.code} className="reason reason-ok">✓ {reason.text}</span>
                    ))}
                  </div>
                </div>

                <div className="res-side">
                  <div className="res-price">{price(r.plan.priceRub)}<span className="faint"> в месяц</span></div>
                  <div className="res-terms faint">{termTotal(r.plan)}</div>
                  <OutLink provider={r.provider} campaign={campaign} goalName="calc_click" className="btn btn-brass btn-block">
                    {`Тарифы ${r.provider.name}`}
                  </OutLink>
                </div>
              </div>
            </article>
          );
        })}

        {results.length > visible.length && (
          <button type="button" className="btn btn-ghost btn-sm mt" onClick={() => setShowAll(true)}>
            Показать остальные {results.length - visible.length}
          </button>
        )}

        {!compact && (
          <p className="disclosure" style={{ marginTop: 18 }}>
            «Партнёр» значит, что при оформлении услуги по ссылке мы получим вознаграждение, цена для
            вас не меняется. Порядок в списке задают только условия запроса и цена,{' '}
            <Link href="/metodologiya">как мы считаем</Link>
          </p>
        )}
      </div>
    </div>
  );
}
