import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Push a través del motor central (onPushTrigger): campana + registro de entrega.
async function enginePush(base44, emails, title, body, url, tag, extra = {}) {
  const list = [...new Set((emails || []).filter(Boolean))];
  if (!list.length) return { sent: 0, failed: 0 };
  const raw = new TextEncoder().encode(Deno.env.get('VAPID_PRIVATE_KEY') || '');
  const internal_key = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', raw))).map(b => b.toString(16).padStart(2, '0')).join('');
  try {
    const res = await base44.asServiceRole.functions.invoke('onPushTrigger', { direct: { emails: list, title, body, url, tag, ...extra }, internal_key });
    return res?.data || { sent: 0, failed: 0 };
  } catch (e) { console.error('[push] motor central:', e.message); return { sent: 0, failed: 0 }; }
}

// Email de respaldo si por algún motivo no hay admins en BD
const FALLBACK_ADMIN_EMAIL = 'manuelbermudo2804@gmail.com';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'CD Bustarviejo <noreply@cdbustarviejo.com>';

// Envío directo via Resend (evita el 403 de invocar sendEmail entre funciones service-role)
async function sendWithResend(to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Resend ${response.status}: ${errBody}`);
  }
  return response.json();
}


Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const data = body?.data || {};

    if (!data || !data.email) {
      return Response.json({ skipped: true, reason: 'No data' });
    }

    const nombre = data.nombre_progenitor || 'Alguien';
    const categoria = data.categoria || '';
    const titulo = '🔔 Nueva solicitud de acceso';
    const cuerpo = `${nombre} (${categoria}) está esperando código.`;

    // Obtener TODOS los admins (con fallback al email fijo si no hay ninguno)
    let adminEmails = [];
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      adminEmails = admins.map(a => a.email).filter(Boolean);
    } catch (e) { console.error('Error obteniendo admins:', e); }
    if (adminEmails.length === 0) adminEmails = [FALLBACK_ADMIN_EMAIL];

    const body_id = body?.event?.entity_id || data.id || data.email;
    const pushResult = await enginePush(base44, adminEmails, titulo, cuerpo, '/AdminAccessCodes?tab=bandeja',
      `access-request-${body_id}`, { requireInteraction: true, source: 'notifyAdminNewAccessRequest' });
    const sent = pushResult.sent || 0;

    // SIEMPRE enviar email a TODOS los admins como respaldo (push puede fallar / estar caducado)
    let emailSent = 0;
    const telefono = data.telefono || '—';
    const whatsapp = data.prefiere_whatsapp ? '✅ Sí, prefiere WhatsApp' : '—';
    for (const adminEmail of adminEmails) {
      try {
        await sendWithResend(
          adminEmail,
          `🔔 Nueva solicitud de acceso: ${nombre}`,
          `
            <h2>Nueva solicitud de código de acceso</h2>
            <p><strong>Nombre:</strong> ${nombre}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Teléfono:</strong> ${telefono}</p>
            <p><strong>Categoría:</strong> ${categoria}</p>
            <p><strong>WhatsApp:</strong> ${whatsapp}</p>
            <p><strong>Nombre jugador:</strong> ${data.nombre_jugador || '—'}</p>
            <hr>
            <p>👉 <a href="https://app.base44.com/apps/6992c6be619d2da592897991/AdminAccessCodes?tab=bandeja">Abrir bandeja de solicitudes</a></p>
          `
        );
        emailSent++;
      } catch (e) {
        console.error(`Error enviando email a ${adminEmail}:`, e?.message || e);
      }
    }

    return Response.json({ success: true, sent, emailSent, adminCount: adminEmails.length, push: pushResult });
  } catch (error) {
    console.error('Error notifyAdminNewAccessRequest:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});