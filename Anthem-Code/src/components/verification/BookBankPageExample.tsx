/** Schematic example of a Thai bank-book first page for KYC upload guidance. */
export function BookBankPageExample({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground mb-2">ตัวอย่าง · ถ่ายหน้าสมุดบัญชีที่เห็นชื่อและเลขบัญชีชัด</p>
      <div
        className="rounded-xl border border-border/70 bg-muted/20 p-3 overflow-hidden"
        aria-hidden
      >
        <svg viewBox="0 0 320 200" className="w-full h-auto" role="img">
          <title>ตัวอย่างหน้าสมุดบัญชี</title>
          {/* Book cover / page */}
          <rect x="16" y="12" width="288" height="176" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
          <rect x="16" y="12" width="18" height="176" rx="4" fill="hsl(var(--muted))" opacity="0.7" />

          {/* Bank header bar — soft orange */}
          <rect x="48" y="28" width="236" height="28" rx="6" fill="#F5B89A" />
          <text x="166" y="46" textAnchor="middle" fill="#3D2A22" fontSize="11" fontFamily="system-ui, sans-serif" fontWeight="600">
            BANK BOOK
          </text>

          {/* Account name */}
          <text x="56" y="78" fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="system-ui, sans-serif">
            ชื่อบัญชี / Account name
          </text>
          <rect x="56" y="84" width="160" height="10" rx="3" fill="hsl(var(--muted-foreground))" opacity="0.35" />

          {/* Account number highlight */}
          <text x="56" y="118" fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="system-ui, sans-serif">
            เลขที่บัญชี / Account no.
          </text>
          <rect x="56" y="124" width="188" height="22" rx="5" fill="#F5B89A" opacity="0.35" stroke="#E89A72" strokeWidth="1.2" strokeDasharray="4 3" />
          <text x="150" y="139" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontFamily="ui-monospace, monospace" letterSpacing="1.5">
            xxx-x-xxxxx-x
          </text>

          {/* Branch */}
          <text x="56" y="168" fill="hsl(var(--muted-foreground))" fontSize="8" fontFamily="system-ui, sans-serif">
            สาขา / Branch
          </text>
          <rect x="56" y="172" width="90" height="7" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.25" />
        </svg>
      </div>
    </div>
  );
}

export default BookBankPageExample;
