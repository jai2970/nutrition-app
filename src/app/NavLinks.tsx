"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Today" },
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
            className={`transition-colors hover:text-foreground ${
              active ? "text-foreground font-semibold" : "text-muted"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
