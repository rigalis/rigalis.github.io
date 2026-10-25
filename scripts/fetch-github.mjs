#!/usr/bin/env node
/**
 * Build-time GitHub data fetch.
 *
 * Writes src/data/github.json, which GitGraph renders as static markup.
 * No client-side requests, no third-party contribution proxies.
 *
 * Source order:
 *   1. GraphQL  viewer.contributionsCollection  (needs GH_STATS_TOKEN)
 *   2. Public contributions calendar HTML        (no token, public counts only)
 *
 * Fail-soft: if every source fails, the previous JSON is left untouched and
 * the process exits 0 so a deploy never breaks over a stats fetch.
 *
 * Env:
 *   GH_STATS_TOKEN  PAT owned by the profile user. Classic PAT with `read:user`
 *                   to include private contribution counts. Optional.
 *   GH_USERNAME     Defaults to "rigalis".
 */

import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "data", "github.json");

const USERNAME = process.env.GH_USERNAME || "rigalis";
const TOKEN = process.env.GH_STATS_TOKEN || "";
const DAYS = 365;

const log = (...a) => console.log("[github]", ...a);

const ymd = (d) => d.toISOString().slice(0, 10);

function windowRange(days) {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Primary path: GraphQL, counts private contributions when the token has read:user. */
async function fromGraphQL() {
  if (!TOKEN) throw new Error("GH_STATS_TOKEN not set");

  const query = `query($from: DateTime!, $to: DateTime!) {
    viewer {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays { date contributionCount }
          }
        }
      }
    }
  }`;

  const { from, to } = windowRange(DAYS);
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": `${USERNAME}-portfolio-build`,
    },
    body: JSON.stringify({ query, variables: { from, to } }),
  });

  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(`graphql ${res.status}: ${JSON.stringify(json.errors || json)}`);
  }

  const cal = json.data?.viewer?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error("graphql: empty contributionCalendar (is the token owned by " + USERNAME + "?)");

  const byDate = new Map();
  for (const week of cal.weeks) {
    for (const day of week.contributionDays) {
      byDate.set(day.date, day.contributionCount);
    }
  }

  const contributions = [...byDate.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { contributions, total: cal.totalContributions ?? contributions.reduce((n, d) => n + d.count, 0) };
}

/**
 * Fallback path: GitHub's own public calendar for the profile.
 * Cells are laid out column-major, so they are keyed by data-date rather than
 * read in document order. Counts come from the linked <tool-tip> text.
 */
async function fromPublicCalendar() {
  const res = await fetch(`https://github.com/users/${encodeURIComponent(USERNAME)}/contributions`, {
    headers: { "User-Agent": `${USERNAME}-portfolio-build` },
  });
  if (!res.ok) throw new Error(`calendar ${res.status}`);
  const html = await res.text();

  const dates = new Map();
  for (const m of html.matchAll(/<td[^>]*class="ContributionCalendar-day"[^>]*>/g)) {
    const id = /id="([^"]+)"/.exec(m[0])?.[1];
    const date = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(m[0])?.[1];
    if (id && date) dates.set(id, date);
  }

  const counts = new Map();
  for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const [, id, text] = m;
    const n = /^\s*No contributions/i.test(text) ? 0 : parseInt(text, 10);
    if (Number.isFinite(n)) counts.set(id, n);
  }

  if (dates.size === 0) throw new Error("calendar: no day cells parsed");

  const contributions = [...dates.entries()]
    .map(([id, date]) => ({ date, count: counts.get(id) ?? 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { contributions, total: contributions.reduce((n, d) => n + d.count, 0) };
}

function writeAtomic(file, payload) {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n");
  renameSync(tmp, file);
}

async function main() {
  const previous = existsSync(OUT) ? readFileSync(OUT, "utf8") : null;

  const attempts = [
    ["graphql", fromGraphQL],
    ["public-calendar", fromPublicCalendar],
  ];

  for (const [source, fn] of attempts) {
    try {
      const { contributions, total } = await fn();
      if (!contributions.length) throw new Error("no data");

      writeAtomic(OUT, {
        login: USERNAME,
        generatedAt: new Date().toISOString(),
        source,
        totalContributions: total,
        days: contributions.length,
        contributions,
      });

      log(`ok via ${source}: ${contributions.length} days, ${total} contributions`);
      return;
    } catch (err) {
      log(`skip ${source}: ${err.message}`);
    }
  }

  if (previous) {
    log("all sources failed — keeping existing src/data/github.json");
  } else {
    log("all sources failed and no existing data — writing empty set");
    writeAtomic(OUT, {
      login: USERNAME,
      generatedAt: new Date().toISOString(),
      source: "empty",
      totalContributions: 0,
      days: 0,
      contributions: [],
    });
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[github] unexpected:", err);
  process.exit(0);
});
