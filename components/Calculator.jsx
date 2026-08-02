'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import OutLink from './OutLink';
import TaskIcon from './TaskIcon';
import { runMatch } from '@/lib/score';
import { price, plural, ruDate } from '@/lib/format';
import { goal, GOALS } from '@/lib/metrika';
import { CAMPAIGN } from '@/lib/utm';

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

export default function Calculator({ payload, presetTask = null, presetGeo = 'any', campaign = CAMPAIGN.calculator, compact = false }) {
  const presetTaskObj = payload.tasks.find((t) => t.slug === presetTask) || null;

  const [task, setTask] = useState(presetTask);
  const [geo, setGeo] = useState(presetGeo);
  const [requirements, setRequirements] = useState([]);
  const [ram, setRam] = useState(presetTaskObj?.ram ?? 4);
  const [cpu, setCpu] = useState(presetTaskObj?.cpu ?? 2);
  const [budget, setBudget] = useState(2000);
  const [showAll, setShowAll] = useState(false);
  const resourcesTouched = useRef(Boolean(presetTask));
  const started = useRef(false);

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

  const results = useMemo(() => runMatch(payload, query), [payload, query]);
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
    resourcesTouched.current = false;
  }

  return (
    <div id="podbor" className="anchor">
      <div className="calc">
        <div className="calc-head">
          <h2>Подбор сервера</h2>
          <span className="faint">
            {payload.stats.plans} {plural(payload.stats.plans, 'тариф', 'тарифа', 'тарифов')} у{' '}
            {payload.stats.providers} {plural(payload.stats.providers, 'провайдера', 'провайдеров', 'провайдеров')}
            , база проверена {ruDate(payload.stats.verifiedAt)}
          </span>
        </div>

        <div className="field">
          <div className="field-head">
            <span className="label">01 · Задача</span>
            {taskObj && <span className="field-val">рекомендуем {taskObj.cpu} × {taskObj.ram} ГБ</span>}
          </div>
          <div className="chips">
            {payload.tasks.map((t) => (
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
            <div className="seg">
              <button type="button" className={geo === 'any' ? 'on' : ''} onClick={() => { setGeo('any'); track('geo', { geo: 'any' }); }}>
                Не важна
              </button>
              {payload.geos.map((g) => (
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
            Комиссия провайдеров в формулу не входит.{' '}
            <Link href="/metodologiya" className="link-brass">Как считается процент</Link>
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
            Сбросить
          </button>
        </div>
      </div>

      <div className="results">
        <div className="results-head">
          <span className="label" style={{ margin: 0 }}>
            Результат подбора
          </span>
          <span className="faint">
            {results.length} {plural(results.length, 'провайдер', 'провайдера', 'провайдеров')} с подходящими тарифами
          </span>
        </div>

        {visible.length === 0 && (
          <p className="dim">
            Под такие условия в базе ничего нет. Попробуйте ослабить требования или поднять бюджет
          </p>
        )}

        {visible.map((r, i) => (
          <article className="rescard" key={r.provider.slug}>
            <div className="res-rank">{String(i + 1).padStart(2, '0')}</div>
            <div className="res-body">
              <div>
                <div className="res-title">
                  <strong>{r.provider.name}</strong>
                  {!r.provider.partner && <span className="badge badge-plain">без партнёрства</span>}
                  {r.provider.country === 'RU' && <span className="badge">Россия</span>}
                </div>
                <div className="res-plan">
                  {r.plan.name} · {r.plan.cpu} × {r.plan.ram} ГБ · {r.plan.disk} ГБ {r.plan.diskType}
                  {' · '}
                  {payload.geos.find((g) => g.code === r.plan.geo)?.name || r.plan.geo}
                </div>
                <div className="reasons">
                  {r.reasons.map((reason) => (
                    <span key={reason.code} className={reason.ok ? 'reason reason-ok' : 'reason reason-no'}>
                      {reason.ok ? '✓' : '✕'} {reason.text}
                    </span>
                  ))}
                </div>
              </div>

              <div className="res-side">
                <div className="res-score">
                  <span className="res-score-v">{r.score}</span>
                  <span className="res-bar">
                    <i style={{ width: `${r.score}%` }} />
                  </span>
                </div>
                <div className="res-price">{price(r.plan.priceRub)}<span className="faint"> в месяц</span></div>
                <OutLink provider={r.provider} campaign={campaign} className="btn btn-brass btn-sm btn-block">
                  {r.provider.partner ? 'Перейти' : 'На сайт'}
                </OutLink>
              </div>
            </div>
          </article>
        ))}

        {results.length > visible.length && (
          <button type="button" className="btn btn-ghost btn-sm mt" onClick={() => setShowAll(true)}>
            Показать остальные {results.length - visible.length}
          </button>
        )}

        {!compact && (
          <p className="disclosure" style={{ marginTop: 18 }}>
            Часть переходов партнёрские: при оформлении услуги мы получаем вознаграждение, цена для
            вас не меняется. На порядок в списке это не влияет,{' '}
            <Link href="/metodologiya">формула подбора открыта</Link>
          </p>
        )}
      </div>
    </div>
  );
}
