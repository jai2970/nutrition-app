"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/log", label: "Food Log" },
  { href: "/profile", label: "Profile" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative py-1 transition-colors hover:text-primary ${
              active ? "text-foreground" : "text-muted"
            }`}
          >
            {link.label}
            {active && (
              <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-primary rounded-full" />
            )}
          </Link>
        );
      })}
    </>
  );
}
