/**
 * Welcome mascot for the first-run tour: a glowing gradient blob in a soft rounded tile with two oval eyes
 * that blink and glance around. Pure SVG + CSS (no JS timers); prefers-reduced-motion leaves it as a still portrait.
 * Palette lives in PALETTE so the whole character can be re-tinted (e.g. to blue) in one place.
 */
const PALETTE = {
  tileTop: "#f5a352",
  tileBottom: "#e9822f",
  rim: "#ffffff",
  mist: "#fff1d6",
  glow: "#ffcf8e",
  core: "#f39a4a",
  eyeEdge: "#ffe2b5",
  spark: "#f3b25b",
};

const CSS = `
.tm-float{animation:tm-float 3.2s ease-in-out infinite;transform-origin:100px 110px}
.tm-breathe{animation:tm-breathe 3.2s ease-in-out infinite;transform-origin:100px 170px}
.tm-eyes{animation:tm-look 7s ease-in-out infinite}
.tm-eye{animation:tm-blink 4.6s infinite;transform-box:fill-box;transform-origin:center}
.tm-spark{animation:tm-twinkle 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.tm-s2{animation-delay:.8s}.tm-s3{animation-delay:1.4s}
.tm-hi{animation:tm-pop 5s ease-in-out infinite;transform-origin:left bottom}
@keyframes tm-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes tm-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.035,1.05)}}
@keyframes tm-look{0%,18%{transform:translate(0,0)}26%,44%{transform:translate(-5px,1px)}52%,68%{transform:translate(5px,-1px)}76%,100%{transform:translate(0,0)}}
@keyframes tm-blink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes tm-twinkle{0%,100%{opacity:.2;transform:scale(.6)}50%{opacity:1;transform:scale(1.1)}}
@keyframes tm-pop{0%,8%{opacity:0;transform:scale(.6)}14%,72%{opacity:1;transform:scale(1)}80%,100%{opacity:0;transform:scale(.9)}}
@media (prefers-reduced-motion:reduce){
  .tm-float,.tm-breathe,.tm-eyes,.tm-eye,.tm-spark,.tm-hi{animation:none}
  .tm-hi{opacity:1}.tm-spark{opacity:.8}
}
`;

const Star = ({ x, y, s = 1, className }: { x: number; y: number; s?: number; className: string }) => (
  <path
    className={`tm-spark ${className}`}
    d={`M${x} ${y - 8 * s} L${x + 2.2 * s} ${y - 2.2 * s} L${x + 8 * s} ${y} L${x + 2.2 * s} ${y + 2.2 * s} L${x} ${y + 8 * s} L${x - 2.2 * s} ${y + 2.2 * s} L${x - 8 * s} ${y} L${x - 2.2 * s} ${y - 2.2 * s}Z`}
    fill={PALETTE.spark}
  />
);

/** The character on its own (used on the empty artboard too). */
export function MascotCharacter({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <style>{CSS}</style>
      <svg viewBox="0 0 200 170" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="tm-tile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={PALETTE.tileTop} />
            <stop offset="1" stopColor={PALETTE.tileBottom} />
          </linearGradient>
          <radialGradient id="tm-dome" cx="50%" cy="62%" r="62%">
            <stop offset="0" stopColor={PALETTE.core} />
            <stop offset=".45" stopColor={PALETTE.glow} />
            <stop offset=".8" stopColor={PALETTE.mist} />
            <stop offset="1" stopColor={PALETTE.rim} />
          </radialGradient>
          <radialGradient id="tm-eye-g" cx="45%" cy="38%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor={PALETTE.eyeEdge} />
          </radialGradient>
          <clipPath id="tm-clip">
            <rect x="46" y="18" width="108" height="120" rx="34" />
          </clipPath>
        </defs>

        <ellipse cx="100" cy="152" rx="36" ry="5" fill="#000" opacity=".22" />
        <g className="tm-float">
          <rect x="46" y="18" width="108" height="120" rx="34" fill="url(#tm-tile)" />
          <g clipPath="url(#tm-clip)">
            <g className="tm-breathe">
              <ellipse cx="100" cy="132" rx="84" ry="70" fill="url(#tm-dome)" />
            </g>
          </g>
          <g className="tm-eyes">
            <ellipse className="tm-eye" cx="83" cy="96" rx="9.5" ry="13" fill="url(#tm-eye-g)" transform="rotate(-6 83 96)" />
            <ellipse className="tm-eye" cx="114" cy="90" rx="9.5" ry="14" fill="url(#tm-eye-g)" transform="rotate(8 114 90)" />
          </g>
        </g>

        <Star x={22} y={44} s={1.1} className="tm-s1" />
        <Star x={182} y={36} s={0.8} className="tm-s2" />
        <Star x={176} y={118} s={0.9} className="tm-s3" />
      </svg>
    </div>
  );
}

export function TourMascot() {
  return (
    <div className="relative mx-auto mb-3 h-[168px] w-[240px]" aria-hidden>
      <MascotCharacter className="h-full w-full" />
      <span className="tm-hi absolute right-0 top-0 rounded-2xl rounded-bl-sm border border-border bg-card px-2.5 py-1 font-display text-xs text-foreground">
        hello!
      </span>
    </div>
  );
}
