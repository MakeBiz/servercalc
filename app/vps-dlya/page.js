import Link from 'next/link';
import PageHead from '@/components/PageHead';
import TaskIcon from '@/components/TaskIcon';
import JsonLd from '@/components/JsonLd';
import { TASKS, providersForTask, VISIBLE_PLANS } from '@/lib/data';
import { taskContent } from '@/lib/task-content';
import { price, plural } from '@/lib/format';
import { absUrl } from '@/lib/site';

export const metadata = {
  title: 'Подбор VPS под задачу',
  description:
    'Десять типовых сценариев с рекомендуемой конфигурацией и объяснением, почему именно столько ресурсов: сайт, магазин, 1С и Битрикс, база данных, боты, автоматизация, игры, разработка',
  alternates: { canonical: '/vps-dlya' },
};

export default function TasksPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Подбор VPS под задачу',
          numberOfItems: TASKS.length,
          itemListElement: TASKS.map((t, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: t.h1,
            url: absUrl(`/vps-dlya/${t.slug}`),
          })),
        }}
      />

      <PageHead
        eyebrow="Задачи"
        title="Подбор под задачу"
        lead="Сервер выбирают не по гигабайтам, а по тому, что на нём будет работать. На каждой странице собрана конфигурация с объяснением, откуда взялись цифры, и список того, что стоит проверить у провайдера до оплаты"
        crumbs={[{ href: '/vps-dlya', label: 'Задачи' }]}
        badges={
          <>
            <span className="badge badge-brass">{TASKS.length} сценариев</span>
            <span className="badge">конфигурация в трёх уровнях у каждого</span>
          </>
        }
      />

      <section className="section paper">
        <div className="wrap">
          <div className="cards cards-2">
            {TASKS.map((task) => {
              const providers = providersForTask(task.slug);
              const suited = VISIBLE_PLANS.filter(
                (p) => p.ram >= task.ram && p.cpu >= task.cpu && providers.some((x) => x.slug === p.providerSlug)
              ).sort((a, b) => a.priceRub - b.priceRub);
              const content = taskContent(task.slug);
              return (
                <Link key={task.slug} href={`/vps-dlya/${task.slug}`} className="card">
                  <div className="card-top">
                    <span className="card-ico"><TaskIcon slug={task.slug} size={24} /></span>
                    <span className="badge">{task.cpu} × {task.ram} ГБ</span>
                  </div>
                  <h3>{task.h1}</h3>
                  <p className="faint" style={{ margin: 0 }}>{task.intent}</p>
                  {content && (
                    <p className="dim" style={{ fontSize: '0.9rem', margin: 0 }}>
                      {content.why.split('.')[0]}
                    </p>
                  )}
                  <div className="card-foot">
                    <span className="faint">
                      {providers.length} {plural(providers.length, 'провайдер', 'провайдера', 'провайдеров')}
                    </span>
                    <span className="mono">{suited[0] ? `от ${price(suited[0].priceRub)}` : '—'}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="notice mt-lg">
            <strong>Чего здесь нет.</strong> Мы не заводим страницу под каждую комбинацию фильтров:
            это даёт тысячи почти одинаковых страниц, за которые поисковые системы наказывают.
            Каждая страница задачи существует, только если под неё есть отдельная рекомендация по
            ресурсам и понятный список проверок
          </div>
        </div>
      </section>
    </>
  );
}
