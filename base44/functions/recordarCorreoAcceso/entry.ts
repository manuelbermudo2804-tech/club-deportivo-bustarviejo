import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Envía a cada usuario un correo recordándole CON QUÉ CORREO está dado de alta,
// para evitar que creen cuentas nuevas cuando no lo recuerdan.
// payload: { test_email?: string }  -> si viene, solo se envía a esa dirección (prueba)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const testEmail = (body?.test_email || '').trim().toLowerCase();

    const allUsers = await base44.asServiceRole.entities.User.list();
    let destinatarios = allUsers.filter((u) => !!u.email);
    if (testEmail) {
      destinatarios = destinatarios.filter((u) => (u.email || '').toLowerCase() === testEmail);
      if (destinatarios.length === 0) {
        destinatarios = [{ email: testEmail, full_name: 'Prueba' }];
      }
    }

    const buildHtml = (nombre, email) => `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <h2 style="color:#ea580c">Tu correo de acceso al CD Bustarviejo</h2>
        <p>Hola${nombre ? ' ' + nombre : ''},</p>
        <p>Te recordamos que tu cuenta de la app del club está dada de alta con este correo:</p>
        <p style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:12px 16px;font-size:18px;font-weight:bold">${email}</p>
        <p><strong>Entra siempre con este correo.</strong> Es el que está vinculado a tus hijos/as, tus cuotas y tus convocatorias.</p>
        <p>Si no recuerdas la contraseña, usa la opción <strong>"He olvidado mi contraseña"</strong> de la pantalla de acceso.
        <strong>No crees una cuenta nueva</strong>: se quedaría vacía, sin tus jugadores ni tus pagos.</p>
        <p>Si crees que este correo no es el correcto o quieres cambiarlo, escríbenos y lo corregimos nosotros sin que pierdas nada.</p>
        <p style="color:#64748b;font-size:13px">Club Deportivo Bustarviejo</p>
      </div>`;

    let enviados = 0;
    const errores = [];
    for (const u of destinatarios) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: u.email,
          subject: 'Tu correo de acceso a la app del club',
          html: buildHtml((u.full_name || '').split(' ')[0], u.email),
        });
        enviados++;
      } catch (e) {
        errores.push({ email: u.email, error: e.message });
      }
      // Pausa para no saturar al proveedor de correo
      await new Promise((r) => setTimeout(r, 350));
    }

    return Response.json({ success: true, total: destinatarios.length, enviados, errores });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});