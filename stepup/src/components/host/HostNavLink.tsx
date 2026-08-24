"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { C } from "@/lib/marketing-theme";

/**
 * Nav link with the design's 2px accent underline on the active route.
 * Client-side only because it needs the current pathname.
 */
export function HostNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();

  // "/studio" must not light up while you are on "/studio/classes", so the
  // dashboard link matches exactly and the rest match their subtree.
  const isDashboard = href === "/studio" || href === "/teach";
  const active = isDashboard
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
