export default function Logo({ size = 26 }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="24" height="24" rx="6" stroke="#c6a15b" strokeWidth="1.6" />
      <rect x="6" y="7" width="14" height="4" rx="1.4" fill="#c6a15b" opacity="0.32" />
      <rect x="6" y="15" width="14" height="4" rx="1.4" fill="#c6a15b" opacity="0.32" />
      <circle cx="17.5" cy="9" r="1.5" fill="#e2c489" />
      <circle cx="17.5" cy="17" r="1.5" fill="#e2c489" />
    </svg>
  );
}
