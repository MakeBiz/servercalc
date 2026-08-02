/**
 * Формула подбора. Веса лежат здесь и публикуются на странице /metodologiya:
 * читатель должен иметь возможность проверить, как считается процент соответствия.
 *
 * Партнёрская ставка в формулу НЕ входит ни одним слагаемым. Провайдеры без
 * партнёрства участвуют в подборе на равных. Это одновременно и позиция ФАС по
 * агрегаторам (единообразная подача = справочный материал, а не реклама),
 * и главный аргумент доверия
 */

export const WEIGHTS = {
  base: 42,
  task: { match: 25, miss: -12, skip: 6 },
  geo: { match: 22, miss: -26, skip: 6 },
  requirements: { all: 20, none: -24, skip: 6 },
  resources: { match: 8, miss: -10 },
  budget: { match: 10, miss: -10, skip: 0 },
  value: { max: 6, min: -6 },
  min: 6,
  max: 99,
};

export const WEIGHTS_TABLE = [
  { label: 'Базовый балл', value: '42', note: 'С него начинается любой провайдер' },
  { label: 'Соответствие задаче', value: '+25 / −12', note: 'Провайдер заявляет сценарий или нет. Задача не выбрана: +6' },
  { label: 'География', value: '+22 / −26', note: 'Есть локация в нужном регионе. География не важна: +6' },
  { label: 'Требования', value: '+20 / −24', note: 'Пропорционально доле закрытых требований. Ничего не отмечено: +6' },
  { label: 'Ресурсы перекрыты', value: '+8 / −10', note: 'Найден тариф не ниже заданных ядер и памяти' },
  { label: 'Попадание в бюджет', value: '+10 / −10', note: 'Цена подходящего тарифа укладывается в лимит' },
  { label: 'Цена за ресурс', value: '+6 … −6', note: 'Цена за гигабайт памяти относительно медианы по всей базе' },
  { label: 'Итог', value: '6 … 99', note: 'Результат ограничивается диапазоном, ноль и сто не выдаются' },
];

