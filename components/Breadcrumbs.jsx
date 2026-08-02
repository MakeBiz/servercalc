import Link from 'next/link';
import JsonLd from './JsonLd';
import { absUrl } from '@/lib/site';

/** items: [{ href, label }, ...], последний элемент отображается без ссылки */
export default function Breadcrumbs({ items = [] }) {
  const all = [{ href: '/', label: 'Главная' }, ...items];

  return (
    <>
      <nav className="crumbs" aria-label="Хлебные крошки">
        {all.map((item, i) => {
          const last = i === all.length - 1;
          return (
            <span key={item.href + i} style={{ display: 'inline-flex', gap: 8 }}>
              {last ? <span>{item.label}</span> : <Link href={item.href}>{item.label}</Link>}
              {!last && <span className="sep">/</span>}
            </span>
          );
        })}
      </nav>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: all.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.label,
            item: absUrl(item.href),
          })),
        }}
      />
    </>
  );
}
