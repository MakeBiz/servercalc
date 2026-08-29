'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import { SITE_NAME } from '@/lib/site';
import { goal } from '@/lib/metrika';

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

  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    if (next === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('sc-theme', next); } catch {}
    setTheme(next);
    goal(next === 'light' ? 'theme_to_light' : 'theme_to_dark');
  };

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
          type="button"
          role="switch"
          aria-checked={theme === 'light'}
          className="theme-switch"
          onClick={toggleTheme}
          aria-label="Переключить светлую и тёмную тему"
          title="Светлая / тёмная тема"
        >
          <svg className="ts-moon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          <svg className="ts-sun" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 2.6v2.3M12 19.1v2.3M4.5 4.5l1.6 1.6M17.9 17.9l1.6 1.6M2.6 12h2.3M19.1 12h2.3M4.5 19.5l1.6-1.6M17.9 6.1l1.6-1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="ts-knob" aria-hidden="true" />
        </button>

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
