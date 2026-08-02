'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { goal, GOALS } from '@/lib/metrika';

const KEY = 'servercalc.cookie.v1';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!document.cookie.includes(`${KEY}=1`)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  function accept() {
    try {
      const year = 365 * 24 * 60 * 60;
      document.cookie = `${KEY}=1; path=/; max-age=${year}; samesite=lax`;
    } catch {
      /* приватный режим браузера */
    }
    goal(GOALS.cookieAccept);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="cookie" role="dialog" aria-label="Использование cookie">
      <p>
        Сайт использует cookie и Яндекс Метрику, чтобы понимать, какие страницы полезны читателям.
        Подробности в <Link href="/cookie">разделе про cookie</Link> и{' '}
        <Link href="/politika-konfidencialnosti">политике конфиденциальности</Link>
      </p>
      <button className="btn btn-brass btn-sm" onClick={accept}>
        Принять
      </button>
    </div>
  );
}
