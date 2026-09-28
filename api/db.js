// Helper condiviso: client Neon HTTP (funziona su Vercel Serverless, no pool TCP).
// Richiede env var DATABASE_URL (Neon pooled connection string).
const { neon } = require('@neondatabase/serverless');

let _sql = null;

function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    const err = new Error('DATABASE_URL non configurata');
    err.statusCode = 500;
    throw err;
  }
  _sql = neon(url);
  return _sql;
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function isValidDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00').getTime());
}

function isValidSeries(v) {
  return Array.isArray(v) && v.every((n) => Number.isInteger(n) && n >= 0 && n <= 10000);
}

module.exports = { getSql, json, isValidDate, isValidSeries };
