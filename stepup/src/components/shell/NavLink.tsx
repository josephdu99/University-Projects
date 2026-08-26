"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { C } from "@/lib/marketing-theme";

/**
 * Nav link with the design's 2px accent underline on the active route.
 * Client-side only because it needs the current pathname.
 */
export function NavLink({
  href,
  label,
  exact = false,
}: {
  href: string;
  label: string;
  /** Match this path only — for section roots like "/studio" that would
   *  otherwise stay lit on "/studio/classes". */
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      style={{
        color: active ? C.ink : C.navInactive,
        textDecoration: "none",
        paddingBottom: 2,
        borderBottom: active ? `2px solid ${C.brand}` : "2px solid transparent",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Link>
  );
}
