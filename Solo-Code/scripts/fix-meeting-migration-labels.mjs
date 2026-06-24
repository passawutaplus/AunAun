#!/usr/bin/env node
/** Fix Thai labels in meeting migration SQL files (UTF-8). */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const migDir = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");

const transcribeLabels = {
  ai_meeting_transcribe_15: "จดประชุม AI — ถอดเสียง ≤15 นาที",
  ai_meeting_transcribe_30: "จดประชุม AI — ถอดเสียง ≤30 นาที",
  ai_meeting_transcribe_45: "จดประชุม AI — ถอดเสียง ≤45 นาที",
  ai_meeting_transcribe_60: "จดประชุม AI — ถอดเสียง ≤60 นาที",
  ai_meeting_brief_extract_15: "จดประชุม AI — สรุปบรีฟ ≤15 นาที",
  ai_meeting_brief_extract_30: "จดประชุม AI — สรุปบรีฟ ≤30 นาที",
  ai_meeting_brief_extract_45: "จดประชุม AI — สรุปบรีฟ ≤45 นาที",
  ai_meeting_brief_extract_60: "Meeting — สรุปบรีฟ ≤60 นาที",
};

const reportLabels = {
  ai_meeting_report_15: "Meeting — สรุปรายงาน ≤15 นาที",
  ai_meeting_report_30: "Meeting — สรุปรายงาน ≤30 นาที",
  ai_meeting_report_45: "Meeting — สรุปรายงาน ≤45 นาที",
  ai_meeting_report_60: "Meeting — สรุปรายงาน ≤60 นาที",
};

function fixInsertBlock(content, labels) {
  let out = content;
  for (const [feature, label] of Object.entries(labels)) {
    const re = new RegExp(
      `\\('${feature}',\\s*\\d+,\\s*'[^']*'\\)`,
      "g",
    );
    const cost = feature.includes("_15")
      ? feature.includes("transcribe")
        ? 3
        : feature.includes("brief")
          ? 9
          : 5
      : feature.includes("_30")
        ? feature.includes("transcribe")
          ? 4
          : feature.includes("brief")
            ? 14
            : 7
        : feature.includes("_45")
          ? feature.includes("transcribe")
            ? 5
            : feature.includes("brief")
              ? 19
              : 9
          : feature.includes("transcribe")
            ? 6
            : feature.includes("brief")
              ? 24
              : 10;
    out = out.replace(re, `('${feature}', ${cost}, '${label}')`);
  }
  return out;
}

const capturesPath = join(migDir, "20260618120000_meeting_captures.sql");
const reportPath = join(migDir, "20260619120000_meeting_report.sql");

let captures = readFileSync(capturesPath, "utf8");
captures = fixInsertBlock(captures, transcribeLabels);
writeFileSync(capturesPath, captures, "utf8");

let report = readFileSync(reportPath, "utf8");
report = fixInsertBlock(report, reportLabels);
writeFileSync(reportPath, report, "utf8");

console.log("✓ Fixed Thai labels in meeting migration SQL files");
