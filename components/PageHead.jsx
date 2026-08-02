import Breadcrumbs from './Breadcrumbs';

/** Тёмная шапка внутренней страницы: крошки, надзаголовок, H1, лид и бейджи */
export default function PageHead({ eyebrow, title, lead, crumbs = [], badges = null, children }) {
  return (
    <section className="pagehead ink">
      <div className="wrap pagehead-in">
        <Breadcrumbs items={crumbs} />
        {eyebrow && (
          <div className="eyebrow">
            <span className="label label-brass">{eyebrow}</span>
          </div>
        )}
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
        {badges && <div className="pagehead-meta">{badges}</div>}
        {children}
      </div>
    </section>
  );
}
