/**
 * Welcome mascot for the first-run tour: an ink blob with pill eyes (the same eyes as the empty artboard)
 * that bounces, blinks and waves. Pure SVG + CSS; colours follow the theme tokens, and
 * prefers-reduced-motion leaves it as a still, smiling portrait.
 */
const CSS = `
.tm-body{animation:tm-bounce 2.4s ease-in-out infinite;transform-origin:100px 104px}
.tm-shadow{animation:tm-shadow 2.4s ease-in-out infinite;transform-origin:100px 112px}
.tm-eye{animation:tm-blink 4.2s infinite;transform-box:fill-box;transform-origin:center}
.tm-wave{animation:tm-wave .7s ease-in-out infinite alternate;transform-origin:138px 78px}
.tm-spark{animation:tm-twinkle 2.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.tm-s2{animation-delay:.7s}.tm-s3{animation-delay:1.3s}.tm-s4{animation-delay:1.8s}
.tm-hi{animation:tm-pop 4.8s ease-in-out infinite;transform-origin:left bottom}
@keyframes tm-bounce{0%,100%{transform:translateY(0) scale(1,1)}45%{transform:translateY(-9px) scale(.98,1.03)}60%{transform:translateY(0) scale(1.03,.96)}}
@keyframes tm-shadow{0%,100%{transform:scale(1);opacity:.28}45%{transform:scale(.8);opacity:.16}}
@keyframes tm-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes tm-wave{from{transform:rotate(-14deg)}to{transform:rotate(26deg)}}
@keyframes tm-twinkle{0%,100%{opacity:.25;transform:scale(.6) rotate(0)}50%{opacity:1;transform:scale(1.1) rotate(20deg)}}
@keyframes tm-pop{0%,8%{opacity:0;transform:scale(.6)}14%,70%{opacity:1;transform:scale(1)}78%,100%{opacity:0;transform:scale(.9)}}
@media (prefers-reduced-motion:reduce){
  .tm-body,.tm-shadow,.tm-eye,.tm-wave,.tm-spark,.tm-hi{animation:none}
  .tm-hi{opacity:1}.tm-wave{transform:rotate(10deg)}.tm-spark{opacity:.8}
}
`;

const Star = ({ x, y, s = 1, className }: { x: number; y: number; s?: number; className: string }) => (
  <path
    className={`tm-spark ${className}`}
    d={`M${x} ${y - 8 * s} L${x + 2.2 * s} ${y - 2.2 * s} L${x + 8 * s} ${y} L${x + 2.2 * s} ${y + 2.2 * s} L${x} ${y + 8 * s} L${x - 2.2 * s} ${y + 2.2 * s} L${x - 8 * s} ${y} L${x - 2.2 * s} ${y - 2.2 * s}Z`}
    fill="#e8b45a"
  />
);

export function TourMascot() {
  return (
    <div className="relative mx-auto mb-3 h-[132px] w-[220px]" aria-hidden>
      <style>{CSS}</style>
      <svg viewBox="0 0 200 124" className="h-full w-full overflow-visible">
        <ellipse className="tm-shadow" cx="100" cy="114" rx="38" ry="5" fill="hsl(var(--foreground))" />
        <g className="tm-body">
          <rect x="58" y="34" width="84" height="74" rx="38" fill="hsl(var(--foreground))" />
          <ellipse cx="62" cy="82" rx="7" ry="9" fill="hsl(var(--foreground))" />
          <g className="tm-wave">
            <rect x="136" y="70" width="26" height="12" rx="6" fill="hsl(var(--foreground))" />
            <circle cx="163" cy="76" r="8" fill="hsl(var(--foreground))" />
          </g>
          <rect className="tm-eye" x="80" y="56" width="11" height="22" rx="5.5" fill="hsl(var(--card))" />
          <rect className="tm-eye" x="109" y="56" width="11" height="22" rx="5.5" fill="hsl(var(--card))" />
          <path d="M91 88 Q100 97 109 88" fill="none" stroke="hsl(var(--card))" strokeWidth="3" strokeLinecap="round" />
          <circle cx="76" cy="86" r="5" fill="#e8b45a" opacity=".55" />
          <circle cx="124" cy="86" r="5" fill="#e8b45a" opacity=".55" />
          <ellipse cx="86" cy="110" rx="9" ry="4" fill="hsl(var(--foreground))" />
          <ellipse cx="114" cy="110" rx="9" ry="4" fill="hsl(var(--foreground))" />
        </g>
        <Star x={26} y={36} s={1.1} className="tm-s1" />
        <Star x={176} y={30} s={0.8} className="tm-s2" />
        <Star x={34} y={92} s={0.7} className="tm-s3" />
        <Star x={184} y={92} s={1} className="tm-s4" />
      </svg>
      <span className="tm-hi absolute right-1 top-0 rounded-2xl rounded-bl-sm border border-border bg-card px-2.5 py-1 font-display text-xs text-foreground">
        hello!
      </span>
    </div>
  );
}
