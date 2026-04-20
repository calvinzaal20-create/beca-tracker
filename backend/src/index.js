require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const trackRouter     = require('./routes/track');
const dashboardRouter = require('./routes/dashboard');
const sessionsRouter  = require('./routes/sessions');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS ---
// Staat toe dat het tracking script en het dashboard verbinding maken
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Geen origin = server-to-server of curl → toestaan
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS geblokkeerd: ${origin}`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// --- Body parsing ---
// Track + dashboard: kleine payloads (10kb is genoeg)
// Sessions: rrweb chunks kunnen 500kb+ zijn
app.use('/api/sessions', express.json({ limit: '5mb' }));
app.use(express.json({ limit: '50kb' }));

// --- Rate limiting voor het track endpoint ---
// Heartbeats (15s) + recording flushes (10s) = ~7 req/min per bezoeker
// Zet limiet ruim genoeg om echte bezoekers nooit te blokkeren
const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Te veel verzoeken. Probeer het later opnieuw.' },
});

// --- Routes ---
app.use('/api/track',      trackLimiter, trackRouter);
app.use('/api/sessions',   sessionsRouter);
app.use('/api/analytics',  analyticsRouter);
app.use('/api/dashboard',  dashboardRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug: laatste 10 bezoekers + page views (geen auth vereist)
app.get('/api/debug', async (req, res) => {
  try {
    const supabase = require('./config/supabase');
    const [visitors, pageViews] = await Promise.all([
      supabase.from('visitors').select('id,ip_address,company_name,city,country,last_seen,visit_count').order('last_seen', { ascending: false }).limit(10),
      supabase.from('page_views').select('id,page_url,created_at,duration_sec').order('created_at', { ascending: false }).limit(10),
    ]);
    res.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      recentVisitors: visitors.data || [],
      recentPageViews: pageViews.data || [],
      errors: { visitors: visitors.error?.message, pageViews: pageViews.error?.message },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint niet gevonden.' });
});

// Globale foutafhandeling
app.use((err, req, res, next) => {
  console.error('[Server] Fout:', err.message);
  res.status(500).json({ error: 'Interne serverfout.' });
});

// Luister op 0.0.0.0 zodat Railway (en andere cloud platforms) bereikbaar zijn
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   BECA One - Visitor Tracker Backend     ║
  ║   Draait op http://0.0.0.0:${PORT}          ║
  ╚══════════════════════════════════════════╝
  `);
});
