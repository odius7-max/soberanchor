"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const links = [
  { href: "/find", label: "Find" },
  { href: "/resources", label: "Resources" },
  { href: "/our-story", label: "Our Story" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, openAuthModal, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const displayName = profile?.display_name;
  const initial = displayName ? displayName[0].toUpperCase() : user ? "?" : null;

  async function handleSignOut() {
    setDropdownOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-[var(--border)]">
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
          <span className="w-px h-6 bg-[var(--border)] mx-2" />
          <Link
            href="/for-providers"
            className="text-[13px] text-mid hover:text-teal px-3 py-1.5 transition-colors"
          >
            For Providers
          </Link>

          {/* Auth section */}
          {!loading && (
            <>
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className={`ml-1 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors ${
                      pathname.startsWith("/dashboard")
                        ? "text-teal bg-[var(--teal-10)]"
                        : "text-dark hover:bg-warm-gray"
                    }`}
                  >
                    My Recovery
                  </Link>
                  {/* Avatar + dropdown */}
                  <div className="relative ml-2" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen((v) => !v)}
                      aria-label="Account menu"
                      aria-expanded={dropdownOpen}
                      className="flex items-center justify-center rounded-[10px] text-white font-bold text-[13px] hover:opacity-90 transition-opacity"
                      style={{
                        width: "34px", height: "34px",
                        background: "linear-gradient(135deg,#2A8A99,#003366)",
                        border: "none", cursor: "pointer",
                      }}
                    >
                      {initial}
                    </button>
                    {dropdownOpen && (
                      <div
                        className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden"
                        style={{ background: "#fff", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,51,102,0.1)", minWidth: "180px", zIndex: 60 }}
                      >
                        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                          <div className="font-semibold text-navy text-[14px]">{displayName ?? "My Account"}</div>
                          {user.phone && (
                            <div className="text-mid text-[12px] mt-0.5">•••••{user.phone.slice(-4)}</div>
                          )}
                        </div>
                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-4 py-3 text-[14px] text-dark hover:bg-warm-gray transition-colors"
                        >
                          My Recovery
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-3 text-[14px] text-mid hover:bg-warm-gray transition-colors"
                          style={{ background: "none", border: "none", borderTop: "1px solid var(--border)", cursor: "pointer" }}
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button
                  onClick={openAuthModal}
                  className="ml-2 text-[14px] font-semibold text-white rounded-lg hover:bg-navy-dark transition-colors"
                  style={{ background: "var(--navy)", border: "none", padding: "9px 20px", cursor: "pointer", borderRadius: "8px" }}
                >
                  Sign In
                </button>
              )}
            </>
          )}
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
        <div className="md:hidden bg-white border-b border-[var(--border)] px-6 pb-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block py-3.5 text-base font-medium text-dark border-b border-[var(--border)]"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/for-providers"
            onClick={() => setMobileOpen(false)}
            className="block py-3.5 text-base font-medium text-dark border-b border-[var(--border)]"
          >
            For Providers
          </Link>
          {!loading && (
            <>
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="block py-3.5 text-base font-semibold text-teal border-b border-[var(--border)]"
                  >
                    My Recovery
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block py-3.5 text-base text-mid w-full text-left"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setMobileOpen(false); openAuthModal(); }}
                  className="block py-3.5 text-base font-semibold text-teal w-full text-left"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  Sign In with Phone
                </button>
              )}
            </>
          )}
        </div>
      )}
    </nav>
  );
}
