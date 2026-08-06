// Заголовок раздела с монопространным номером слева (01, 02, …),
// как в макетах Claude Design для страниц-документов
export default function SecHead({ n, children }) {
  return (
    <div className="sec-head">
      <span className="sec-num" aria-hidden="true">{n}</span>
      <h2>{children}</h2>
    </div>
  );
}
