import { STATS } from '@/lib/data';
import { ruDate } from '@/lib/format';

/**
 * Честная плашка про статус данных. Исчезает сама, как только
 * в data/taxonomy.json поле meta.dataStatus сменится с "demo" на "live"
 */
export default function DemoStrip() {
  if (!STATS.demo) return null;
  return (
    <div className="demo-strip">
      <b>Демонстрационные данные.</b> Цены проставлены вручную {ruDate(STATS.verifiedAt)} и не
      являются офертой, до запуска их заменит парсер
    </div>
  );
}
