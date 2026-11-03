import JsonLd from './JsonLd';

/** Блок частых вопросов с разметкой FAQPage */
export default function FaqBlock({ title, faq, alt = false }) {
  return (
    <section className={`section ${alt ? 'paper-alt' : 'paper'}`}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />
      <div className="wrap">
        <div className="eyebrow">
          <span className="label">Вопросы</span>
        </div>
        <h2 style={{ marginBottom: 26 }}>{title}</h2>
        <div className="stack-lg">
          {faq.map((f) => (
            <div key={f.q}>
              <h3>{f.q}</h3>
              <p className="dim">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
