import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      empresa = "Sin especificar",
      origen = "directo",
      contacto_nombre,
      contacto_email,
      contacto_telefono = "",
      mensaje = "",
      paquetes_seleccionados = [],
      total_estimado = 0,
    } = body;

    if (!contacto_nombre || !contacto_email) {
      return Response.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    // Guardar propuesta
    const propuesta = await base44.asServiceRole.entities.PropuestaPatrocinio.create({
      empresa,
      origen,
      contacto_nombre,
      contacto_email,
      contacto_telefono,
      mensaje,
      paquetes_seleccionados,
      total_estimado,
      estado: "nueva",
    });

    // Email al presidente
    const listaPaquetes = paquetes_seleccionados.map((p) => {
      const precio = p.precio === null || p.precio === undefined ? "A convenir" : `${Number(p.precio).toLocaleString('es-ES')} €`;
      return `<li><strong>${p.nombre}</strong> — ${precio}</li>`;
    }).join("");

    const hayAConvenir = paquetes_seleccionados.some((p) => p.precio === null || p.precio === undefined);

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px;">
        <div style="background: linear-gradient(135deg, #0a4a55, #0E7A8C); color: white; padding: 24px; border-radius: 16px 16px 0 0;">
          <h1 style="margin: 0 0 8px; font-size: 22px;">🎯 Nueva Propuesta de Patrocinio</h1>
          <p style="margin: 0; opacity: 0.9;">Empresa: <strong>${empresa}</strong></p>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h2 style="font-size: 16px; color: #1e293b; margin-top: 0;">Contacto</h2>
          <p style="margin: 4px 0;"><strong>Nombre:</strong> ${contacto_nombre}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> <a href="mailto:${contacto_email}">${contacto_email}</a></p>
          ${contacto_telefono ? `<p style="margin: 4px 0;"><strong>Teléfono:</strong> ${contacto_telefono}</p>` : ''}

          <h2 style="font-size: 16px; color: #1e293b; margin-top: 24px;">Paquetes seleccionados</h2>
          <ul style="padding-left: 20px;">${listaPaquetes}</ul>

          <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
            <strong style="color: #9a3412; font-size: 18px;">Total estimado: ${Number(total_estimado).toLocaleString('es-ES')} €</strong>
            ${hayAConvenir ? '<br><span style="font-size: 12px; color: #92400e;">+ partidas a convenir</span>' : ''}
          </div>

          ${mensaje ? `
            <h2 style="font-size: 16px; color: #1e293b; margin-top: 24px;">Mensaje del contacto</h2>
            <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-style: italic; color: #475569;">${mensaje.replace(/\n/g, '<br>')}</div>
          ` : ''}

          <p style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            Propuesta recibida desde la página <strong>/${origen}</strong> · ID interno: ${propuesta.id}
          </p>
        </div>
      </div>
    `;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: "Propuestas Patrocinio CDB",
        to: "presidente@cdbustarviejo.com",
        subject: `🎯 Nueva propuesta de ${empresa} · ${Number(total_estimado).toLocaleString('es-ES')} €`,
        body: html,
      });
    } catch (emailErr) {
      console.error("Email fallo pero propuesta guardada:", emailErr);
    }

    return Response.json({ success: true, id: propuesta.id });
  } catch (error) {
    console.error("Error en submitPropuestaPatrocinio:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});