# Push-Up Tracker — Vercel + Neon

App statica (`index.html`) + Serverless API (`/api/workouts`) + Postgres su Neon.

## 1. Crea il database Neon

1. Vai su https://neon.tech → New Project (region vicina, es. EU West).
2. Apri **SQL Editor** e incolla il contenuto di `schema.sql` → Run.
3. Vai su **Connect** → copia la **pooled connection string**, es:
   `postgresql://user:pass@ep-xxx-pooler.eu-west-1.aws.neon.tech/dbname?sslmode=require`

## 2. Deploy su Vercel

```bash
npm i -g vercel
vercel          # primo deploy (anteprima)
```

Poi imposta la variabile d'ambiente (oppure da Dashboard → Project → Settings → Environment Variables):

```bash
vercel env add DATABASE_URL production
# incolla la connection string di Neon
vercel --prod
```

Oppure da Dashboard Vercel:
- **Settings → Environment Variables** → `DATABASE_URL` = connection string Neon (tutti gli env: Production, Preview, Development).
- Oppure usa l'integrazione ufficiale: **Storage → Connect → Neon**.

## 3. Test locale

```bash
npm install
# crea .env da .env.example con la tua DATABASE_URL
vercel dev
# apri http://localhost:3000
```

## Struttura

```
index.html          → frontend (fetch /api/workouts, fallback localStorage offline)
api/
  db.js             → client @neondatabase/serverless + validazioni
  workouts.js       → GET/POST/DELETE allenamenti
schema.sql          → tabella workouts su Neon
package.json        → dipendenza @neondatabase/serverless
vercel.json         → runtime nodejs22.x per /api
pushup-tracker.html → originale (solo localStorage, tenuto per riferimento)
```

## API

- `GET /api/workouts` → `{ "2026-09-01": {wide:[20,15], close:[10], diamond:[]} }`
- `POST /api/workouts` body `{date:"YYYY-MM-DD", entry:{wide:[],close:[],diamond:[]}}` → upsert (totale 0 = cancella)
- `DELETE /api/workouts?date=YYYY-MM-DD` → cancella giornata

Il frontend mostra **"Connesso a Neon ☁️"** oppure **"Offline — uso dati locali"** se `DATABASE_URL` manca o il DB non risponde.
