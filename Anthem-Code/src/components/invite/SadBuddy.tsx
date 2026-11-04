/** Small animated character for the "decline invitation" dialog: sways, blinks and sheds a tear. */
export default function SadBuddy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="" className={className}>
      <style>{`
        .sb-body { transform-origin: 60px 100px; animation: sb-sway 3.2s ease-in-out infinite; }
        .sb-eye { transform-box: fill-box; transform-origin: center; animation: sb-blink 4s infinite; }
        .sb-tear { animation: sb-tear 2.4s ease-in infinite; }
        @keyframes sb-sway { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes sb-blink { 0%,92%,100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
        @keyframes sb-tear { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(26px); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .sb-body, .sb-eye, .sb-tear { animation: none; } }
      `}</style>
      <ellipse
        cx="60"
        cy="108"
        rx="30"
        ry="5"
        fill="currentColor"
        opacity="0.12"
      />
      <g className="sb-body">
        <rect
          x="24"
          y="22"
          width="72"
          height="80"
          rx="34"
          fill="hsl(var(--brand))"
        />
        <path
          d="M44 48 q6 -4 12 0"
          stroke="#111"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          transform="rotate(-12 50 48)"
        />
        <path
          d="M64 48 q6 -4 12 0"
          stroke="#111"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          transform="rotate(12 70 48)"
        />
        <ellipse className="sb-eye" cx="49" cy="58" rx="4" ry="5" fill="#111" />
        <ellipse className="sb-eye" cx="71" cy="58" rx="4" ry="5" fill="#111" />
        <path
          d="M48 80 q12 -10 24 0"
          stroke="#111"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          className="sb-tear"
          d="M49 65 q-3 5 0 7 q3 -2 0 -7z"
          fill="#7cc7ff"
        />
      </g>
    </svg>
  );
}
