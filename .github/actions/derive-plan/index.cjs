const { execSync } = require('node:child_process');
const { appendFileSync, readFileSync } = require('node:fs');
const path = require('node:path');

function getInput(name, def = '') {
  const v = process.env[`INPUT_${name.toUpperCase()}`];
  return (v === undefined || v === '') ? def : v;
}

function setOutput(name, value) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) throw new Error('GITHUB_OUTPUT not set');
  appendFileSync(out, `${name}=${value}\n`);
}

function run(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  } catch (e) {
    const out = (e && e.stdout ? e.stdout.toString() : '') + (e && e.stderr ? e.stderr.toString() : '');
    return out.trim();
  }
}

function getNxVersion() {
  try {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    return (pkg.devDependencies && pkg.devDependencies.nx) || (pkg.dependencies && pkg.dependencies.nx) || '';
  } catch {
    return '';
  }
}

function runNx(args) {
  const nxVersion = getNxVersion();
  const tool = nxVersion ? `npx -y nx@${nxVersion}` : 'npx -y nx';
  return run(`${tool} ${args}`);
}

function toJsonArray(arr) {
  const clean = arr.filter(Boolean);
  return `[${clean.map((s) => `"${s}"`).join(',')}]`;
}

function boolish(v) {
  if (!v) return false;
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1';
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

async function main() {
  const selectionMode = getInput('selection_mode', 'affected');
  const includeApi = boolish(getInput('include_api'));
  const includeWebapp = boolish(getInput('include_webapp'));
  const includeMarketing = boolish(getInput('include_marketing'));
  const cacheMode = getInput('cache_mode', 'reuse');
  const pullBaseIn = boolish(getInput('pull_base'));
  const force = boolish(getInput('force'));
  const eventName = getInput('event_name');

  const apps = ['api', 'webapp', 'marketing'];


  // Affected lists (filter to known apps)
  const affBuildLines = runNx('show projects --affected') || '';
  const affE2eLines = runNx('show projects --affected --with-target=test-e2e') || '';
  const affBuild = affBuildLines.split('\n').filter((a) => apps.includes(a));
  const affE2e = affE2eLines.split('\n').filter((a) => apps.includes(a));

  // Build selection
  let selBuild = [];
  if (force) {
    selBuild = [...apps];
  } else if (eventName === 'workflow_dispatch') {
    if (selectionMode === 'all') {
      selBuild = [...apps];
    } else if (selectionMode === 'custom') {
      if (includeApi) selBuild.push('api');
      if (includeWebapp) selBuild.push('webapp');
      if (includeMarketing) selBuild.push('marketing');
    }
  }
  if (selBuild.length === 0 && affBuild.length > 0) selBuild = [...affBuild];
  selBuild = uniq(selBuild);

  // E2E selection
  let selE2e = [];
  if (force) {
    selE2e = [...apps];
  } else if (eventName === 'workflow_dispatch') {
    if (selectionMode === 'all') {
      selE2e = [...apps];
    } else if (selectionMode === 'custom') {
      if (includeApi) selE2e.push('api');
      if (includeWebapp) selE2e.push('webapp');
      if (includeMarketing) selE2e.push('marketing');
    }
  }
  if (selE2e.length === 0 && affE2e.length > 0) selE2e = [...affE2e];
  selE2e = uniq(selE2e);

  // Flags
  let noCache = false;
  let pullBase = false;
  let forceAll = false;
  if (eventName === 'workflow_dispatch') {
    if (cacheMode === 'no-cache') noCache = true;
    if (pullBaseIn) pullBase = true;
    if (selectionMode === 'all') forceAll = true;
  }
  if (force) forceAll = true;

  // Prepare outputs as variables
  const outputMatrix = toJsonArray(selBuild);
  const outputE2eMatrix = toJsonArray(selE2e);
  const outputHasBuild = selBuild.length > 0 ? 'true' : 'false';
  const outputHasE2e = selE2e.length > 0 ? 'true' : 'false';
  const outputNoCache = String(noCache);
  const outputPullBase = String(pullBase);
  const outputForceAll = String(forceAll);

  // Emit outputs
  setOutput('matrix', outputMatrix);
  setOutput('e2e_matrix', outputE2eMatrix);
  setOutput('has_build', outputHasBuild);
  setOutput('has_e2e', outputHasE2e);
  setOutput('no_cache', outputNoCache);
  setOutput('pull_base', outputPullBase);
  setOutput('force_all', outputForceAll);

  if (getInput('debug_workflows') === 'true') {
    // Debugging: append details to job summary for easier troubleshooting
    try {
      const summary = process.env.GITHUB_STEP_SUMMARY;
      if (summary) {
        const nxVersion = getNxVersion();
        const base = process.env.NX_BASE || '';
        const head = process.env.NX_HEAD || '';
        const lines = [
          '### derive-plan debug',
          `- nx version: \`${nxVersion || 'unknown'}\``,
          `- NX_BASE: \`${base}\``,
          `- NX_HEAD: \`${head}\``,
          `- raw affected (build):`,
          '```',
          affBuildLines || '<empty>',
          '```',
          `- raw affected (e2e with target):`,
          '```',
          affE2eLines || '<empty>',
          '```',
          `- matrix: \`${outputMatrix}\``,
          `- e2e_matrix: \`${outputE2eMatrix}\``,
          `- has_build: \`${outputHasBuild}\``,
          `- has_e2e: \`${outputHasE2e}\``,
          `- no_cache: \`${outputNoCache}\``,
          `- pull_base: \`${outputPullBase}\``,
          `- force_all: \`${outputForceAll}\``,
          ''
        ].join('\n');
        appendFileSync(summary, lines);
      }
    } catch {
      console.error('Failed to append debug details to job summary');
    }
  }

}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
