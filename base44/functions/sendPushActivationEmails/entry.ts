import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendEmail(to, subject, html) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'CD Bustarviejo <noreply@cdbustarviejo.com>',
      to: [to],
      subject,
      html
    })
  });
  return resp.ok;
}

function buildEmailHTML(userName) {
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:20px;background:#f8fafc">
    <div style="background:linear-gradient(135deg,#ea580c,#c2410c);color:white;padding:28px 24px;border-radius:16px 16px 0 0;text-align:center">
      <div style="font-size:48px;margin-bottom:8px">🔔</div>
      <h1 style="margin:0;font-size:22px;font-weight:800">¡Activa las notificaciones!</h1>
      <p style="margin:8px 0 0;opacity:0.9;font-size:14px">No te pierdas convocatorias ni mensajes</p>
    </div>
    
    <div style="background:white;padding:24px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none">
      <p style="margin:0 0 16px;color:#334155;font-size:15px">Hola <strong>${userName || 'familia'}</strong>,</p>
      
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6">
        Hemos detectado que <strong>no tienes las notificaciones activadas</strong> en la app del club. 
        Esto significa que <strong>no recibes avisos</strong> cuando:
      </p>
      
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:12px;padding:16px;margin:0 0 20px">
        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.8">
          ⚽ Se publica una <strong>convocatoria</strong> de partido<br>
          💬 Te envían un <strong>mensaje</strong> por el chat del equipo<br>
          📢 Hay un <strong>anuncio importante</strong> del club<br>
          ✍️ Necesitan tu <strong>firma</strong> para la federación
        </p>
      </div>
      
      <h2 style="margin:0 0 12px;color:#1e293b;font-size:16px">📱 Cómo activarlas (30 segundos):</h2>
      
      <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin:0 0 20px">
        <p style="margin:0 0 10px;color:#334155;font-size:13px;line-height:1.8">
          <strong>1.</strong> Abre la app desde tu móvil 👇<br>
          <strong>2.</strong> Verás un <span style="background:#ea580c;color:white;padding:2px 8px;border-radius:4px;font-size:12px">banner naranja</span> en la parte superior<br>
          <strong>3.</strong> Pulsa el botón <strong>"Activar"</strong><br>
          <strong>4.</strong> Cuando el móvil te pregunte, pulsa <strong>"Permitir"</strong><br>
          <strong>5.</strong> ¡Listo! Ya recibirás todas las notificaciones 🎉
        </p>
      </div>
      
      <div style="text-align:center;margin:24px 0">
        <a href="https://app.cdbustarviejo.com" style="display:inline-block;background:linear-gradient(135deg,#ea580c,#c2410c);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">
          🔔 Abrir la App y Activar
        </a>
      </div>
      
      <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:12px;margin:20px 0 0">
        <p style="margin:0;color:#991b1b;font-size:12px;line-height:1.6">
          <strong>⚠️ ¿No te aparece el banner?</strong><br>
          Ve a <strong>Ajustes del móvil → Apps → Chrome (o Safari) → Notificaciones → Activar</strong>. 
          Después vuelve a abrir la app.
        </p>
      </div>
      
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
      <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center">
        CD Bustarviejo · App del Club<br>
        Si necesitas ayuda, contacta con la directiva
      </p>
    </div>
  </div>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;
    const targetEmail = body.target_email || null;

    // Get all users
    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    
    // Get all active push subscriptions
    const pushSubs = await base44.asServiceRole.entities.PushSubscription.filter({ activa: true });
    const emailsWithPush = new Set(pushSubs.map(s => s.usuario_email));

    // Filter users without active push (exclude admin, tablet, disabled)
    let usersWithoutPush = users.filter(u => 
      u.email && 
      !emailsWithPush.has(u.email) && 
      u.role !== 'tablet' &&
      !u.disabled
    );

    // If targeting a specific email, filter to just that one
    if (targetEmail) {
      const targetUser = usersWithoutPush.find(u => u.email === targetEmail);
      if (!targetUser) {
        // Maybe user already has push, or doesn't exist
        const anyUser = users.find(u => u.email === targetEmail);
        if (anyUser && emailsWithPush.has(targetEmail)) {
          return Response.json({ success: true, sent: 0, message: 'User already has push activated' });
        }
        // Send anyway if user exists
        if (anyUser) {
          usersWithoutPush = [anyUser];
        } else {
          return Response.json({ error: 'User not found' }, { status: 404 });
        }
      } else {
        usersWithoutPush = [targetUser];
      }
    }

    console.log(`[PushEmails] ${usersWithoutPush.length} users to email (${users.length} total, ${emailsWithPush.size} with push)${targetEmail ? ' [individual: ' + targetEmail + ']' : ''}`);

    if (dryRun) {
      return Response.json({
        success: true,
        dry_run: true,
        total_users: users.length,
        users_with_push: emailsWithPush.size,
        users_without_push: usersWithoutPush.length,
        emails: usersWithoutPush.map(u => ({ email: u.email, name: u.full_name }))
      });
    }

    // Send emails
    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const u of usersWithoutPush) {
      try {
        const ok = await sendEmail(
          u.email,
          '🔔 ¡Activa las notificaciones del club! - CD Bustarviejo',
          buildEmailHTML(u.full_name)
        );
        if (ok) {
          sent++;
        } else {
          failed++;
          errors.push(u.email);
        }
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        failed++;
        errors.push(u.email);
        console.error(`[PushEmails] Error sending to ${u.email}:`, e.message);
      }
    }

    console.log(`[PushEmails] Done: ${sent} sent, ${failed} failed`);

    return Response.json({
      success: true,
      sent,
      failed,
      errors: errors.slice(0, 10),
      total_without_push: usersWithoutPush.length
    });
  } catch (error) {
    console.error('[PushEmails] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});