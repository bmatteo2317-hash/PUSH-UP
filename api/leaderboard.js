// GET /api/leaderboard?by=day|week|total|streak&user_id=xxx&limit=10
// Top-N + rank/percentili dell'utente. Solo aggregati anonimi, niente dati personali.
const { getSql, json } = require('./db');

const METRICS = { day: 'pb_day', week: 'week_total', total: 'total_all', streak: 'streak_cur' };

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET,OPTIONS');
    return json(res, 405, { error: 'Metodo non supportato.' });
  }

  let sql;
  try {
    sql = getSql();
  } catch (e) {
    return json(res, 500, { error: 'DATABASE_URL non configurata.' });
  }

  try {
    const q = req.query || {};
    const key = METRICS[q.by] ? q.by : 'day';
    const col = METRICS[key];
    const limit = Math.max(5, Math.min(25, parseInt(q.limit, 10) || 10));
    const userId = typeof q.user_id === 'string' ? q.user_id : null;

    // NOTA: `col` e `limit` sono interpolati ma provengono da whitelist/clamp, non dall'utente raw.
    const tot = await sql`SELECT COUNT(*)::int AS n FROM community_stats`;
    const total = tot[0].n;
    const top =
      col === 'pb_day'
        ? await sql`SELECT nickname, pb_day AS v FROM community_stats ORDER BY pb_day DESC, updated_at ASC LIMIT ${limit}`
        : col === 'week_total'
          ? await sql`SELECT nickname, week_total AS v FROM community_stats ORDER BY week_total DESC, updated_at ASC LIMIT ${limit}`
          : col === 'streak_cur'
            ? await sql`SELECT nickname, streak_cur AS v FROM community_stats ORDER BY streak_cur DESC, updated_at ASC LIMIT ${limit}`
            : await sql`SELECT nickname, total_all AS v FROM community_stats ORDER BY total_all DESC, updated_at ASC LIMIT ${limit}`;

    let you = null;
    if (userId) {
      const me = await sql`SELECT pb_day, week_total, total_all, streak_cur FROM community_stats WHERE user_id = ${userId} LIMIT 1`;
      if (me.length) {
        const pct = async (c, val) => {
          const r =
            c === 'pb_day'
              ? await sql`SELECT COUNT(*)::int AS n FROM community_stats WHERE pb_day > ${val}`
              : c === 'week_total'
                ? await sql`SELECT COUNT(*)::int AS n FROM community_stats WHERE week_total > ${val}`
                : c === 'streak_cur'
                  ? await sql`SELECT COUNT(*)::int AS n FROM community_stats WHERE streak_cur > ${val}`
                  : await sql`SELECT COUNT(*)::int AS n FROM community_stats WHERE total_all > ${val}`;
          const rank = r[0].n + 1;
          return { rank, pct: total <= 1 ? 100 : Math.round(((total - rank) / (total - 1)) * 100) };
        };
        const m = me[0];
        you = {
          day: await pct('pb_day', m.pb_day),
          week: await pct('week_total', m.week_total),
          total: await pct('total_all', m.total_all),
          streak: await pct('streak_cur', m.streak_cur),
          me: { day: m.pb_day, week: m.week_total, total: m.total_all, streak: m.streak_cur },
        };
      }
    }

    return json(res, 200, { ok: true, by: key, total, top, you });
  } catch (e) {
    console.error('[api/leaderboard]', e);
    return json(res, 500, { error: 'Errore database: ' + String((e && e.message) || e) });
  }
};
