import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Program — SoberAnchor",
  description:
    "Daily check-ins, step work, meeting tracking, and sponsor connection. Built for how recovery actually works.",
};

export default function ProgramPage() {
  return (
    <div className="min-h-[70vh] bg-gradient-to-br from-navy-dark to-navy text-white py-20 px-6">
      <div className="max-w-[720px] mx-auto text-center">
        <p className="text-xs font-bold tracking-[1.5px] uppercase text-gold mb-4">
          The program tools
        </p>
        <h1
          className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Work your program, every day.
        </h1>
        <p className="text-lg text-white/80 mb-8 max-w-[560px] mx-auto">
          Daily check-ins, step work, meeting tracking, and the sponsor-sponsee
          connection — all in one place. For sponsees doing the work, and
          sponsors carrying the message.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/my-recovery"
            className="bg-teal text-white font-bold px-7 py-3.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            Start working your program →
          </Link>
          <Link
            href="/auth/signin"
            className="border border-white/35 text-white font-bold px-7 py-3.5 rounded-xl hover:border-white hover:bg-white/10 transition-colors"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-12 text-sm text-white/60 italic">
          Full product tour coming soon. This page will expand with daily
          check-ins, step work, meeting tracking, milestones, sponsor tools,
          trust &amp; privacy, and pricing details.
        </p>
      </div>
    </div>
  );
}
