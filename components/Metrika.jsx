import Script from 'next/script';
import { METRIKA_ID } from '@/lib/site';

/**
 * Яндекс Метрика. Счётчик один на весь сайт, вставляется в корневом макете.
 * Цели, которые отправляются из интерфейса, перечислены в lib/metrika.js
 */
export default function Metrika() {
  const code = `
(function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}', 'ym');
ym(${METRIKA_ID}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
`.trim();

  return (
    <>
      {/* Сквозная аналитика: счётчик первопартийный, идёт через rewrite /px/* */}
      <Script id="px-counter" src="https://vps-analytics.vercel.app/px/t.js" strategy="afterInteractive" data-site="servercalc-ru" data-endpoint="https://vps-analytics.vercel.app/px" />
      <Script id="ym-counter" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: code }} />
      <noscript>
        <div>
          <img src={`https://mc.yandex.ru/watch/${METRIKA_ID}`} style={{ position: 'absolute', left: '-9999px' }} alt="" />
        </div>
      </noscript>
    </>
  );
}
