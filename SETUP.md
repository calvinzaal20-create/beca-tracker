# BECA One — Bezoeker Tracker: Installatie & Setup

## Overzicht

```
beca-tracker/
├── backend/              ← Node.js + Express API
│   └── src/
│       ├── config/       ← Supabase client
│       ├── routes/       ← /api/track en /api/dashboard/*
│       └── services/     ← IP-lookup + e-mailnotificaties
├── frontend/             ← React dashboard
│   └── src/
│       ├── api/          ← API client
│       ├── components/   ← UI componenten
│       └── hooks/        ← useApi hook
├── supabase/
│   └── migrations/       ← SQL schema (run in Supabase SQL Editor)
└── tracker-script/
    └── beca-tracker.js   ← Plaatsen op de BECA One website
```

---

## Stap 1: Supabase database aanmaken

1. Maak een gratis account op https://supabase.com
2. Maak een nieuw project aan
3. Ga naar **SQL Editor → New Query**
4. Kopieer de inhoud van `supabase/migrations/001_initial_schema.sql`
5. Klik **Run**

Bewaar de volgende waarden (Settings → API):
- **Project URL** → `SUPABASE_URL`
- **service_role key** → `SUPABASE_SERVICE_KEY`

---

## Stap 2: ipinfo.io token

1. Maak een gratis account op https://ipinfo.io (50.000 lookups/maand gratis)
2. Kopieer je token uit het dashboard
3. Sla op als `IPINFO_TOKEN`

---

## Stap 3: Backend configureren

```bash
cd backend
cp .env.example .env
# Vul je waarden in .env
npm install
npm run dev
```

Minimale .env inhoud:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
IPINFO_TOKEN=jouw_token
ALLOWED_ORIGINS=http://localhost:3000
INTERESTING_COMPANIES=shell,boskalis,damen,svitzer,kotug
```

Backend draait op: http://localhost:3001

---

## Stap 4: Frontend configureren

```bash
cd frontend
cp .env.example .env
# Pas REACT_APP_API_URL aan indien nodig
npm install
npm start
```

Dashboard draait op: http://localhost:3000

---

## Stap 5: Tracking script plaatsen

Voeg toe aan elke pagina van de BECA One website, vóór `</body>`:

```html
<!-- BECA Visitor Tracker -->
<script src="/beca-tracker.js" data-endpoint="https://jouw-backend.nl/api/track"></script>
```

Of host het script op je CDN en verwijs ernaar. Het script:
- Is ~2KB
- Heeft **geen** externe afhankelijkheden
- Werkt op normale websites én React/Vue SPA's
- Stuurt heartbeats elke 15 seconden voor verblijfsduur
- Gebruikt `sendBeacon` voor betrouwbare tracking bij pagina-verlating

---

## Stap 6: E-mailnotificaties (optioneel)

Vul in backend `.env` in:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jouw@gmail.com
SMTP_PASS=jouw-app-wachtwoord    # Gmail → Instellingen → App-wachtwoorden
NOTIFY_EMAIL=sales@becaone.nl
```

Melding wordt verstuurd als een bedrijf van `INTERESTING_COMPANIES` de site bezoekt.
Cooldown: maximaal 1 melding per bedrijf per 4 uur.

---

## API Endpoints

| Methode | URL | Omschrijving |
|---------|-----|--------------|
| `POST` | `/api/track` | Ontvangt page view events |
| `GET` | `/api/dashboard/visitors` | Lijst bezoekers (paginering, zoeken) |
| `GET` | `/api/dashboard/visitors/:id` | Bezoeker detail + pagina's |
| `GET` | `/api/dashboard/stats` | Statistieken (bezoekers, pagina's, landen) |
| `GET` | `/api/dashboard/alerts` | Recente interessante-bezoeker meldingen |
| `GET` | `/health` | Health check |

---

## Dashboard beveiligen (productie)

Voeg toe aan beide `.env` bestanden:
```
# backend/.env
DASHBOARD_SECRET=lang-willekeurig-geheim-123

# frontend/.env
REACT_APP_DASHBOARD_SECRET=lang-willekeurig-geheim-123
```

---

## Veelgestelde vragen

**Waarom zie ik "Lokaal netwerk" als bedrijfsnaam?**
Je test lokaal (127.0.0.1). Op productie met een echt IP werkt de lookup correct.

**Hoe voeg ik meer bedrijven toe aan de watchlist?**
Pas `INTERESTING_COMPANIES` in `backend/.env` aan en herstart de backend.

**Hoe lang worden IP-lookups gecached?**
24 uur in het servergeheugen. Na herstart van de backend wordt de cache geleegd.

**Werkt dit ook voor bezoekers via VPN of proxy?**
Het tracker script stuurt het IP van de verbinding naar de backend. VPN-gebruikers worden geïdentificeerd als het VPN-bedrijf, niet hun echte werkgever.
