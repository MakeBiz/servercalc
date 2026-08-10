import Link from 'next/link';
import PageHead from '@/components/PageHead';
import JsonLd from '@/components/JsonLd';
import { allPosts, RUBRICS, rubricName } from '@/lib/news';
import { plural } from '@/lib/format';
import { absUrl } from '@/lib/site';

export const metadata = {
  title: 'Новости и разборы',
  description:
    'Разборы по выбору сервера, новости рынка хостинга и журнал изменений цен в каталоге. Каждый материал решает конкретный вопрос читателя, а не пересказывает пресс-релиз',
  alternates: { canonical: '/novosti' },
};

export default function NewsPage() {
  const posts = allPosts();

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Новости и разборы',
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
        eyebrow="Публикации"
        title="Новости и разборы"
        lead="Не новостная лента ради ленты: каждый материал отвечает на вопрос, который возникает при выборе сервера. Отдельная рубрика отведена под изменения цен в каталоге"
        crumbs={[{ href: '/novosti', label: 'Новости' }]}
        badges={
          <>
            <span className="badge badge-brass">
              {posts.length} {plural(posts.length, 'материал', 'материала', 'материалов')}
            </span>
            {RUBRICS.map((r) => (
              <span className="badge" key={r.slug}>
                {r.name}
              </span>
            ))}
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
                    <span className="faint">{posts[0].author}</span>
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
                  <span className="faint">{post.author}</span>
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

          <div className="grid-3 mt-lg">
            {RUBRICS.map((r) => (
              <div className="notice" key={r.slug}>
                <strong>{r.name}.</strong> {r.note}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
