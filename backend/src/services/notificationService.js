/**
 * Notification Service
 *
 * Stuurt een e-mailmelding als een interessant bedrijf de site bezoekt.
 * Gebruikt Nodemailer met SMTP (bv. Gmail App Password of SendGrid).
 * Voorkomt spam: maximaal 1 melding per bedrijf per 4 uur.
 */

const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');

const COOLDOWN_HOURS = 4; // Niet opnieuw melden binnen dit aantal uren

/**
 * Controleert of een bedrijf op de watchlist staat.
 * De watchlist wordt geladen uit de INTERESTING_COMPANIES omgevingsvariabele.
 * @param {string|null} companyName
 * @returns {boolean}
 */
function isInteresting(companyName) {
  if (!companyName) return false;
  const watchlist = (process.env.INTERESTING_COMPANIES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (watchlist.length === 0) return false;
  const lowerName = companyName.toLowerCase();
  return watchlist.some((keyword) => lowerName.includes(keyword));
}

/**
 * Verwerkt een bezoek: markeert als interessant en stuurt melding indien nodig.
 * @param {object} visitor - rij uit de visitors tabel
 */
async function handleInterestingVisitor(visitor) {
  if (!visitor.is_interesting) return;

  // Controleer of er al recent een alert is verstuurd
  const cooldownTime = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
  const { data: recentAlerts } = await supabase
    .from('interesting_alerts')
    .select('id')
    .eq('visitor_id', visitor.id)
    .gte('triggered_at', cooldownTime)
    .limit(1);

  if (recentAlerts && recentAlerts.length > 0) {
    console.log(`[Notificatie] Cooldown actief voor ${visitor.company_name}, geen nieuwe melding.`);
    return;
  }

  // Sla de alert op in de database
  const { data: alert, error } = await supabase
    .from('interesting_alerts')
    .insert({
      visitor_id: visitor.id,
      company_name: visitor.company_name,
    })
    .select()
    .single();

  if (error) {
    console.error('[Notificatie] Fout bij opslaan alert:', error.message);
    return;
  }

  // Verstuur e-mail
  const sent = await sendEmailNotification(visitor);

  if (sent) {
    await supabase
      .from('interesting_alerts')
      .update({ notified: true, notified_at: new Date().toISOString() })
      .eq('id', alert.id);
  }
}

/**
 * Verstuurt de e-mailmelding.
 * @param {object} visitor
 * @returns {Promise<boolean>} true als succesvol verstuurd
 */
async function sendEmailNotification(visitor) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFY_EMAIL) {
    console.log('[Notificatie] SMTP niet geconfigureerd, e-mail overgeslagen.');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: SMTP_PORT === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const now = new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' });
  const location = [visitor.city, visitor.region, visitor.country_name]
    .filter(Boolean)
    .join(', ');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a3a5c; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">🚢 BECA One - Interessante bezoeker gedetecteerd</h2>
      </div>
      <div style="border: 1px solid #ddd; padding: 24px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; color: #555; width: 140px;">Bedrijf</td>
              <td style="padding: 8px; font-size: 18px; color: #1a3a5c; font-weight: bold;">${visitor.company_name || 'Onbekend'}</td></tr>
          <tr style="background: #f9f9f9;">
              <td style="padding: 8px; font-weight: bold; color: #555;">Locatie</td>
              <td style="padding: 8px;">${location || 'Onbekend'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">IP-adres</td>
              <td style="padding: 8px; font-family: monospace;">${visitor.ip_address}</td></tr>
          <tr style="background: #f9f9f9;">
              <td style="padding: 8px; font-weight: bold; color: #555;">Tijdstip</td>
              <td style="padding: 8px;">${now}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Bezoeken</td>
              <td style="padding: 8px;">${visitor.visit_count}x bezocht</td></tr>
        </table>
        <div style="margin-top: 20px; padding: 16px; background: #e8f0fe; border-radius: 6px;">
          <strong>Tip:</strong> Open het dashboard voor meer details over bezochte pagina's.
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"BECA Tracker" <${SMTP_USER}>`,
      to: NOTIFY_EMAIL,
      subject: `🚢 Interessante bezoeker: ${visitor.company_name || visitor.ip_address}`,
      html,
    });
    console.log(`[Notificatie] E-mail verstuurd voor ${visitor.company_name}`);
    return true;
  } catch (err) {
    console.error('[Notificatie] E-mail versturen mislukt:', err.message);
    return false;
  }
}

module.exports = { isInteresting, handleInterestingVisitor };
