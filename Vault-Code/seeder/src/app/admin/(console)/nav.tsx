"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; badge?: number };

export function AdminNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="side-nav" aria-label="เมนูแอดมิน">
      {items.map((it) => {
        const active = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            <span>{it.label}</span>
            {it.badge ? <b className="badge">{it.badge}</b> : null}
          </Link>
        );
      })}
    </nav>
  );
}
