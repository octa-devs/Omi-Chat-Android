/* Brand glyphs — lucide dropped brand icons in v1, so these are hand-rolled. */

type IconProps = React.SVGProps<SVGSVGElement>;

export function GithubIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5C5.73.5.9 5.33.9 11.6c0 4.9 3.18 9.06 7.59 10.53.56.1.76-.24.76-.54v-1.9c-3.1.67-3.75-1.5-3.75-1.5-.5-1.3-1.24-1.65-1.24-1.65-1.02-.7.08-.68.08-.68 1.12.08 1.71 1.16 1.71 1.16 1 1.7 2.6 1.21 3.24.93.1-.72.39-1.21.7-1.49-2.47-.28-5.07-1.24-5.07-5.5 0-1.21.43-2.2 1.14-2.98-.11-.28-.5-1.41.11-2.94 0 0 .93-.3 3.05 1.14a10.5 10.5 0 0 1 5.55 0c2.12-1.44 3.05-1.14 3.05-1.14.61 1.53.22 2.66.11 2.94.71.78 1.14 1.77 1.14 2.98 0 4.27-2.6 5.22-5.08 5.5.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54a11.11 11.11 0 0 0 7.58-10.53C23.1 5.33 18.27.5 12 .5Z" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M17.53 3h3.1l-6.77 7.74L21.75 21h-5.9l-4.62-6.04L5.94 21H2.83l7.25-8.29L2.25 3h6.05l4.18 5.52L17.53 3Zm-1.09 16.2h1.72L7.63 4.7H5.79l10.65 14.5Z" />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18-2.5-2.7-2.5-15.3 0-18Z" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
      <path d="m3.5 7 8.5 6 8.5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The Omi Chat "O" mark, drawn for crispness at small sizes. */
export function OmiGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="omi-o" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-300)" />
          <stop offset="55%" stopColor="var(--color-brand-500)" />
          <stop offset="100%" stopColor="var(--color-gold-400)" />
        </linearGradient>
      </defs>
      <path
        d="M24 4C13 4 4 12.4 4 22.8 4 33.2 13 41.6 24 41.6S44 33.2 44 22.8C44 12.4 35 4 24 4Zm0 31.4c-7.3 0-13.2-4.6-13.2-10.2S16.7 14.8 24 14.8s13.2 4.6 13.2 10.2S31.3 35.4 24 35.4Z"
        fill="url(#omi-o)"
      />
      <circle cx="36" cy="12" r="4.4" fill="var(--color-gold-400)" />
    </svg>
  );
}