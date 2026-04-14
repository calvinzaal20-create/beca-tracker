/**
 * IP Lookup Service
 *
 * Gebruikt ipinfo.io om bedrijfsinformatie op te halen op basis van IP-adres.
 * Gratis tier: 50.000 requests/maand.
 * Resultaten worden 24 uur gecached in geheugen om API-limieten te sparen.
 */

const axios = require('axios');

// Eenvoudige in-memory cache: { ip: { data, expiresAt } }
const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 uur

// IPs die we nooit opzoeken (lokaal, privé-netwerken)
const SKIP_IPS = new Set(['127.0.0.1', '::1', 'localhost']);
const PRIVATE_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::ffff:127\./,
];

function isPrivateIp(ip) {
  if (SKIP_IPS.has(ip)) return true;
  return PRIVATE_RANGES.some((re) => re.test(ip));
}

/**
 * Haalt bedrijfsinfo op voor een IP-adres.
 * @param {string} ip
 * @returns {Promise<object>} ipinfo.io response object
 */
async function lookupIp(ip) {
  if (isPrivateIp(ip)) {
    return {
      ip,
      org: 'Lokaal netwerk',
      company_name: 'Lokaal netwerk',
      city: 'Onbekend',
      region: '',
      country: 'NL',
      country_name: 'Nederland',
      postal: '',
      latitude: null,
      longitude: null,
      timezone: 'Europe/Amsterdam',
      hostname: 'localhost',
    };
  }

  // Cache hit
  const cached = cache.get(ip);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const token = process.env.IPINFO_TOKEN;
  const url = token
    ? `https://ipinfo.io/${ip}?token=${token}`
    : `https://ipinfo.io/${ip}/json`;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    const raw = response.data;

    // Haal bedrijfsnaam op: verwijder het AS-nummer prefix (bv. "AS1234 Shell")
    const companyName = raw.org
      ? raw.org.replace(/^AS\d+\s+/i, '').trim()
      : null;

    // Splits lat/lng van het "loc" veld ("52.3676,4.9041")
    let latitude = null;
    let longitude = null;
    if (raw.loc) {
      const [lat, lng] = raw.loc.split(',').map(Number);
      latitude = isNaN(lat) ? null : lat;
      longitude = isNaN(lng) ? null : lng;
    }

    const data = {
      ip: raw.ip || ip,
      org: raw.org || null,
      company_name: companyName,
      city: raw.city || null,
      region: raw.region || null,
      country: raw.country || null,
      country_name: getCountryName(raw.country),
      postal: raw.postal || null,
      latitude,
      longitude,
      timezone: raw.timezone || null,
      hostname: raw.hostname || null,
    };

    cache.set(ip, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  } catch (err) {
    console.error(`[ipLookup] Fout bij opzoeken van ${ip}:`, err.message);
    return {
      ip,
      org: null,
      company_name: null,
      city: null,
      region: null,
      country: null,
      country_name: null,
      postal: null,
      latitude: null,
      longitude: null,
      timezone: null,
      hostname: null,
    };
  }
}

// Eenvoudige landcode → naam mapping (uitbreidbaar)
const COUNTRY_NAMES = {
  NL: 'Nederland', DE: 'Duitsland', BE: 'België', GB: 'Verenigd Koninkrijk',
  US: 'Verenigde Staten', FR: 'Frankrijk', NO: 'Noorwegen', DK: 'Denemarken',
  SE: 'Zweden', FI: 'Finland', PL: 'Polen', ES: 'Spanje', IT: 'Italië',
  PT: 'Portugal', GR: 'Griekenland', TR: 'Turkije', CN: 'China',
  JP: 'Japan', KR: 'Zuid-Korea', SG: 'Singapore', AU: 'Australië',
  CA: 'Canada', BR: 'Brazilië', AE: 'Verenigde Arabische Emiraten',
};

function getCountryName(code) {
  if (!code) return null;
  return COUNTRY_NAMES[code.toUpperCase()] || code;
}

module.exports = { lookupIp };
