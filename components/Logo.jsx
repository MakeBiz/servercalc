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
      <rect className="bm-bg" x="0" y="0" width="26" height="26" rx="7" />
      <rect x="6" y="7" width="14" height="4.2" rx="1.4" fill="#fff" opacity="0.92" />
      <rect x="6" y="14.8" width="14" height="4.2" rx="1.4" fill="#fff" opacity="0.92" />
      <circle className="bm-dot" cx="17.3" cy="9.1" r="1.25" />
      <circle className="bm-dot" cx="17.3" cy="16.9" r="1.25" />
    </svg>
  );
}
