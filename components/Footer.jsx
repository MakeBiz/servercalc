import Link from 'next/link';
import Logo from './Logo';
import { SITE, SITE_NAME } from '@/lib/site';
import { STATS } from '@/lib/data';
import { ruDate } from '@/lib/format';

export default function Footer() {
  const year = new Date().getUTCFullYear();

  return (
    <footer className="footer ink-deep">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <Link href="/" className="brand" style={{ marginBottom: 14 }}>
              <Logo size={24} />
              <span>Server<em>Calc</em></span>
            </Link>
            <p style={{ maxWidth: 320, marginTop: 12 }}>
              Справочный каталог виртуальных серверов. Подбираем по задаче, ресурсам и географии,
              показываем дату проверки каждой цены
            </p>
            <p style={{ marginTop: 14 }}>
              <span className="badge badge-brass">база проверена {ruDate(STATS.verifiedAt)}</span>
            </p>
          </div>

          <div>
            <h4>Подбор</h4>
            <ul>
              <li><Link href="/#podbor">Калькулятор</Link></li>
              <li><Link href="/catalog">Каталог тарифов</Link></li>
              <li><Link href="/vps-dlya">Подбор под задачу</Link></li>
              <li><Link href="/vps">Подбор по географии</Link></li>
            </ul>
          </div>

          <div>
            <h4>Провайдеры</h4>
            <ul>
              <li><Link href="/provajdery">Все провайдеры</Link></li>
              <li><Link href="/provajdery/timeweb">Timeweb Cloud</Link></li>
              <li><Link href="/provajdery/adminvps">AdminVPS</Link></li>
              <li><Link href="/provajdery/hostman">Hostman</Link></li>
            </ul>
          </div>

          <div>
            <h4>О сервисе</h4>
            <ul>
              <li><Link href="/metodologiya">Методология подбора</Link></li>
              <li><Link href="/o-proekte">О проекте</Link></li>
              <li><Link href="/novosti">Новости и обзоры</Link></li>
              <li><Link href="/politika-konfidencialnosti">Политика конфиденциальности</Link></li>
              <li><Link href="/cookie">Использование cookie</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            {year} {SITE_NAME}, {SITE.domain}
          </span>
          <span style={{ maxWidth: 620 }}>
            Сервис публикует справочную информацию о тарифах сторонних провайдеров. Часть переходов
            к провайдерам партнёрские: если вы оформите услугу, мы получим вознаграждение, цена для
            вас при этом не меняется. Размер вознаграждения не влияет на подбор,{' '}
            <Link href="/metodologiya" style={{ textDecoration: 'underline' }}>
              формула открыта
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