/** Медиана цены за гигабайт памяти по всей базе, точка отсчёта для оси «цена за ресурс» */
export function medianPricePerGb(plans) {
  const values = plans.filter((p) => p.ram > 0).map((p) => p.priceRub / p.ram).sort((a, b) => a - b);
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

const clamp = (n) => Math.max(WEIGHTS.min, Math.min(WEIGHTS.max, Math.round(n)));

function meetsRequirement(code, provider, plan) {
  if (code === 'nvme') return plan ? plan.diskType === 'NVMe' : (provider.requirements || []).includes('nvme');
  return Boolean(provider.features?.[code]);
}

/**
 * Выбор тарифа под запрос: сначала нужная география, потом перекрытие ресурсов,
 * потом требование к диску, потом попадание в бюджет, и только в конце цена
 */
function pickPlan(plans, query, geoCode) {
  if (!plans.length) return null;
  const wantNvme = (query.requirements || []).includes('nvme');
  const byPrice = (a, b) => a.priceRub - b.priceRub;

  const inGeo = geoCode ? plans.filter((p) => p.geo === geoCode) : plans;
  const pool = inGeo.length ? inGeo : plans;

  const covering = pool.filter((p) => p.ram >= query.ram && p.cpu >= query.cpu);
  const stage = covering.length ? covering : pool;

  const nvme = wantNvme ? stage.filter((p) => p.diskType === 'NVMe') : [];
  const stage2 = nvme.length ? nvme : stage;

  const inBudget = query.budget ? stage2.filter((p) => p.priceRub <= query.budget) : stage2;
  const finalPool = inBudget.length ? inBudget : stage2;

  // из тех, что перекрывают запрос и укладываются в бюджет, берём самый дешёвый:
  // человек просил конкретную конфигурацию, а не максимум за свои деньги
  return [...finalPool].sort(byPrice)[0];
}

export function scoreProvider(provider, plans, query, dict = {}) {
  const geo = query.geo && query.geo !== 'any' ? dict.geos?.find((g) => g.slug === query.geo) : null;
  const geoCode = geo?.code || null;
  const plan = pickPlan(plans, query, geoCode);
  const reasons = [];
  let score = WEIGHTS.base;

  // 1. задача
  if (query.task) {
    const task = dict.tasks?.find((t) => t.slug === query.task);
    const ok = (provider.tasks || []).includes(query.task);
    score += ok ? WEIGHTS.task.match : WEIGHTS.task.miss;
    reasons.push({
      code: 'task',
      ok,
      text: ok ? `Заявлен под задачу «${task?.name || query.task}»` : `Задача «${task?.name || query.task}» не заявлена провайдером`,
    });
  } else {
    score += WEIGHTS.task.skip;
  }

  // 2. география
  if (geoCode) {
    const ok = (provider.geos || []).includes(geoCode);
    score += ok ? WEIGHTS.geo.match : WEIGHTS.geo.miss;
    reasons.push({
      code: 'geo',
      ok,
      text: ok ? `Есть локация: ${geo.name}` : `Нет локации в регионе ${geo.name}`,
    });
  } else {
    score += WEIGHTS.geo.skip;
  }

  // 3. требования
  const reqs = query.requirements || [];
  if (reqs.length) {
    const met = reqs.filter((code) => meetsRequirement(code, provider, plan));
    const ratio = met.length / reqs.length;
    score += WEIGHTS.requirements.none + (WEIGHTS.requirements.all - WEIGHTS.requirements.none) * ratio;
    const missing = reqs.filter((c) => !met.includes(c));
    const nameOf = (c) => dict.requirements?.find((r) => r.code === c)?.short || c;
    reasons.push({
      code: 'requirements',
      ok: missing.length === 0,
      text: missing.length === 0
        ? `Закрывает все требования: ${reqs.map(nameOf).join(', ')}`
        : `Не закрывает: ${missing.map(nameOf).join(', ')}`,
    });
  } else {
    score += WEIGHTS.requirements.skip;
  }

  // 4. ресурсы
  const covers = plan ? plan.ram >= query.ram && plan.cpu >= query.cpu : false;
  score += covers ? WEIGHTS.resources.match : WEIGHTS.resources.miss;
  reasons.push({
    code: 'resources',
    ok: covers,
    text: plan
      ? covers
        ? `Тариф перекрывает ${query.cpu} ${query.cpu === 1 ? 'ядро' : 'ядра'} и ${query.ram} ГБ памяти`
        : `Ближайший тариф слабее запроса: ${plan.cpu} × ${plan.ram} ГБ`
      : 'Подходящих тарифов в базе нет',
  });

  // 5. бюджет
  if (query.budget && plan) {
    const ok = plan.priceRub <= query.budget;
    score += ok ? WEIGHTS.budget.match : WEIGHTS.budget.miss;
    reasons.push({
      code: 'budget',
      ok,
      text: ok ? 'Укладывается в бюджет' : `Дороже лимита на ${Math.round(plan.priceRub - query.budget)} ₽`,
    });
  }

  // 6. цена за ресурс относительно медианы по базе.
  // Объективная метрика, она же не даёт всем провайдерам получить одинаковый балл,
  // когда пользователь ещё ничего не выбрал
  if (plan && dict.medianPerGb && plan.ram > 0) {
    const ratio = plan.priceRub / plan.ram / dict.medianPerGb;
    const delta = Math.max(WEIGHTS.value.min, Math.min(WEIGHTS.value.max, (1 - ratio) * 10));
    score += delta;
    const diff = Math.round(Math.abs(1 - ratio) * 100);
    reasons.push({
      code: 'value',
      ok: delta >= 0,
      text:
        diff < 5
          ? 'Цена за гигабайт памяти на уровне медианы базы'
          : delta >= 0
            ? `Цена за гигабайт памяти ниже медианы на ${diff}%`
            : `Цена за гигабайт памяти выше медианы на ${diff}%`,
    });
  }

  return { provider, plan, score: clamp(score), reasons };
}

/** Полный прогон подбора. Возвращает отсортированный список */
export function runMatch(payload, query) {
  const dict = {
    tasks: payload.tasks,
    geos: payload.geos,
    requirements: payload.requirements,
    medianPerGb: medianPricePerGb(payload.plans),
  };
  const byProvider = new Map();
  for (const plan of payload.plans) {
    if (!byProvider.has(plan.providerSlug)) byProvider.set(plan.providerSlug, []);
    byProvider.get(plan.providerSlug).push(plan);
  }
  return payload.providers
    .map((provider) => scoreProvider(provider, byProvider.get(provider.slug) || [], query, dict))
    .filter((r) => r.plan)
    .sort((a, b) => b.score - a.score || a.plan.priceRub - b.plan.priceRub);
}

/** Значения формы по умолчанию */
export function defaultQuery(tasks) {
  return {
    task: null,
    geo: 'any',
    ram: 4,
    cpu: 2,
    budget: 2000,
    requirements: [],
  };
}
