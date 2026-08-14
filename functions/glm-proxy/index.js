'use strict';
const catalyst = require('zcatalyst-sdk-node');
const https = require('https');

const GLM_URL =
  'https://api.catalyst.zoho.in/quickml/v1/project/17603000000084001/glm/chat';
const CATALYST_ORG = '60039712979';

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (req.body && typeof req.body === 'string') {
      try { return resolve(JSON.parse(req.body)); } catch { return resolve({}); }
    }
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function httpsPost(url, headers, body, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = JSON.stringify(body);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      timeout: timeoutMs,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const reqHttp = https.request(options, (r) => {
      let data = '';
      r.on('data', (chunk) => { data += chunk; });
      r.on('end', () => resolve({ status: r.statusCode, body: data }));
    });
    reqHttp.on('timeout', () => { reqHttp.destroy(); reject(new Error('GLM request timed out after 25s')); });
    reqHttp.on('error', reject);
    reqHttp.write(payload);
    reqHttp.end();
  });
}

module.exports = async (req, res) => {
  console.log('[glm-proxy] method:', req.method, 'url:', req.url);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== 'POST') {
    console.log('[glm-proxy] rejected method:', req.method);
    return sendJson(res, 405, { error: 'Method not allowed: ' + req.method });
  }

  let body;
  try {
    body = await getBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body' });
  }

  // Get OAuth token via a Catalyst Connection named "quickml"
  let token;
  try {
    const app = catalyst.initialize(req, { scope: 'admin' });
    const connector = app.connection().getConnector('quickml');
    const tokenData = await connector.getAccessToken();
    token = tokenData.access_token;
  } catch (err) {
    console.error('[glm-proxy] token error:', err);
    return sendJson(res, 500, { error: 'Failed to get OAuth token: ' + err.message });
  }

  // Forward to GLM API
  let glmRes;
  try {
    glmRes = await httpsPost(
      GLM_URL,
      {
        Authorization: `Zoho-oauthtoken ${token}`,
        'CATALYST-ORG': CATALYST_ORG,
      },
      body
    );
  } catch (err) {
    console.error('[glm-proxy] GLM request error:', err);
    return sendJson(res, 502, { error: 'GLM request failed: ' + err.message });
  }

  res.writeHead(glmRes.status, { 'Content-Type': 'application/json' });
  res.end(glmRes.body);
};
