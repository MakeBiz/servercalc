/**
 * Линейные иконки задач вместо эмодзи: эмодзи рисуются шрифтом системы,
 * выглядят по-разному на каждой платформе и ломают строгую подачу
 */
const PATHS = {
  sajt: (
    <>
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <path d="M2.5 7.5h15M5.5 5.5h.01M7.5 5.5h.01" />
    </>
  ),
  magazin: (
    <>
      <path d="M3.5 6.5h13l-1 10h-11z" />
      <path d="M7 6.5V5a3 3 0 0 1 6 0v1.5" />
    </>
  ),
  '1c-bitrix': (
    <>
      <rect x="3.5" y="2.5" width="13" height="15" rx="2" />
      <path d="M6.5 6.5h7M6.5 10h2M11.5 10h2M6.5 13.5h2M11.5 13.5h2" />
    </>
  ),
  'telegram-bot': (
    <>
      <rect x="3" y="6" width="14" height="10" rx="3" />
      <path d="M10 3v3M7 10.5h.01M13 10.5h.01M8 13.5h4" />
    </>
  ),
  'baza-dannyh': (
    <>
      <ellipse cx="10" cy="5" rx="6.5" ry="2.5" />
      <path d="M3.5 5v10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V5" />
      <path d="M3.5 10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5" />
    </>
  ),
  ai: (
    <>
      <circle cx="5" cy="6" r="2" />
      <circle cx="5" cy="14" r="2" />
      <circle cx="15" cy="10" r="2" />
      <path d="M7 6.8 13 9.4M7 13.2 13 10.6" />
    </>
  ),
  game: (
    <>
      <path d="M6.5 6.5h7a4.5 4.5 0 0 1 4.5 4.5v.6a2.4 2.4 0 0 1-4.4 1.3l-.6-.9H7l-.6.9A2.4 2.4 0 0 1 2 11.6V11a4.5 4.5 0 0 1 4.5-4.5Z" />
      <path d="M6 9v2M5 10h2M13.5 9.5h.01M15 11h.01" />
    </>
  ),
  dev: (
    <>
      <path d="m7 6.5-4 3.5 4 3.5M13 6.5l4 3.5-4 3.5M11.5 4.5l-3 11" />
    </>
  ),
  vydelennyj: (
    <>
      <rect x="2.5" y="3.5" width="15" height="5.5" rx="1.5" />
      <rect x="2.5" y="11" width="15" height="5.5" rx="1.5" />
      <path d="M5.5 6.25h.01M5.5 13.75h.01M8 6.25h4M8 13.75h4" />
    </>
  ),
  n8n: (
    <>
      <circle cx="4.5" cy="10" r="2" />
      <circle cx="15.5" cy="6" r="2" />
      <circle cx="15.5" cy="14" r="2" />
      <path d="M6.5 9.4 13.5 6.6M6.5 10.6l7 2.8" />
    </>
  ),
};

export default function TaskIcon({ slug, size = 18 }) {
  const shape = PATHS[slug];
  if (!shape) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      {shape}
    </svg>
  );
}
