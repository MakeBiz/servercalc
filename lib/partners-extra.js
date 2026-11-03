import proxies from '@/data/proxies.json';
import llmApi from '@/data/llm-api.json';

/**
 * Разделы вне VPS (с 04.11.2026): прокси (/proxy/) и API нейросетей (/api-nejrosetej/).
 * В подбор, каталог и калькулятор эти партнёры не попадают: главная и калькулятор только про VPS.
 * Ссылки партнёрские, уходят без UTM (noUtm), пока метки не проверены на каждой программе
 */
export const PROXY = proxies;
export const LLM_API = llmApi;

export function asPartner(p) {
  return { slug: p.slug, name: p.name, url: p.url, site: p.site, affiliateStatus: 'active', noUtm: true };
}

export function getProxy(slug) {
  return proxies.providers.find((p) => p.slug === slug) || null;
}
