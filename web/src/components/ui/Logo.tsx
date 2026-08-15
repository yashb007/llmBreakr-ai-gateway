// Inline (not an <img src="/logo.svg">) so the wordmark can use the theme
// tokens below — an external image's fill colors are baked in and can't
// react to the light/dark toggle, which is exactly why "Breakr" used to
// disappear in light mode (it was hardcoded near-white).
const VIEWBOX_WIDTH = 470;
const VIEWBOX_HEIGHT = 100;

// Height is derived from width, not a separate prop — passing a height that
// doesn't match the viewBox's 4.7:1 aspect ratio letterboxes the mark inside
// its own box (that's what caused the big gap before "SMART GATEWAY": the
// old fixed 164x104 size squashed a 470x100 graphic into a ~1.6:1 box).
export function Logo({ width = 164, className }: { width?: number; className?: string }) {
  const height = (width * VIEWBOX_HEIGHT) / VIEWBOX_WIDTH;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      role="img"
      aria-label="llmBreakr"
      className={className}
    >
      <g fill="var(--color-accent)" stroke="var(--color-accent)" strokeWidth={7} strokeLinecap="round" fillRule="nonzero">
        <path d="M18 22L44 46M18 50h26M18 78L44 54" fill="none" />
        <path d="M56 46L82 22M56 50h26M56 54L82 78" fill="none" />
        <rect x="7" y="15" width="14" height="14" rx="3" stroke="none" />
        <rect x="7" y="43" width="14" height="14" rx="3" stroke="none" />
        <rect x="7" y="71" width="14" height="14" rx="3" stroke="none" />
        <circle cx="86" cy="22" r="7.5" stroke="none" />
        <circle cx="86" cy="50" r="7.5" stroke="none" />
        <circle cx="86" cy="78" r="7.5" stroke="none" />
        <path d="M50 36L64 50 50 64 36 50z" stroke="none" />
      </g>
      <text
        x="124"
        y="74"
        fontFamily="Space Grotesk, Inter, Helvetica Neue, Arial, sans-serif"
        fontSize="72"
        fontWeight="700"
        letterSpacing="-2.4"
      >
        <tspan fill="var(--color-txm)">llm</tspan>
        <tspan fill="var(--color-tx)">Breakr</tspan>
      </text>
    </svg>
  );
}
