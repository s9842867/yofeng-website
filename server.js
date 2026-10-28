require('dotenv').config();
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DATABASE_URL = process.env.DATABASE_URL;

if (!JWT_SECRET || !ADMIN_PASSWORD || !DATABASE_URL) {
  console.warn('Missing DATABASE_URL, JWT_SECRET, or ADMIN_PASSWORD. API writes will not work until environment variables are configured.');
}

const pool = DATABASE_URL ? new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL_DISABLE === 'true' ? false : { rejectUnauthorized: false }
}) : null;

app.use(express.json({ limit: '100kb' }));

function authRequired(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !JWT_SECRET) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

function validNewsPayload(body) {
  if (!body || typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return false;
  if (body.url && !/^https?:\/\//i.test(body.url)) return false;
  const langs = ['zh-TW', 'zh-CN', 'en', 'ja'];
  if (!body.translations || typeof body.translations !== 'object') return false;
  return langs.every(lang => {
    const item = body.translations[lang];
    return item && typeof item.title === 'string' && item.title.trim() && typeof item.body === 'string' && item.body.trim();
  });
}

app.get('/api/health', async (req, res) => {
  if (!pool) return res.status(503).json({ ok: false, database: false });
  try { await pool.query('SELECT 1'); res.json({ ok: true, database: true }); }
  catch (error) { res.status(503).json({ ok: false, database: false }); }
});

app.post('/api/admin/login', (req, res) => {
  if (!JWT_SECRET || !ADMIN_PASSWORD) return res.status(503).json({ message: 'Admin service is not configured.' });
  const password = String(req.body?.password || '');
  if (!password || password !== ADMIN_PASSWORD) return res.status(401).json({ message: 'Incorrect password.' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  return res.json({ token });
});

app.get('/api/news', async (req, res) => {
  if (!pool) return res.status(503).json({ message: 'Database is not configured.' });
  try {
    const { rows } = await pool.query(`
      SELECT id, to_char(publish_date, 'YYYY-MM-DD') AS date, external_url AS url, translations
      FROM news
      ORDER BY publish_date DESC, id DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to load news.' });
  }
});

app.post('/api/news', authRequired, async (req, res) => {
  if (!pool) return res.status(503).json({ message: 'Database is not configured.' });
  if (!validNewsPayload(req.body)) return res.status(400).json({ message: 'Invalid news data.' });
  try {
    const { rows } = await pool.query(`
      INSERT INTO news (publish_date, external_url, translations)
      VALUES ($1, NULLIF($2, ''), $3::jsonb)
      RETURNING id, to_char(publish_date, 'YYYY-MM-DD') AS date, external_url AS url, translations
    `, [req.body.date, req.body.url || '', JSON.stringify(req.body.translations)]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to save news.' });
  }
});

// Serve the existing static website without changing its current page structure.
const siteDir = path.join(__dirname, 'site');
app.use(express.static(siteDir, { extensions: ['html'] }));
app.get('*', (req, res) => res.sendFile(path.join(siteDir, 'index.html')));

const server = app.listen(PORT, () => console.log(`YOFENG website running on port ${PORT}`));

async function shutdown() {
  await pool?.end().catch(() => {});
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
