"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./app.module.css";

const SECTIONS = [
  { href: "/analyze", label: "Document" },
  { href: "/red-lines", label: "Red lines" },
  { href: "/library", label: "Library" },
];

export function BindingNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections" className={s.nav}>
      <ul className={s.navList}>
        {SECTIONS.map(({ href, label }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={s.navLink}
                aria-current={current ? "page" : undefined}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
