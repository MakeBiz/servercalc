import { ruDate, agoLabel, plural } from '@/lib/format';
import { STATS } from '@/lib/data';

/**
 * Плашка свежести. Главный дифференциатор проекта: у 11 из 13 проверенных
 * конкурентов даты проверки цен нет вообще
 */
export default function Freshness({ date, age, compact = false }) {
  const iso = date || STATS.verifiedAt;
  const days = typeof age === 'number' ? age : null;
  const stale = days != null && days > STATS.staleDays;

  return (
    <span className={stale ? 'freshness stale' : 'freshness'}>
      <span className="dot" />
      {compact ? (
        <span className="mono">{ruDate(iso)}</span>
      ) : (
        <span>
          цена проверена {ruDate(iso)}
          {days != null && <span className="faint">, {agoLabel(days)}</span>}
        </span>
      )}
    </span>
  );
}

export function FreshnessRule() {
  return (
    <p className="faint">
      Тариф, который не проверялся дольше {STATS.staleDays}{' '}
      {plural(STATS.staleDays, 'дня', 'дней', 'дней')}, автоматически скрывается с витрины, а не
      показывается со старой ценой
    </p>
  );
}
