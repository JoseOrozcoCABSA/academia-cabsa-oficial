import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const packages = ["academia-service", "ai-service", "analytics-service", "api-gateway", "content-service", "notifications-service", "users-service", "frontend-academia", "frontend-administracion"];
const allowedRscAdvisory = "GHSA-qwww-vcr4-c8h2";

function allowedSpaFinding(packageName, report) {
  if (!packageName.startsWith("frontend-")) return false;
  const manifest = JSON.parse(readFileSync(join(root, packageName, "package.json"), "utf8"));
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  if (Object.keys(dependencies).some((name) => name.startsWith("@react-router/") || name.startsWith("react-server-dom"))) return false;
  const findings = Object.values(report.vulnerabilities ?? {});
  const advisories = findings.flatMap((finding) => finding.via.filter((item) => typeof item === "object"));
  return findings.length > 0 && advisories.length === 1
    && advisories[0].url?.endsWith(allowedRscAdvisory) === true
    && findings.every((finding) => ["react-router", "react-router-dom"].includes(finding.name));
}

let failed = false;
for (const packageName of packages) {
  const audit = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    cwd: join(root, packageName), encoding: "utf8", shell: process.platform === "win32",
  });
  let report;
  try { report = JSON.parse(audit.stdout); }
  catch { console.error(`${packageName}: auditoría inválida.`); failed = true; continue; }
  const total = report.metadata?.vulnerabilities?.total ?? 0;
  if (total === 0) console.log(`${packageName}: 0 vulnerabilidades de producción.`);
  else if (allowedSpaFinding(packageName, report)) console.log(`${packageName}: excepción RSC validada para SPA/Vite.`);
  else { console.error(`${packageName}: ${total} vulnerabilidad(es) sin excepción.`); failed = true; }
}
if (failed) process.exitCode = 1;
