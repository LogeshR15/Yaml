'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');

const app = express();
app.use(express.json());

// CORS for local dev only — production Slate domain is handled by
// Catalyst gateway (Console → Authentication → Authorized Domains → CORS toggle)
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
  }
  next();
});

const PAGE_SIZE = 20;
const TABLE = 'YamlSpecs';

function sanitize(str) {
  return String(str || '').replace(/'/g, '');
}

// ── GET /server/yaml_api/yamls ─────────────────────────────────────────────
// Public. Paginated list with optional ?search=&product=&page= filters.
app.get('/server/yaml_api/yamls', async (req, res) => {
  try {
    const adminApp = catalyst.initialize(req, { scope: 'admin' });
    const zcql = adminApp.zcql();

    const search = sanitize(req.query.search);
    const product = sanitize(req.query.product);
    const page = Math.max(0, parseInt(req.query.page || '0', 10));
    const offset = page * PAGE_SIZE;

    const conditions = [];
    if (search) {
      conditions.push(
        `(tool_name LIKE '%${search}%' OR product_name LIKE '%${search}%' OR description LIKE '%${search}%' OR tags LIKE '%${search}%')`
      );
    }
    if (product) {
      conditions.push(`product_name = '${product}'`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    // Exclude yaml_content from list queries — only detail/download return it
    const query = `SELECT ROWID, tool_name, product_name, description, creator_name, creator_id, download_count, tags, CREATEDTIME FROM ${TABLE} ${where} ORDER BY CREATEDTIME DESC LIMIT ${offset}, ${PAGE_SIZE}`;

    const rows = await zcql.executeZCQLQuery(query);
    const data = rows.map(r => r[TABLE]).filter(Boolean);

    res.status(200).json({ data, page, pageSize: PAGE_SIZE });
  } catch (err) {
    console.error('GET /yamls:', err.message);
    res.status(500).json({ error: 'Failed to fetch specs' });
  }
});

// ── POST /server/yaml_api/yamls ────────────────────────────────────────────
// Requires auth (checked in code; Security Rules set to optional at gateway).
app.post('/server/yaml_api/yamls', async (req, res) => {
  try {
    // User-scope — only for identity resolution
    const userApp = catalyst.initialize(req);
    const currentUser = await userApp.userManagement().getCurrentUser();
    if (!currentUser || !currentUser.user_id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { tool_name, product_name, description, yaml_content, tags } = req.body;

    if (!tool_name || !yaml_content) {
      return res.status(400).json({ error: 'tool_name and yaml_content are required' });
    }
    if (yaml_content.length > 60000) {
      return res.status(400).json({
        error: 'YAML content exceeds the 60,000 character limit for marketplace publishing',
      });
    }

    const adminApp = catalyst.initialize(req, { scope: 'admin' });
    const table = adminApp.datastore().table(TABLE);

    const inserted = await table.insertRow({
      tool_name: String(tool_name).trim(),
      product_name: String(product_name || '').trim(),
      description: String(description || '').trim(),
      creator_name: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
      creator_id: String(currentUser.user_id),
      yaml_content,
      download_count: 0,
      tags: String(tags || '').trim(),
    });

    res.status(201).json({ data: { ROWID: inserted.ROWID } });
  } catch (err) {
    console.error('POST /yamls:', err.message);
    res.status(500).json({ error: 'Failed to publish spec' });
  }
});

// ── GET /server/yaml_api/yamls/:id ────────────────────────────────────────
// Public. Returns full spec including yaml_content.
app.get('/server/yaml_api/yamls/:id', async (req, res) => {
  try {
    const adminApp = catalyst.initialize(req, { scope: 'admin' });
    const zcql = adminApp.zcql();

    const id = sanitize(req.params.id);
    const rows = await zcql.executeZCQLQuery(
      `SELECT * FROM ${TABLE} WHERE ROWID = '${id}'`
    );
    const spec = rows[0]?.[TABLE];

    if (!spec) return res.status(404).json({ error: 'Spec not found' });

    res.status(200).json({ data: spec });
  } catch (err) {
    console.error('GET /yamls/:id:', err.message);
    res.status(500).json({ error: 'Failed to fetch spec' });
  }
});

// ── POST /server/yaml_api/yamls/:id/download ──────────────────────────────
// Public. Increments download_count and returns yaml_content.
app.post('/server/yaml_api/yamls/:id/download', async (req, res) => {
  try {
    const adminApp = catalyst.initialize(req, { scope: 'admin' });
    const zcql = adminApp.zcql();
    const table = adminApp.datastore().table(TABLE);

    const id = sanitize(req.params.id);

    const rows = await zcql.executeZCQLQuery(
      `SELECT ROWID, download_count, yaml_content FROM ${TABLE} WHERE ROWID = '${id}'`
    );
    const spec = rows[0]?.[TABLE];

    if (!spec) return res.status(404).json({ error: 'Spec not found' });

    // Two-step increment — no atomic INCREMENT in ZCQL
    await table.updateRow({
      ROWID: spec.ROWID,
      download_count: Number(spec.download_count || 0) + 1,
    });

    res.status(200).json({ data: { yaml_content: spec.yaml_content } });
  } catch (err) {
    console.error('POST /yamls/:id/download:', err.message);
    res.status(500).json({ error: 'Failed to process download' });
  }
});

module.exports = app;
