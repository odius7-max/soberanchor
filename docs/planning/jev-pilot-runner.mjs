#!/usr/bin/env node
/**
 * Jev pilot runner — SoberAnchor QA-verdict rubric evaluation.
 * Usage:
 *   JEV_API_KEY=... node docs/planning/jev-pilot-runner.mjs
 * Env:
 *   JEV_API_KEY   required. Never commit or paste this anywhere.
 *   JEV_API_BASE  default https://api.typesafe.ai   (OFFICIAL TypeSafe)
 *   JEV_API_PATH  default /v1/systemone
 *     For the unofficial jevtypesafeai.com gateway (KNOWINGLY, redacted data only):
 *     JEV_API_BASE=https://jevtypesafeai.com JEV_API_PATH=/api/v1/decide
 *   JEV_MODEL     default jev-latest
 *   JEV_DELAY_MS  default 1500 (be polite; no tight loops — we have tripped bot mitigation before)
 * Node 18+. No dependencies. Reads jev-pilot-cases.json from its own directory.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API_KEY = process.env.JEV_API_KEY;
if (!API_KEY) { console.error("JEV_API_KEY not set. Aborting — never hardcode keys."); process.exit(1); }
const BASE = process.env.JEV_API_BASE ?? "https://api.typesafe.ai";
const PATH = process.env.JEV_API_PATH ?? "/v1/systemone";
const MODEL = process.env.JEV_MODEL ?? "jev-latest";
const DELAY = Number(process.env.JEV_DELAY_MS ?? 1500);

const RUBRIC = `You are grading QA evidence for a software release gate. A gate may only be considered PASSED when ALL of these hold:
1. The evidence states the exact verified deployment (SHA or immutable URL) it was observed on.
2. The claimed behavior was directly observed, not inferred; any marker used was false before the change and true after.
3. Any claim about persisted state cites a database read, not UI rendering alone.
4. Every element of the expected outcome was checked; partial success is failure.
5. No disclosed or evident confound (wrong/unstated deployment, stale server, manually repaired data, by-design responses mistaken for fixes) undermines the result.
Evidence that establishes neither pass nor fail is INSUFFICIENT.`;

const QUESTIONS = {
  supports_pass: { type: "noul", instructions: `${RUBRIC}\nDoes this evidence, on its own, establish that the described gate PASSED?` },
  evidence_sufficient: { type: "noul", instructions: `${RUBRIC}\nIs this evidence sufficient to reach ANY confident verdict (pass or fail), as opposed to being inconclusive?` },
  confound_present: { type: "noul", instructions: `${RUBRIC}\nDoes the evidence disclose or evidently contain a confound (rubric item 5) that undermines its conclusion?` },
};

function verdictFrom(answers) {
  const yes = (q) => {
    const a = answers?.[q];
    if (a == null) return null;
    const v = a.noul ?? a.value ?? a.answer ?? a.result;
    if (typeof v === "number") return v >= 0.5; // official schema: noul is a probability 0..1
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v.toLowerCase().startsWith("y") || v === "true";
    if (typeof a.probability === "number") return a.probability >= 0.5;
    return null;
  };
  const sp = yes("supports_pass"), es = yes("evidence_sufficient");
  if (sp === true) return "pass";
  if (es === false) return "insufficient";
  return "fail";
}

const here = dirname(fileURLToPath(import.meta.url));
const { cases } = JSON.parse(readFileSync(join(here, "jev-pilot-cases.json"), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rows = [];
for (const c of cases) {
  let out;
  try {
    const res = await fetch(`${BASE}${PATH}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ state: c.state, model: MODEL, questions: QUESTIONS }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    out = await res.json();
  } catch (e) {
    console.log(`${c.id.padEnd(14)} ERROR: ${String(e).slice(0, 160)}`);
    rows.push({ id: c.id, expected: c.expected, got: "ERROR", ok: false, trap: c.tags.includes("trap"), err: String(e) });
    if (rows.length >= 3 && rows.every((r) => r.got === "ERROR")) {
      console.error("\nFirst 3 requests all failed — aborting early to save tokens. Fix the error above and rerun.");
      console.error(`Node version: ${process.version} (need >= 18 for built-in fetch). Endpoint: ${BASE}${PATH}`);
      process.exit(1);
    }
    await sleep(DELAY);
    continue;
  }
  const got = verdictFrom(out.answers ?? out);
  const trap = c.tags.includes("trap");
  // A trap is survived if the verdict is anything but "pass"; exact-match scored separately.
  rows.push({ id: c.id, expected: c.expected, got, ok: got === c.expected, trapOk: trap ? got !== "pass" : null, trap, raw: out.answers ?? out });
  console.log(`${c.id.padEnd(14)} expected=${c.expected.padEnd(12)} got=${String(got).padEnd(12)} ${got === c.expected ? "✓" : "✗"}${trap ? (got !== "pass" ? "  [trap survived]" : "  [TRAP FAILED — passed bad evidence]") : ""}`);
  await sleep(DELAY);
}

const done = rows.filter((r) => r.got !== "ERROR");
const exact = done.filter((r) => r.ok).length;
const traps = done.filter((r) => r.trap);
const trapFails = traps.filter((r) => r.got === "pass").length;
const nonPassTargets = done.filter((r) => r.expected !== "pass");
const caught = nonPassTargets.filter((r) => r.got !== "pass").length;

console.log("\n=== SCORECARD ===");
console.log(`Cases run:        ${done.length}/${rows.length}${rows.length - done.length ? ` (${rows.length - done.length} errored)` : ""}`);
console.log(`Exact agreement:  ${exact}/${done.length}`);
console.log(`Catch rate:       ${caught}/${nonPassTargets.length} non-pass cases refused a pass  (decision line: >=90%)`);
console.log(`Trap failures:    ${trapFails}/${traps.length} traps wrongly passed              (decision line: 0)`);
console.log(`\nVerdict guidance: trap failures 0 AND catch rate >=90% -> advisory column in gate reports; otherwise revisit later.`);
console.log(`Full per-case raw answers withheld from stdout; inspect 'rows' by editing this script if needed. Never log keys.`);
