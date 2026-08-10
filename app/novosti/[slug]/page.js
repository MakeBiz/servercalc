import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHead from '@/components/PageHead';
import JsonLd from '@/components/JsonLd';
import OutLink from '@/components/OutLink';
import { allPosts, getPost, rubricName } from '@/lib/news';
import { getProvider, minPriceOf } from '@/lib/data';
import { price } from '@/lib/format';
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

  // Материал может быть привязан к провайдеру полем provider во фронтматтере.
  // Тогда внизу появляется переход на его сайт: партнёрский с меткой, если
  // партнёрка подключена, и обычный, если у нас с провайдером ничего нет
  const provider = post.provider ? getProvider(post.provider) : null;
  const providerMin = provider ? minPriceOf(provider.slug) : null;

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
            {/* Даты в интерфейсе не показываем по решению владельца: материал
                не должен выглядеть протухшим. В разметке для поисковиков
                datePublished остаётся — там она полезна и читателю не видна */}
            {post.fresh && <span className="badge badge-brass">Новое</span>}
            <span className="badge">{post.author}</span>
            <span className="badge">{post.minutes} мин чтения</span>
          </>
        }
      />

      <section className="section paper">
        <div className="wrap-narrow">
          <article className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />

          {provider ? (
            <div className="cta-provider ink">
              <div className="eyebrow">
                <span className="label label-brass">Провайдер из этого материала</span>
              </div>
              <div className="between mb">
                <div>
                  <h3 style={{ margin: 0 }}>{provider.name}</h3>
                  {providerMin && (
                    <p className="faint" style={{ margin: '6px 0 0' }}>
                      тарифы в нашей базе от {price(providerMin)} в месяц
                    </p>
                  )}
                </div>
              </div>
              <div className="row">
                <OutLink
                  provider={provider}
                  // формат метки принят владельцем: раздел_провайдер, например news_timeweb.
                  // Дополнительно передаём адрес материала в utm_content, чтобы в кабинете
                  // партнёрки было видно, какая именно статья привела переход
                  campaign={`news_${provider.slug}`}
                  content={slug}
                  className="btn btn-brass"
                >
                  Перейти на сайт {provider.name}
                </OutLink>
                <Link href={`/provajdery/${provider.slug}`} className="btn btn-ghost">
                  Обзор и тарифы
                </Link>
                <Link href="/#podbor" className="btn btn-ghost">
                  Подобрать сервер
                </Link>
              </div>
              <p className="disclosure">
                {provider.affiliateStatus === 'active'
                  ? 'Переход партнёрский: если вы оформите услугу, мы получим вознаграждение. Цена для вас при этом не меняется, а на позицию провайдера в подборе это не влияет'
                  : 'Обычная ссылка на сайт провайдера, партнёрских отношений с ним у нас нет'}
              </p>
            </div>
          ) : (
            <div className="row" style={{ marginTop: 40 }}>
              <Link href="/#podbor" className="btn btn-brass">
                Подобрать сервер
              </Link>
              <Link href="/catalog" className="btn btn-ghost">
                Каталог тарифов
              </Link>
            </div>
          )}
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
                    {p.fresh && <span className="badge badge-brass">Новое</span>}
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
