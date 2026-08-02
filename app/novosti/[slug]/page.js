import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHead from '@/components/PageHead';
import JsonLd from '@/components/JsonLd';
import { allPosts, getPost, rubricName } from '@/lib/news';
import { ruDate } from '@/lib/format';
import { absUrl, SITE_NAME } from '@/lib/site';

export function generateStaticParams() {
  return allPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/novosti/${slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      modifiedTime: post.updated || post.date,
    },
  };
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const others = allPosts().filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          dateModified: post.updated || post.date,
          author: { '@type': 'Organization', name: post.author },
          publisher: { '@type': 'Organization', name: SITE_NAME },
          mainEntityOfPage: absUrl(`/novosti/${slug}`),
          inLanguage: 'ru-RU',
        }}
      />

      <PageHead
        eyebrow={rubricName(post.rubric)}
        title={post.title}
        lead={post.description}
        crumbs={[
          { href: '/novosti', label: 'Новости' },
          { href: `/novosti/${slug}`, label: post.title },
        ]}
        badges={
          <>
            <span className="badge badge-brass">{ruDate(post.date)}</span>
            <span className="badge">{post.author}</span>
            <span className="badge">{post.minutes} мин чтения</span>
            {post.updated && <span className="badge">обновлено {ruDate(post.updated)}</span>}
          </>
        }
      />

      <section className="section paper">
        <div className="wrap-narrow">
          <article className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />

          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '44px 0 26px' }} />

          <div className="row">
            <Link href="/#podbor" className="btn btn-brass">
              Подобрать сервер
            </Link>
            <Link href="/catalog" className="btn btn-ghost">
              Каталог тарифов
            </Link>
          </div>
        </div>
      </section>

      {others.length > 0 && (
        <section className="section-tight paper-alt">
          <div className="wrap">
            <div className="eyebrow">
              <span className="label">Читать дальше</span>
            </div>
            <div className="cards cards-2">
              {others.map((p) => (
                <Link key={p.slug} href={`/novosti/${p.slug}`} className="card">
                  <div className="card-top">
                    <span className="badge">{rubricName(p.rubric)}</span>
                    <span className="faint mono">{ruDate(p.date)}</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem' }}>{p.title}</h3>
                  <p className="faint" style={{ margin: 0 }}>{p.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
