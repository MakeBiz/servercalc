import Landing from '@/components/Landing';
import { checkedLine, planName, priceText, yearOf } from '@/lib/answer-first';
import { price, plural } from '@/lib/format';

const norm = (x) => (x && typeof x === 'object' && x.label ? { href: x.href, text: x.label } : x);
const normPara = (p) => (Array.isArray(p) ? p.map(norm) : p);

export function cheapMeta(c, path) {
  const from = c.first ? `: от ${price(c.first.priceRub)}/мес` : '';
  return {
    title: { absolute: `${c.h1} в ${yearOf(c.checked)}${from}` },
    description: c.first
      ? `${c.plans.length} ${plural(c.plans.length, 'тариф', 'тарифа', 'тарифов')}, сначала самые дешёвые. Самый доступный: ${planName(c.first)} за ${priceText(c.first)}. Цены проверены по сайтам провайдеров`
      : `${c.h1}: тарифы с проверенной ценой`,
    alternates: { canonical: path },
  };
}

export default function CheapLanding({ c, path }) {
  const crumbs = [{ href: '/deshevye-vps', label: 'Дешёвые VPS' }];
  if (c.crumb) crumbs.push({ href: path, label: c.crumb });
  return (
    <Landing
      path={path}
      crumbs={crumbs}
      eyebrow={checkedLine(c.checked)}
      title={`${c.h1} в ${yearOf(c.checked)}`}
      lead={c.lead}
      badges={[
        c.first ? `от ${price(c.first.priceRub)} в месяц` : 'нет свежих цен',
        `${c.plans.length} ${plural(c.plans.length, 'тариф', 'тарифа', 'тарифов')}`,
        `${c.provCount} ${plural(c.provCount, 'провайдер', 'провайдера', 'провайдеров')}`,
      ]}
      table={{
        h2: c.name,
        lead: 'Каждая цена сверена со страницей тарифов провайдера. Если низкая месячная цена действует только при оплате за год или дольше, это написано под ценой',
        plans: c.plans,
        checked: c.checked,
        campaign: c.campaign,
        highlight: c.highlight,
      }}
      sections={c.sections.map((s) => ({ h2: s.h2, paras: s.paras.map(normPara) }))}
      midAfter={0}
      midCta={{ title: 'Подберите под свою задачу.', text: 'Калькулятор учитывает задачу, регион и бюджет и показывает, сколько условий закрывает каждый тариф.', href: '/#podbor', label: 'Открыть подбор', second: { href: '/catalog/', label: 'Весь каталог' } }}
      faq={c.faq}
      related={c.related}
      readAlso={c.read}
    />
  );
}
