// GET    /api/workouts            -> { "YYYY-MM-DD": {wide:[],close:[],diamond:[]} }
// POST   /api/workouts            -> { date, entry:{wide,close,diamond} } upsert (o cancella se totale 0)
// DELETE /api/workouts?date=YYYY-MM-DD -> cancella giornata
//
// Tabella attesa (vedi schema.sql):
//   workouts(workout_date DATE PK, wide JSONB, "close" JSONB, diamond JSONB, updated_at TIMESTAMPTZ)

const { getSql, json, isValidDate, isValidSeries } = require('./db');

function rowToEntry(r) {
  const num = (v) => (Array.isArray(v) ? v.map((n) => parseInt(n, 10) || 0) : []);
  return { wide: num(r.wide), close: num(r.close), diamond: num(r.diamond) };
}

module.exports = async function handler(req, res) {
  // CORS base (stesso origin su Vercel, ma utile per test locali)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  let sql;
  try {
    sql = getSql();
  } catch (e) {
    return json(res, 500, { error: 'DATABASE_URL non configurata. Impostala su Vercel → Settings → Environment Variables.' });
  }

  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT workout_date, wide, "close", diamond FROM workouts ORDER BY workout_date ASC`;
      const out = {};
      for (const r of rows) {
        const d = r.workout_date instanceof Date ? r.workout_date.toISOString().slice(0, 10) : String(r.workout_date).slice(0, 10);
        out[d] = rowToEntry(r);
      }
      return json(res, 200, out);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { date, entry } = body;

      if (!isValidDate(date)) return json(res, 400, { error: 'Campo "date" non valido (usa YYYY-MM-DD).' });
      if (!entry || typeof entry !== 'object') return json(res, 400, { error: 'Campo "entry" mancante.' });

      const wide = entry.wide || [];
      const close = entry.close || [];
      const diamond = entry.diamond || [];
      if (!isValidSeries(wide) || !isValidSeries(close) || !isValidSeries(diamond)) {
        return json(res, 400, { error: 'Le serie devono essere array di interi >= 0.' });
      }

      const clean = {
        wide: wide.filter((v) => v > 0),
        close: close.filter((v) => v > 0),
        diamond: diamond.filter((v) => v > 0),
      };
      const total = clean.wide.length + clean.close.length + clean.diamond.length;

      if (total === 0) {
        await sql`DELETE FROM workouts WHERE workout_date = ${date}`;
        return json(res, 200, { ok: true, deleted: true, date });
      }

      await sql`
        INSERT INTO workouts (workout_date, wide, "close", diamond)
        VALUES (${date}, ${JSON.stringify(clean.wide)}::jsonb, ${JSON.stringify(clean.close)}::jsonb, ${JSON.stringify(clean.diamond)}::jsonb)
        ON CONFLICT (workout_date) DO UPDATE SET
          wide = EXCLUDED.wide,
          "close" = EXCLUDED."close",
          diamond = EXCLUDED.diamond,
          updated_at = NOW()
      `;
      return json(res, 200, { ok: true, date, entry: clean });
    }

    if (req.method === 'DELETE') {
      // Vercel popola req.query; fallback a parsing manuale dell'URL
      let date = (req.query && req.query.date) || null;
      if (!date && req.url && req.url.includes('?')) {
        date = new URL(req.url, 'http://localhost').searchParams.get('date');
      }
      if (!isValidDate(date)) return json(res, 400, { error: 'Query param "?date=YYYY-MM-DD" non valido.' });
      await sql`DELETE FROM workouts WHERE workout_date = ${date}`;
      return json(res, 200, { ok: true, deleted: true, date });
    }

    res.setHeader('Allow', 'GET,POST,DELETE,OPTIONS');
    return json(res, 405, { error: 'Metodo non supportato.' });
  } catch (e) {
    console.error('[api/workouts]', e);
    // Il messaggio (senza stack/credenziali) serve al frontend per mostrare la causa reale.
    return json(res, 500, { error: 'Errore database: ' + String((e && e.message) || e) });
  }
};
