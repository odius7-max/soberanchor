import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-navy-dark pt-14 pb-8 px-6 mt-20">
      <div className="max-w-[1120px] mx-auto">
        <div className="flex flex-wrap gap-10 mb-10">
          <div className="flex-1 min-w-[280px]">
            <span
              className="text-xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ⚓ SoberAnchor
            </span>
            <p className="text-white/50 text-sm leading-7 mt-3 max-w-xs">
              The definitive resource for anyone whose life is touched by
              addiction and recovery. For you, or for someone you love.
            </p>
          </div>
          <div>
            <h4 className="text-gold text-xs font-bold tracking-[1.5px] uppercase mb-3.5">
              Explore
            </h4>
            <div className="flex flex-col gap-1">
              {[
                ["/find", "Find Help"],
                ["/resources", "Resources"],
                ["/our-story", "Our Story"],
                ["/for-providers", "For Providers"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="text-white/60 text-sm py-1 hover:text-white transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-gold text-xs font-bold tracking-[1.5px] uppercase mb-3.5">
              Directory
            </h4>
            <div className="flex flex-col gap-1">
              {[
                ["/find", "Treatment Centers"],
                ["/find", "Sober Living"],
                ["/fellowships", "Fellowships"],
                ["/find", "Therapists"],
              ].map(([href, label]) => (
                  <Link
                    key={`${href}-${label}`}
                    href={href}
                    className="text-white/60 text-sm py-1 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                )
              )}
            </div>
          </div>
          <div>
            <h4 className="text-gold text-xs font-bold tracking-[1.5px] uppercase mb-3.5">
              Legal
            </h4>
            <div className="flex flex-col gap-1">
              {["Privacy Policy", "Terms of Service", "Contact Support"].map(
                (label) => (
                  <span
                    key={label}
                    className="text-white/60 text-sm py-1 cursor-pointer hover:text-white transition-colors"
                  >
                    {label}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 text-center">
          <p className="text-white/30 text-[13px]">
            © 2026 SoberAnchor. Built with love for the recovery community.
          </p>
          <div className="bg-white/5 rounded-lg px-5 py-3 mt-4 inline-block">
            <span className="text-white/50 text-[13px]">
              In crisis? Call SAMHSA:{" "}
              <strong className="text-gold">1-800-662-4357</strong> (free,
              confidential, 24/7)
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
