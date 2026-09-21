#!/usr/bin/env node
/**
 * Jev pilot runner v4 — ATOMIC question decomposition per TypeSafe guidance.
 * Five narrow noul questions per case; verdict computed in code; raw probabilities printed.
 * Usage:  JEV_API_KEY=... node docs/planning/jev-pilot-runner-v4.mjs
 * Env: JEV_API_BASE (default https://api.typesafe.ai), JEV_API_PATH (default /v1/systemone),
 *      JEV_MODEL (jev-latest), JEV_DELAY_MS (1200), JEV_PASS_T (0.7), JEV_FAIL_T (0.3)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API_KEY = process.env.JEV_API_KEY;
if (!API_KEY) { console.error("JEV_API_KEY not set."); process.exit(1); }
const BASE = process.env.JEV_API_BASE ?? "https://api.typesafe.ai";
const PATH = process.env.JEV_API_PATH ?? "/v1/systemone";
const MODEL = process.env.JEV_MODEL ?? "jev-latest";
const DELAY = Number(process.env.JEV_DELAY_MS ?? 1200);
const PASS_T = Number(process.env.JEV_PASS_T ?? 0.7); // all conditions must clear this
const FAIL_T = Number(process.env.JEV_FAIL_T ?? 0.3); // contradiction must clear (1 - this)

// Five atomic conditions. Each is a narrow, self-contained yes/no about the text.
const QUESTIONS = {
  q_provenance: { type: "noul", instructions: "This text is QA evidence. Does it state the exact software deployment (a commit SHA, verified deployment ID, or immutable deployment URL) on which the observations were made, with that deployment verified rather than assumed?" },
  q_observed:   { type: "noul", instructions: "This text is QA evidence. Was the key claimed behavior directly observed by the tester (seen happening), as opposed to inferred from an indirect signal, a marker that could already have been true beforehand, or source code reading alone?" },
  q_db:         { type: "noul", instructions: "This text is QA evidence. If it makes any claim about persisted/stored state (a database value, ownership, a saved flag), is that claim backed by a direct database read? Answer yes if no persisted-state claim is made at all." },
  q_complete:   { type: "noul", instructions: "This text is QA evidence. Was every element of the expected outcome checked and satisfied, with no partial success (e.g., one part worked but another part visibly did not)?" },
  q_confound:   { type: "noul", instructions: "This text is QA evidence. Does it disclose or evidently contain a confound that undermines its own conclusion — such as an unstated or wrong deployment, a stale server, manually repaired data standing in for the real flow, or a response that occurs by design regardless of the change being tested?" },
  q_contradict: { type: "noul", instructions: "This text is QA evidence. Does the observed behavior directly contradict the stated expectation (i.e., the thing being tested visibly did NOT work)?" },
};

function verdict(p) {
  // fail: behavior contradicts expectation, and we actually observed it
  if (p.q_contradict >= 1 - FAIL_T && p.q_observed >= 0.5 && p.q_confound < 0.5) return "fail";
  // pass: all positive conditions strong, no confound, no contradiction
  if (p.q_provenance >= PASS_T && p.q_observed >= PASS_T && p.q_db >= PASS_T && p.q_complete >= PASS_T && p.q_confound <= FAIL_T && p.q_contradict <= FAIL_T) return "pass";
  return "insufficient";
}

const here = dirname(fileURLToPath(import.meta.url));
const { cases } = JSON.parse(readFileSync(join(here, "jev-pilot-cases.json"), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (a) => (typeof a?.noul === "number" ? a.noul : typeof a?.probability === "number" ? a.probability : NaN);

const rows = [];
for (const c of cases) {
  let out;
  try {
    const res = await fetch(`${BASE}${PATH}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ state: c.state, model: MODEL, questions: QUESTIONS }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
    out = await res.json();
  } catch (e) {
    console.log(`${c.id.padEnd(14)} ERROR: ${String(e).slice(0, 140)}`);
    rows.push({ id: c.id, got: "ERROR" });
    if (rows.length >= 3 && rows.every((r) => r.got === "ERROR")) {
      console.error(`\nFirst 3 failed — aborting. Node ${process.version}, endpoint ${BASE}${PATH}`);
      process.exit(1);
    }
    await sleep(DELAY);
    continue;
  }
  const a = out.answers ?? {};
  const p = Object.fromEntries(Object.keys(QUESTIONS).map((k) => [k, num(a[k])]));
  const got = verdict(p);
  const trap = c.tags.includes("trap");
  const probs = `prov=${p.q_provenance?.toFixed(2)} obs=${p.q_observed?.toFixed(2)} db=${p.q_db?.toFixed(2)} cmp=${p.q_complete?.toFixed(2)} cnf=${p.q_confound?.toFixed(2)} ctr=${p.q_contradict?.toFixed(2)}`;
  rows.push({ id: c.id, expected: c.expected, got, ok: got === c.expected, trap });
  console.log(`${c.id.padEnd(14)} exp=${c.expected.padEnd(12)} got=${got.padEnd(12)} ${got === c.expected ? "✓" : "✗"}${trap ? (got !== "pass" ? " [trap ok]" : " [TRAP PASSED — BAD]") : ""}  ${probs}`);
  await sleep(DELAY);
}

const done = rows.filter((r) => r.got !== "ERROR");
const exact = done.filter((r) => r.ok).length;
const passTargets = done.filter((r) => r.expected === "pass");
const passHit = passTargets.filter((r) => r.got === "pass").length;
const nonPass = done.filter((r) => r.expected !== "pass");
const caught = nonPass.filter((r) => r.got !== "pass").length;
const traps = done.filter((r) => r.trap);
const trapBad = traps.filter((r) => r.got === "pass").length;

console.log("\n=== SCORECARD v4 ===");
console.log(`Cases run:          ${done.length}/${rows.length}`);
console.log(`Exact agreement:    ${exact}/${done.length}`);
console.log(`Pass recognition:   ${passHit}/${passTargets.length} clean passes recognized as pass   (this was 0 in v3 — the number to watch)`);
console.log(`Catch rate:         ${caught}/${nonPass.length} non-pass refused a pass            (line: >=90%)`);
console.log(`Trap failures:      ${trapBad}/${traps.length} traps wrongly passed               (line: 0)`);
console.log(`Thresholds: PASS_T=${PASS_T} FAIL_T=${FAIL_T} — tune via env and rerun if probabilities look separable but miscut.`);
