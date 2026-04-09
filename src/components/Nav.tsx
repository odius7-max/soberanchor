"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/find", label: "Find" },
  { href: "/resources", label: "Resources" },
  { href: "/our-story", label: "Our Story" },
];

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="max-w-[1120px] mx-auto px-6 flex items-center justify-between h-[68px]">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo-192.png" alt="SoberAnchor" width={32} height={32} />
          <span
            className="text-[22px] font-bold tracking-[0.5px]"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
          >
            SoberAnchor
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-4 py-2 rounded-lg text-[15px] font-medium transition-colors ${
                pathname === l.href
                  ? "text-teal bg-[var(--teal-10)]"
                  : "text-dark hover:bg-warm-gray"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <span className="w-px h-6 bg-border mx-2" />
          <Link
            href="/for-providers"
            className="text-[13px] text-mid hover:text-teal px-3 py-1.5 transition-colors"
          >
            For Providers
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-2xl text-navy"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-border px-6 pb-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block py-3.5 text-base font-medium text-dark border-b border-border"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/for-providers"
            onClick={() => setMobileOpen(false)}
            className="block py-3.5 text-base font-semibold text-teal"
          >
            For Providers
          </Link>
        </div>
      )}
    </nav>
  );
}
