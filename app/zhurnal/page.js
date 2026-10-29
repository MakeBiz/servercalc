import Link from 'next/link';
import PageHead from '@/components/PageHead';
import JsonLd from '@/components/JsonLd';
import { allPosts, RUBRICS, rubricName } from '@/lib/news';
import { plural, ruDate } from '@/lib/format';
import { absUrl } from '@/lib/site';

export const metadata = {
  title: 'Журнал: как выбрать VPS и не переплатить',
  description:
    'Журнал ServerCalc: разборы и гайды по выбору VPS, сколько ресурсов нужно под задачу, NVMe или SSD, налоги и документы, как не переплатить за сервер',
  alternates: { canonical: '/zhurnal' },
};

export default function JournalPage() {
  const posts = allPosts().filter((p) => p.rubric === 'obzory');

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Журнал ServerCalc',
          numberOfItems: posts.length,
          itemListElement: posts.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: p.title,
            url: absUrl(`/novosti/${p.slug}`),
          })),
        }}
      />

      <PageHead
        eyebrow="Журнал"
        title="Журнал: как выбрать сервер"
        lead="Разборы, которые не устаревают за неделю: сколько ресурсов нужно под задачу, на что смотреть в тарифе, как считать налоги и документы. Новости рынка лежат в отдельном разделе"
        crumbs={[{ href: '/zhurnal', label: 'Журнал' }]}
        badges={
          <>
            <span className="badge badge-brass">
              {posts.length} {plural(posts.length, 'материал', 'материала', 'материалов')}
            </span>
            <span className="badge"><Link href="/novosti">Новости рынка</Link></span>
          </>
        }
      />

      <section className="section paper">
        <div className="wrap">
          {posts.length > 0 && (
            <Link href={`/novosti/${posts[0].slug}`} className="news-featured">
              <div className="nf-top">
                <span className="badge">{rubricName(posts[0].rubric)}</span>
                {posts[0].fresh && <span className="badge badge-brass">Новое</span>}
              </div>
              <div className="nf-body">
                <h2 className="nf-featitle">{posts[0].title}</h2>
                <div className="nf-right">
                  <p className="dim">{posts[0].description}</p>
                  <div className="between">
                    <span className="faint">{ruDate(posts[0].date)}{posts[0].updated ? `, обновлено ${ruDate(posts[0].updated)}` : ''}</span>
                    <span className="faint mono">{posts[0].minutes} мин</span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div className="cards cards-2">
            {posts.slice(1).map((post) => (
              <Link key={post.slug} href={`/novosti/${post.slug}`} className="card">
                <div className="card-top">
                  <span className="badge">{rubricName(post.rubric)}</span>
                  {post.fresh && <span className="badge badge-brass">Новое</span>}
                </div>
                <h3 style={{ fontSize: '1.15rem' }}>{post.title}</h3>
                <p className="faint" style={{ margin: 0 }}>{post.description}</p>
                <div className="card-foot">
                  <span className="faint">{ruDate(post.date)}</span>
                  <span className="faint">{post.minutes} мин</span>
                </div>
              </Link>
            ))}
          </div>

          {posts.length === 0 && (
            <div className="notice">
              <strong>Пока пусто.</strong> Материалы появятся здесь сразу после первой публикации
            </div>
          )}

        </div>
      </section>
    </>
  );
}
