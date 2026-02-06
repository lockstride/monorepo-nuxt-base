const { appendFileSync } = require('node:fs');

function input(name, def = '') {
  const v = process.env[`INPUT_${name.toUpperCase()}`];
  return v === undefined || v === '' ? def : v;
}
function boolish(v) {
  if (!v) return false;
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1';
}
function num(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function setOutput(name, value) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) return;
  appendFileSync(out, `${name}=${value}\n`);
}

async function httpJson(url, options = {}) {
  const res = await globalThis.fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

async function deployRender({ serviceId, image, apiKey, wait, timeoutSec, pollSec }) {
  if (!apiKey) throw new Error('render_api_key is required for provider=render');
  const body = { clearCache: 'do_not_clear', imageUrl: image };
  console.log(`Triggering Render deploy service=${serviceId} image=${image}`);
  const resp = await httpJson(`https://api.render.com/v1/services/${serviceId}/deploys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const id = resp && resp.id;
  if (!wait) return { id, status: resp && resp.status };
  if (!id) throw new Error('Render deploy did not return an id');
  const deadline = Date.now() + timeoutSec * 1000;
  while (true) {
    const stat = await httpJson(`https://api.render.com/v1/services/${serviceId}/deploys/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const status = stat && stat.status;
    console.log(`Render status: ${status}`);
    if (status === 'live') return { id, status };
    if (status === 'build_failed' || status === 'update_failed' || status === 'canceled') {
      throw new Error(`Render deploy failed: ${JSON.stringify(stat)}`);
    }
    if (Date.now() > deadline) throw new Error('Timeout waiting for Render deploy');
    await new Promise((r) => setTimeout(r, pollSec * 1000));
  }
}

async function deployNorthflank({ project, serviceId, image, token, wait, timeoutSec, pollSec }) {
  if (!project) throw new Error('project is required for provider=northflank');
  if (!token) throw new Error('northflank_token is required for provider=northflank');
  console.log(`Triggering Northflank deploy ${project}/${serviceId} image=${image}`);
  const body = { image: { registry: 'ghcr', image } };
  await httpJson(`https://api.northflank.com/v1/projects/${project}/services/${serviceId}/deploy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!wait) return { status: 'triggered' };
  const deadline = Date.now() + timeoutSec * 1000;
  while (true) {
    const stat = await httpJson(`https://api.northflank.com/v1/projects/${project}/services/${serviceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = (stat && (stat.status || (stat.service && stat.service.status))) || 'unknown';
    console.log(`Northflank status: ${status}`);
    if (['running', 'healthy', 'live'].includes(status)) return { status };
    if (['failed', 'error'].includes(status)) {
      throw new Error(`Northflank deploy failed: ${JSON.stringify(stat)}`);
    }
    if (Date.now() > deadline) throw new Error('Timeout waiting for Northflank deploy');
    await new Promise((r) => setTimeout(r, pollSec * 1000));
  }
}

async function main() {
  const provider = input('provider');
  const image = input('image');
  const environment = input('environment');
  const serviceId = input('service_id');
  const project = input('project');
  const wait = boolish(input('wait', 'false'));
  const timeoutSec = num(input('timeout_seconds', '900'), 900);
  const pollSec = num(input('poll_interval_seconds', '5'), 5);
  const renderApiKey = input('render_api_key');
  const northflankToken = input('northflank_token');

  if (!provider) throw new Error('provider is required');
  if (!image) throw new Error('image is required');
  if (!environment) throw new Error('environment is required');
  if (!serviceId) throw new Error('service_id is required');

  console.log(`Provider=${provider}, Env=${environment}, Service=${serviceId}`);
  let result;
  if (provider === 'render') {
    result = await deployRender({ serviceId, image, apiKey: renderApiKey, wait, timeoutSec, pollSec });
  } else if (provider === 'northflank') {
    result = await deployNorthflank({ project, serviceId, image, token: northflankToken, wait, timeoutSec, pollSec });
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  // Optional: set an output status
  if (result && result.status) setOutput('status', String(result.status));

  // Append a concise summary for quick visibility
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    appendFileSync(
      summary,
      [
        `### Deploy ${provider}`,
        `- Environment: \`${environment}\``,
        `- Service: \`${serviceId}${project ? ` (project: ${project})` : ''}\``,
        `- Image: \`${image}\``,
        `- Wait: \`${wait}\``,
        result && result.status ? `- Status: \`${result.status}\`` : `- Status: \`triggered\``,
        ''
      ].join('\n')
    );
  }
}

main().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
