"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MobileBottomNavProps = {
  tenantSlug: string;
  workspaceSlug: string;
};

export function MobileBottomNav({ tenantSlug, workspaceSlug }: MobileBottomNavProps) {
  const pathname = usePathname();
  const baseHref = `/${tenantSlug}/${workspaceSlug}`;
  const items = [
    { href: baseHref, label: "Home", match: `${baseHref}` },
    { href: `${baseHref}/projects`, label: "Projects", match: `${baseHref}/projects` },
    { href: `${baseHref}/tasks`, label: "Tasks", match: `${baseHref}/tasks` },
    { href: `${baseHref}/meetings`, label: "Meetings", match: `${baseHref}/meetings` },
    { href: `${baseHref}/templates`, label: "Templates", match: `${baseHref}/templates` },
    { href: `${baseHref}/help`, label: "Help", match: `${baseHref}/help` },
    { href: `${baseHref}/settings`, label: "Settings", match: `${baseHref}/settings` },
  ];

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((item) => {
        const isActive = pathname === item.match || pathname.startsWith(`${item.match}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? "bottom-nav-link is-active" : "bottom-nav-link"}
            aria-current={isActive ? "page" : undefined}
          >
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
