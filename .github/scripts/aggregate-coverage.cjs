const fs = require("fs");
const path = require("path");

// Only include these projects in coverage aggregation
const coveragePaths = [
  "coverage/apps/api/unit/coverage-summary.json",
  "coverage/apps/webapp/unit/coverage-summary.json",
  "coverage/apps/marketing/unit/coverage-summary.json",
  "coverage/packages/env-run/unit/coverage-summary.json",
];

const summaries = coveragePaths
  .map((p) => path.join(process.cwd(), p))
  .filter((p) => fs.existsSync(p));

// Aggregate totals
let totalLines = 0,
  coveredLines = 0;
for (const file of summaries) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  totalLines += data.total.lines.total;
  coveredLines += data.total.lines.covered;
}

const percentage =
  totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0;
const color =
  percentage >= 90 ? "brightgreen" : percentage >= 70 ? "yellow" : "red";

// Output JSON for gist
const badge = {
  schemaVersion: 1,
  label: "coverage",
  message: `${percentage}%`,
  color,
};
console.log(JSON.stringify(badge));
