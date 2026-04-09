"use client";
import { useState } from "react";
import Link from "next/link";

const step1Options = [
  { value: "self", icon: "🙋", text: "Myself", sub: "I'm looking for help or information for me" },
  { value: "loved-one", icon: "❤️", text: "A family member or loved one", sub: "I'm looking for help for someone I care about" },
  { value: "friend", icon: "🤝", text: "A friend or colleague", sub: "I want to help someone in my life" },
  { value: "professional", icon: "💼", text: "I'm a professional", sub: "Looking for resources for a client or patient" },
];

const step2Options = [
  { value: "alcohol", icon: "🍷", text: "Alcohol", sub: "" },
  { value: "drugs", icon: "💊", text: "Drugs or medications", sub: "Opioids, stimulants, meth, marijuana, or other substances" },
  { value: "gambling", icon: "🎰", text: "Gambling", sub: "" },
  { value: "food", icon: "🍽️", text: "Food, eating, or body image", sub: "Overeating, restriction, binge eating, or food addiction" },
  { value: "behavioral", icon: "🔄", text: "Compulsive behavior", sub: "Sex, spending, internet, gaming, work, skin picking, hoarding" },
  { value: "unsure", icon: "🤔", text: "I'm not sure / multiple things", sub: "That's okay — we'll help you figure it out" },
];

const step3Options = [
  { icon: "👥", text: "Meetings & support groups near me" },
  { icon: "🏥", text: "Treatment centers & professional help" },
  { icon: "📖", text: "Information & articles to understand my options" },
  { icon: "❤️", text: "Support for me as a family member or loved one" },
  { icon: "🌐", text: "All of the above — show me everything" },
];

