import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener todos los jugadores activos
    const players = await base44.asServiceRole.entities.Player.filter({ activo: true });

    const calcularEdad = (fechaNac) => {
      if (!fechaNac) return null;
      const hoy = new Date();
      const nacimiento = new Date(fechaNac);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
      return edad;
    };

    // Filtrar jugadores con firmas pendientes
    const pendingPlayers = players.filter(p => {
      const esMayor = calcularEdad(p.fecha_nacimiento) >= 18;
      const jugadorPendiente = p.enlace_firma_jugador && !p.firma_jugador_completada;
      const tutorPendiente = p.enlace_firma_tutor && !p.firma_tutor_completada && !esMayor;
      return jugadorPendiente || tutorPendiente;
    });

    if (pendingPlayers.length === 0) {
      console.log('✅ No hay firmas pendientes');
      return Response.json({ sent: 0, message: 'No hay firmas pendientes' });
    }

    // Agrupar por email del padre para enviar un solo correo
    const byEmail = {};
    for (const p of pendingPlayers) {
      const email = p.email_padre;
      if (!email) continue;
      if (!byEmail[email]) byEmail[email] = [];
      
      const esMayor = calcularEdad(p.fecha_nacimiento) >= 18;
      const firmas = [];
      if (p.enlace_firma_jugador && !p.firma_jugador_completada) firmas.push('Firma del Jugador');
      if (p.enlace_firma_tutor && !p.firma_tutor_completada && !esMayor) firmas.push('Firma del Padre/Tutor');
      
      byEmail[email].push({ nombre: p.nombre, firmas });
    }

    let sent = 0;
    const errors = [];

    for (const [email, jugadores] of Object.entries(byEmail)) {
      try {
        const jugadoresHtml = jugadores.map(j => `
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;margin:8px 0;">
            <p style="font-weight:bold;margin:0 0 4px;">⚽ ${j.nombre}</p>
            <ul style="margin:0;padding-left:20px;font-size:14px;">
              ${j.firmas.map(f => `<li>${f}</li>`).join('')}
            </ul>
          </div>
        `).join('');

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `⏰ Recordatorio: Firmas de Federación pendientes`,
          body: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:linear-gradient(135deg,#f59e0b,#ea580c);padding:20px;text-align:center;border-radius:10px 10px 0 0;">
                <h1 style="color:white;margin:0;">⏰ Recordatorio de Firmas</h1>
              </div>
              <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;">
                <p style="font-size:16px;">Estimado/a padre/madre/tutor,</p>
                <p>Le recordamos que tiene <strong>firmas de federación pendientes</strong> para los siguientes jugadores:</p>
                ${jugadoresHtml}
                <div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:10px;padding:15px;margin:20px 0;">
                  <p style="margin:0;font-size:14px;"><strong>⚠️ Es importante completar las firmas lo antes posible</strong> para que los jugadores puedan estar inscritos en la federación.</p>
                </div>
                <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:15px;margin:20px 0;">
                  <p style="margin:0;font-size:14px;"><strong>¿Cómo firmar?</strong></p>
                  <ol style="margin:10px 0 0;padding-left:20px;font-size:14px;">
                    <li>Abra la <strong>app del club</strong></li>
                    <li>Vaya al menú <strong>"🖊️ Firmas Federación"</strong></li>
                    <li>Pulse <strong>"Firmar"</strong> en cada firma pendiente</li>
                  </ol>
                </div>
                <div style="text-align:center;margin:24px 0;">
                  <a href="https://app.cdbustarviejo.com" style="background:#ea580c;color:#fff;padding:12px 24px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">
                    Abrir la app del club →
                  </a>
                </div>
              </div>
              <div style="background:#1e293b;color:white;padding:15px;text-align:center;border-radius:0 0 10px 10px;">
                <p style="margin:0;font-size:12px;">CD Bustarviejo • Recordatorio automático</p>
              </div>
            </div>
          `
        });
        sent++;
        console.log(`📧 Recordatorio enviado a ${email} (${jugadores.length} jugadores)`);
      } catch (err) {
        console.error(`❌ Error enviando a ${email}:`, err.message);
        errors.push({ email, error: err.message });
      }
    }

    console.log(`✅ Recordatorios enviados: ${sent}/${Object.keys(byEmail).length}`);
    return Response.json({ 
      sent, 
      total: Object.keys(byEmail).length,
      pendingPlayers: pendingPlayers.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('❌ Error en signatureReminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});