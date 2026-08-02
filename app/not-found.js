import Link from 'next/link';

export const metadata = {
  title: 'Страница не найдена',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="hero ink" style={{ paddingBottom: 96 }}>
      <div className="wrap hero-in">
        <div className="eyebrow">
          <span className="label label-brass">404</span>
        </div>
        <h1 className="display" style={{ maxWidth: 720 }}>
          Такой страницы нет
        </h1>
        <p className="lead">
          Возможно, адрес набран с ошибкой или материал был перенесён. Отсюда можно вернуться к
          подбору или открыть каталог тарифов
        </p>
        <div className="row mt">
          <Link href="/" className="btn btn-brass">
            На главную
          </Link>
          <Link href="/catalog" className="btn btn-ghost">
            Каталог тарифов
          </Link>
          <Link href="/provajdery" className="btn btn-ghost">
            Провайдеры
          </Link>
        </div>
      </div>
    </section>
  );
}
