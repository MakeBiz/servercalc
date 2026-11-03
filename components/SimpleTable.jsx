/** Простая таблица для разделов вне каталога: первая колонка жирная, последняя справа */
export default function SimpleTable({ cols, rows }) {
  return (
    <div className="tbl-wrap">
      <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th key={c} style={i > 0 ? { textAlign: 'right' } : undefined}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => (
                  <td key={j} className={j > 0 ? 'td-num' : undefined} style={j === 0 ? { fontWeight: 600 } : { textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {cell || '·'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