export default function GuidedDiscovery({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [who, setWho] = useState("");
  const [what, setWhat] = useState("");
  const [selected3, setSelected3] = useState<Set<number>>(new Set());

  const totalSteps = 4;
  const isLovedOne = who !== "self" && who !== "";

  const toggle3 = (i: number) => {
    const s = new Set(selected3);
    if (s.has(i)) s.delete(i);
    else s.add(i);
    setSelected3(s);
  };

  return (
    <section className="bg-off-white py-16 px-6">
      <div className="max-w-[620px] mx-auto">
        <button
          onClick={onClose}
          className="text-teal text-sm font-medium mb-4 hover:underline"
        >
          ← Back to Home
        </button>

        {/* Progress */}
        <div className="flex gap-1.5 mb-7">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-sm flex-1 transition-all duration-300 ${
                i + 1 === step
                  ? "bg-teal"
                  : i + 1 < step
                  ? "bg-gold"
                  : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="animate-fade-up">
            <h2
              className="text-[28px] font-semibold mb-1.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
            >
              Who is this for?
            </h2>
            <p className="text-mid text-[15px] mb-6">
              Everything here is free and confidential.
            </p>
            {step1Options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  setWho(o.value);
                  setStep(2);
                }}
                className="flex items-center gap-3.5 w-full bg-white border-[1.5px] border-border rounded-xl px-5 py-[18px] mb-2.5 text-left transition-all hover:border-teal hover:bg-[var(--teal-10)]"
              >
                <span className="text-2xl w-10 text-center shrink-0">
                  {o.icon}
                </span>
                <div>
                  <div className="text-[15px] font-medium text-dark">
                    {o.text}
                  </div>
                  {o.sub && (
                    <div className="text-[13px] text-mid mt-0.5">{o.sub}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="animate-fade-up">
            <h2
              className="text-[28px] font-semibold mb-1.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
            >
              {isLovedOne
                ? "What is your loved one struggling with?"
                : "What are you dealing with?"}
            </h2>
            <p className="text-mid text-[15px] mb-6">
              Select the area that best describes the situation.
            </p>
            {step2Options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  setWhat(o.value);
                  setStep(3);
                }}
                className="flex items-center gap-3.5 w-full bg-white border-[1.5px] border-border rounded-xl px-5 py-[18px] mb-2.5 text-left transition-all hover:border-teal hover:bg-[var(--teal-10)]"
              >
                <span className="text-2xl w-10 text-center shrink-0">
                  {o.icon}
                </span>
                <div>
                  <div className="text-[15px] font-medium text-dark">
                    {o.text}
                  </div>
                  {o.sub && (
                    <div className="text-[13px] text-mid mt-0.5">{o.sub}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="animate-fade-up">
            <h2
              className="text-[28px] font-semibold mb-1.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
            >
              What kind of help are you looking for?
            </h2>
            <p className="text-mid text-[15px] mb-6">Select all that apply.</p>
            {step3Options.map((o, i) => (
              <button
                key={i}
                onClick={() => toggle3(i)}
                className={`flex items-center gap-3.5 w-full border-[1.5px] rounded-xl px-5 py-[18px] mb-2.5 text-left transition-all ${
                  selected3.has(i)
                    ? "border-teal bg-[var(--teal-10)]"
                    : "bg-white border-border hover:border-teal hover:bg-[var(--teal-10)]"
                }`}
              >
                <span className="text-2xl w-10 text-center shrink-0">
                  {o.icon}
                </span>
                <div className="text-[15px] font-medium text-dark">
                  {o.text}
                </div>
              </button>
            ))}
            <button
              onClick={() => setStep(4)}
              className="w-full mt-4 bg-navy text-white font-semibold text-base py-3.5 rounded-xl hover:bg-navy-dark transition-colors"
            >
              Show My Results →
            </button>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && (
          <div className="animate-fade-up">
            <h2
              className="text-[28px] font-semibold mb-1.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
            >
              Here&apos;s what we found for you
            </h2>
            <p className="text-mid text-[15px] mb-6">
              Resources personalized to your situation.
            </p>

            <h3 className="text-base font-semibold text-navy mt-5 mb-3">
              📞 Crisis Resources
            </h3>
            <div className="bg-warm-gray border border-border rounded-xl p-4 mb-4">
              <div className="font-semibold text-navy">
                SAMHSA National Helpline
              </div>
              <div className="text-sm text-mid">
                Free, confidential, 24/7 ·{" "}
                <strong className="text-teal">1-800-662-4357</strong>
              </div>
            </div>

            <h3 className="text-base font-semibold text-navy mt-5 mb-3">
              👥 Meetings Near You
            </h3>
            {[
              { name: "AA Meetings — San Diego", detail: "47 meetings this week · In-person & online" },
              { name: "SMART Recovery — San Diego", detail: "8 meetings this week · Science-based approach" },
              { name: "Al-Anon Family Groups — San Diego", detail: "12 meetings this week · For families & loved ones" },
            ].map((m) => (
              <Link
                key={m.name}
                href="/find"
                className="block bg-white border border-border rounded-xl p-4 mb-2 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm text-navy">
                      {m.name}
                    </div>
                    <div className="text-[13px] text-mid">{m.detail}</div>
                  </div>
                  <span className="text-teal text-sm font-semibold">
                    View →
                  </span>
                </div>
              </Link>
            ))}

            <h3 className="text-base font-semibold text-navy mt-6 mb-3">
              🏥 Treatment Centers
            </h3>
            <Link
              href="/find"
              className="block bg-white border border-border rounded-xl p-4 mb-2 hover:shadow-md transition-shadow"
            >
              <span className="inline-block bg-[var(--gold-10)] border border-gold-light/30 text-[#9A7B54] text-xs font-medium rounded-full px-3 py-1 mb-1">
                Featured
              </span>
              <div className="font-semibold text-sm text-navy">
                Browse Treatment Centers Near You
              </div>
              <div className="text-[13px] text-mid">
                San Diego area · Multiple options · Insurance accepted
              </div>
            </Link>

            <h3 className="text-base font-semibold text-navy mt-6 mb-3">
              📖 Helpful Articles
            </h3>
            <Link
              href="/resources"
              className="block bg-white border border-border rounded-xl p-4 mb-2 hover:shadow-md transition-shadow"
            >
              <div className="font-semibold text-sm text-navy">
                The First 30 Days: What to Expect
              </div>
              <div className="text-[13px] text-mid">
                By Angel Johnson · 6 min read
              </div>
            </Link>

            <div className="text-center mt-7">
              <button
                onClick={() => {
                  setStep(1);
                  setWho("");
                  setWhat("");
                  setSelected3(new Set());
                }}
                className="px-6 py-2.5 border-[1.5px] border-navy text-navy font-semibold rounded-lg hover:bg-[var(--navy-10)] transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
