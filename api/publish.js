// POST /api/publish — upsert ANONIMO degli aggregati per la classifica community.
// Body: { user_id, nickname, pb:{wide,close,diamond,day}, totalAll, daysTrained, weekTotal, streakCur }
// I dati personali (serie/giorni) restano in localStorage: qui solo numeri aggregati.
const { getSql, json } = require('./db');

const clampInt = (v, max) => (Number.isInteger(v) && v >= 0 && v <= max ? v : null);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS');
    return json(res, 405, { error: 'Metodo non supportato.' });
  }

  let sql;
  try {
    sql = getSql();
  } catch (e) {
    return json(res, 500, { error: 'DATABASE_URL non configurata.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { user_id, nickname, pb, totalAll, daysTrained, weekTotal, streakCur } = body;

    if (typeof user_id !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(user_id)) {
      return json(res, 400, { error: 'user_id non valido.' });
    }
    const nick = String(nickname || 'Atleta')
      .replace(/[<>&"']/g, '')
      .trim()
      .slice(0, 20) || 'Atleta';

    const v = {
      pb_wide: clampInt(pb && pb.wide, 10000),
      pb_close: clampInt(pb && pb.close, 10000),
      pb_diamond: clampInt(pb && pb.diamond, 10000),
      pb_day: clampInt(pb && pb.day, 100000),
      total_all: clampInt(totalAll, 10000000),
      days_trained: clampInt(daysTrained, 10000),
      week_total: clampInt(weekTotal, 100000),
      streak_cur: clampInt(streakCur, 10000),
    };
    if (Object.values(v).some((x) => x === null)) {
      return json(res, 400, { error: 'Valori numerici non validi.' });
    }

    await sql`
      INSERT INTO community_stats
        (user_id, nickname, pb_wide, pb_close, pb_diamond, pb_day, total_all, days_trained, week_total, streak_cur, updated_at)
      VALUES
        (${user_id}, ${nick}, ${v.pb_wide}, ${v.pb_close}, ${v.pb_diamond}, ${v.pb_day}, ${v.total_all}, ${v.days_trained}, ${v.week_total}, ${v.streak_cur}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        nickname = EXCLUDED.nickname,
        pb_wide = EXCLUDED.pb_wide,
        pb_close = EXCLUDED.pb_close,
        pb_diamond = EXCLUDED.pb_diamond,
        pb_day = EXCLUDED.pb_day,
        total_all = EXCLUDED.total_all,
        days_trained = EXCLUDED.days_trained,
        week_total = EXCLUDED.week_total,
        streak_cur = EXCLUDED.streak_cur,
        updated_at = NOW()
    `;
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('[api/publish]', e);
    return json(res, 500, { error: 'Errore database: ' + String((e && e.message) || e) });
  }
};
