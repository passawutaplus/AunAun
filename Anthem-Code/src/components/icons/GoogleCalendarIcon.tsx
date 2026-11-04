/** Small Google Calendar mark for "เพิ่มลง Google Calendar" links (four-colour frame, white page, "31"). */
export function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#4285F4" />
      <path d="M2 17h5v5H5a3 3 0 0 1-3-3z" fill="#1967D2" />
      <path d="M17 17h5l-5 5z" fill="#EA4335" />
      <path d="M17 2h2a3 3 0 0 1 3 3v12h-5z" fill="#4285F4" />
      <path d="M2 7V5a3 3 0 0 1 3-3h12v5z" fill="#4285F4" />
      <rect x="7" y="7" width="10" height="10" fill="#fff" />
      <path d="M7 17h10v5H7z" fill="#34A853" />
      <path d="M17 7h5v10h-5z" fill="#FBBC04" />
      <text x="12" y="15.2" textAnchor="middle" fontSize="7" fontWeight="700" fontFamily="Arial, sans-serif" fill="#1A73E8">
        31
      </text>
    </svg>
  );
}
