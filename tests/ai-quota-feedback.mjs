import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const output = "src/services/.ai-quota-feedback-" + process.pid + ".mjs";
try {
  const source = await readFile("src/services/aiQuotaFeedback.ts", "utf8");
  assert.ok(!/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/.test(source),
    "quota copy is entirely local; it must not query ledger or transmit content");
  await writeFile(output, ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
  } }).outputText, { flag: "wx" });
  const { describeAiFailure } = await import(pathToFileURL(process.cwd() + "/" + output).href);
  const now = new Date("2026-10-23T06:24:00Z");
  const hour = describeAiFailure("budget_hourly_limit_reached", now);
  const day = describeAiFailure("budget_daily_limit_reached", now);
  const month = describeAiFailure("budget_monthly_limit_reached", now);
  const spending = describeAiFailure("budget_spending_limit_reached", now);
  assert.match(hour, /10 model calls/);
  assert.match(hour, /Oct 23/);
  assert.match(day, /40 model calls/);
  assert.match(day, /Oct 24/);
  assert.match(month, /100 model calls/);
  assert.match(month, /Nov 1/);
  assert.match(spending, /\$5 monthly/);
  assert.match(spending, /Nov 1/);
  assert.ok(!hour.includes("secret") && !day.includes("secret"));
  assert.match(describeAiFailure("budget_limit_reached", now), /cannot identify which one/);
  assert.match(describeAiFailure("provider_timeout", now), /provider_timeout/);
  const page = await readFile("src/pages/FindDinner.tsx", "utf8");
  const secondary = await readFile("src/components/AiDinnerCompanion.tsx", "utf8");
  assert.ok(page.includes("describeAiFailure(result.error)") &&
    secondary.includes("describeAiFailure(result.error)"));
  console.log("AI quota diagnostics and UTC resets in local-time display passed");
} finally { await unlink(output).catch(() => {}); }
