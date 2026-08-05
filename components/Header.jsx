'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import { SITE_NAME } from '@/lib/site';

const NAV = [
  { href: '/catalog', label: 'Каталог' },
  { href: '/provajdery', label: 'Провайдеры' },
  { href: '/vps-dlya', label: 'Задачи' },
  { href: '/vps', label: 'География' },
  // пункт «Акции» подставляется из layout только когда в базе есть живые акции:
  // пустой раздел в меню хуже, чем его отсутствие
  { href: '/akcii', label: 'Акции', optional: true },
  { href: '/novosti', label: 'Новости' },
  { href: '/metodologiya', label: 'Методология' },
];

export default function Header({ showPromos = false }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || '/';

  // сравнение по сегментам: иначе /vps подсвечивался бы на /vps-dlya/...
  const isActive = (href) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <header className="header">
      <div className="wrap header-in">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <Logo />
          <span>Server<em>Calc</em></span>
        </Link>

        <nav className={open ? 'nav nav-open' : 'nav'}>
          {NAV.filter((item) => !item.optional || showPromos).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? 'active' : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/#podbor" className="btn btn-brass btn-sm header-cta">
          Подобрать сервер
        </Link>

        <button
          className="burger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Закрыть меню' : `Открыть меню ${SITE_NAME}`}
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
            {open ? (
              <path d="M2 2l14 10M16 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M0 1h18M0 7h18M0 13h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>
    </header>
  );
}
