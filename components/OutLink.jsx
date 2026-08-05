'use client';

import { providerLink } from '@/lib/utm';
import { goal, GOALS } from '@/lib/metrika';

/**
 * Единственная точка выхода на провайдера.
 * Здесь и только здесь проставляются UTM, атрибуты rel и цель Метрики.
 * Если провайдер без партнёрства, отдаётся обычная ссылка на его сайт
 */
export default function OutLink({
  provider,
  campaign,
  content,
  children,
  className = 'btn btn-brass btn-sm',
  showDisclosure = false,
}) {
  const { href, rel, partner } = providerLink(provider, { campaign, content });
  if (!href) return null;

  return (
    <>
      <a
        href={href}
        rel={rel}
        target="_blank"
        className={className}
        onClick={() => {
          // общая цель с параметрами: по ней считается вся воронка
          goal(GOALS.providerClick, {
            provider: provider.slug,
            campaign: campaign || 'unknown',
            partner: partner ? 1 : 0,
          });
          // и отдельная цель на каждого провайдера в формате go_<slug>:
          // так клики по конкретному провайдеру видны в Метрике отдельной
          // строкой без сегментации по параметрам. Стандарт тот же,
          // что на ПодборVPS: go_timeweb, go_adminvps и так далее
          goal(`go_${provider.slug}`);
        }}
      >
        {children || (partner ? 'Перейти к провайдеру' : 'Открыть сайт')}
      </a>
      {showDisclosure && (
        <p className="disclosure">
          {partner
            ? 'Переход партнёрский: при оформлении услуги мы получим вознаграждение, цена для вас не меняется'
            : 'Обычная ссылка, партнёрских отношений с этим провайдером нет'}
        </p>
      )}
    </>
  );
}
