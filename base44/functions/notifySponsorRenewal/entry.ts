import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { sponsorId } = await req.json();
    if (!sponsorId) return Response.json({ error: 'Falta sponsorId' }, { status: 400 });

    const sponsor = await base44.asServiceRole.entities.Sponsor.get(sponsorId);
    if (!sponsor) return Response.json({ error: 'Patrocinador no encontrado' }, { status: 404 });
    if (!sponsor.contacto_email) {
      return Response.json({ error: 'Este patrocinador no tiene email de contacto' }, { status: 400 });
    }

    const fechaFin = sponsor.fecha_fin
      ? new Date(sponsor.fecha_fin).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

    const saludo = sponsor.contacto_nombre ? `Hola ${sponsor.contacto_nombre}` : 'Hola';
    const body = `${saludo},

Desde el Club Deportivo Bustarviejo queremos darte las gracias un año más por tu apoyo como patrocinador (${sponsor.nombre}).

${fechaFin ? `Tu acuerdo de patrocinio finaliza el ${fechaFin}.` : 'Tu acuerdo de patrocinio está próximo a finalizar.'} Nos encantaría seguir contando contigo la próxima temporada.

Si quieres renovar o comentar cualquier detalle, simplemente responde a este correo y nos pondremos en contacto contigo.

¡Muchas gracias por tu confianza!

Un saludo,
Club Deportivo Bustarviejo`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: sponsor.contacto_email,
      subject: `Renovación de patrocinio · Club Deportivo Bustarviejo`,
      body,
    });

    await base44.asServiceRole.entities.Sponsor.update(sponsorId, {
      fecha_ultimo_contacto: new Date().toISOString().split('T')[0],
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});