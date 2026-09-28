// GET /api/health -> diagnostica rapida (sempre HTTP 200 con JSON, per mostrarla nel frontend)
// { ok, databaseUrlConfigured, tableExists, count, error }
const { getSql, json } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (!process.env.DATABASE_URL) {
    return json(res, 200, {
      ok: false,
      databaseUrlConfigured: false,
      tableExists: false,
      count: null,
      error: 'DATABASE_URL non configurata. Su Vercel: Project → Settings → Environment Variables → aggiungi DATABASE_URL (connection string di Neon), poi redeploy.',
    });
  }

  try {
    const sql = getSql();
    const t = await sql`SELECT to_regclass('public.workouts') AS tbl`;
    const exists = !!(t[0] && t[0].tbl);
    if (!exists) {
      return json(res, 200, {
        ok: false,
        databaseUrlConfigured: true,
        tableExists: false,
        count: null,
        error: 'Tabella "workouts" mancante nel database. Esegui schema.sql nel SQL Editor di Neon (vedi README).',
      });
    }
    const c = await sql`SELECT COUNT(*)::int AS n FROM workouts`;
    return json(res, 200, {
      ok: true,
      databaseUrlConfigured: true,
      tableExists: true,
      count: c[0].n,
      error: null,
    });
  } catch (e) {
    return json(res, 200, {
      ok: false,
      databaseUrlConfigured: true,
      tableExists: false,
      count: null,
      error: 'Connessione al database fallita: ' + String((e && e.message) || e),
    });
  }
};
