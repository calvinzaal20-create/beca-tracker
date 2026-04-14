require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const trackRouter = require('./routes/track');
const dashboardRouter = require('./routes/dashboard');

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
app.use(express.json({ limit: '10kb' }));

// --- Rate limiting voor het track endpoint ---
// Voorkomt misbruik: max 30 requests per minuut per IP
const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Te veel verzoeken. Probeer het later opnieuw.' },
});

// --- Routes ---
app.use('/api/track', trackLimiter, trackRouter);
app.use('/api/dashboard', dashboardRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
