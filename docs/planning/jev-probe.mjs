#!/usr/bin/env node
/** One-call schema probe: prints Jev's raw response so the runner's parser can be fixed. Costs ~one question. */
const API_KEY = process.env.JEV_API_KEY;
if (!API_KEY) { console.error("JEV_API_KEY not set."); process.exit(1); }
const BASE = process.env.JEV_API_BASE ?? "https://api.typesafe.ai";
const PATH = process.env.JEV_API_PATH ?? "/v1/systemone";

const res = await fetch(`${BASE}${PATH}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    state: "The deployment SHA was verified via the hosting API before testing. The tester directly observed the confirmation link land on the expected page, and an independent database read confirmed the persisted row matches. Every element of the expected outcome was checked and matched.",
    model: process.env.JEV_MODEL ?? "jev-latest",
    questions: {
      clearly_yes: { type: "noul", instructions: "Was the deployment verified before testing, according to this text?" },
      clearly_no: { type: "noul", instructions: "Does this text describe a test failure?" },
    },
  }),
});
console.log(`HTTP ${res.status} from ${BASE}${PATH}`);
console.log(JSON.stringify(await res.json(), null, 2));
