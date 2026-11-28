// Оглавление со ссылками-якорями для длинных страниц (28.11.2026).
// Собирается на сервере и лежит в исходном HTML: его видят и читатель,
// и поисковые роботы без JavaScript. Пункты без id или подписи пропускаются,
// при двух и меньше разделах блок не выводится
export default function Toc({ items, label = 'Содержание', narrow = false }) {
  const list = (items || []).filter((it) => it && it.id && it.label);
  if (list.length < 3) return null;
  return (
    <nav className="toc paper" aria-label={label}>
      <div className={narrow ? 'wrap-narrow' : 'wrap'}>
        <div className="toc-in">
          <span className="toc-t">{label}</span>
          <ol>
            {list.map((it) => (
              <li key={it.id}>
                <a href={`#${it.id}`}>{it.label}</a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </nav>
  );
}
