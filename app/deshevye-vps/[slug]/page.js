import { notFound } from 'next/navigation';
import CheapLanding, { cheapMeta } from '@/components/CheapLanding';
import { CHEAP_SLUGS, cheapPage } from '@/lib/cheap-pages';

export function generateStaticParams() {
  return CHEAP_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const c = cheapPage(slug);
  return c ? cheapMeta(c, `/deshevye-vps/${slug}`) : {};
}

export default async function CheapPage({ params }) {
  const { slug } = await params;
  const c = cheapPage(slug);
  if (!c) notFound();
  return <CheapLanding c={c} path={`/deshevye-vps/${slug}`} />;
}
