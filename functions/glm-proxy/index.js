'use strict';
// Zero external dependencies — uses only Node built-ins so the function can be
// pasted straight into the Catalyst console editor with no npm install step.
const https = require('https');

const GLM_URL =
  'https://api.catalyst.zoho.in/quickml/v1/project/17603000000023001/glm/chat';
const CATALYST_ORG = '60039712979';
const TOKEN_URL = 'https://accounts.zoho.in/oauth/v2/token';

// Cached across warm invocations so we don't refresh on every request.
let cachedToken = null;
let cachedTokenExpiry = 0;

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

function httpsRequest(url, { method = 'POST', headers = {}, body = '', timeoutMs = 25000 }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + (parsed.search || ''),
      method,
      timeout: timeoutMs,
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
    };
    const r = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (c) => { data += c; });
      resp.on('end', () => resolve({ status: resp.statusCode, body: data }));
    });
    r.on('timeout', () => { r.destroy(); reject(new Error(`Request to ${parsed.hostname} timed out after ${timeoutMs}ms`)); });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

/** Exchanges the long-lived refresh token for a short-lived access token. */
async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry) return cachedToken;

  const clientId = process.env.QUICKML_CLIENT_ID;
  const clientSecret = process.env.QUICKML_CLIENT_SECRET;
  const refreshToken = process.env.QUICKML_REFRESH_TOKEN;

  const missing = [];
  if (!clientId) missing.push('QUICKML_CLIENT_ID');
  if (!clientSecret) missing.push('QUICKML_CLIENT_SECRET');
  if (!refreshToken) missing.push('QUICKML_REFRESH_TOKEN');
  if (missing.length) {
    throw new Error(`Missing environment variable(s): ${missing.join(', ')}`);
  }

  const form = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  }).toString();

  const resp = await httpsRequest(TOKEN_URL, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    timeoutMs: 10000,
  });

  let parsed;
  try {
    parsed = JSON.parse(resp.body);
  } catch {
    throw new Error(`Token endpoint returned non-JSON (HTTP ${resp.status}): ${resp.body.slice(0, 200)}`);
  }

  if (!parsed.access_token) {
    throw new Error(`Token refresh failed (HTTP ${resp.status}): ${resp.body.slice(0, 300)}`);
  }

  cachedToken = parsed.access_token;
  // expires_in is seconds; refresh 5 minutes early.
  const ttlMs = (parseInt(parsed.expires_in, 10) || 3600) * 1000;
  cachedTokenExpiry = Date.now() + Math.max(ttlMs - 300000, 60000);
  return cachedToken;
}

module.exports = async (req, res) => {
  console.log('[glm-proxy] v2 method:', req.method, 'url:', req.url);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed: ' + req.method });
  }

  let body;
  try {
    body = await getBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body' });
  }

  let token;
  try {
    token = await getAccessToken();
  } catch (err) {
    console.error('[glm-proxy] token error:', err.message);
    return sendJson(res, 500, { error: 'Failed to get OAuth token: ' + err.message });
  }

  let glmRes;
  try {
    glmRes = await httpsRequest(GLM_URL, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Zoho-oauthtoken ${token}`,
        'CATALYST-ORG': CATALYST_ORG,
      },
      body: JSON.stringify(body),
      timeoutMs: 25000,
    });
  } catch (err) {
    console.error('[glm-proxy] GLM request error:', err.message);
    return sendJson(res, 502, { error: 'GLM request failed: ' + err.message });
  }

  console.log('[glm-proxy] GLM responded', glmRes.status, 'bytes:', glmRes.body.length);
  res.writeHead(glmRes.status, { 'Content-Type': 'application/json' });
  res.end(glmRes.body);
};
