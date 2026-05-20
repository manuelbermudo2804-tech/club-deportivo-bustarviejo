import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { codigo, tipo, es_anonimo } = await req.json();

    // Cargar config LOPIVI
    const configs = await base44.asServiceRole.entities.LopiviConfig.list();
    const config = configs.find(c => c.activo !== false);
    if (!config?.dpi_email) {
      return Response.json({ error: 'DPI no configurado' }, { status: 400 });
    }

    const subject = `🛡️ [LOPIVI] Nueva incidencia recibida: ${codigo}`;
    const body = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:20px;color:#1f2937">
        <div style="background:linear-gradient(135deg,#059669,#0d9488);color:white;padding:20px;border-radius:10px 10px 0 0">
          <h2 style="margin:0">🛡️ Nueva incidencia LOPIVI</h2>
        </div>
        <div style="background:#fff;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">
          <p>Hola ${config.dpi_nombre || ''},</p>
          <p>Se ha registrado una nueva incidencia en el canal de Protección del Menor:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;background:#f3f4f6;font-weight:600">Código</td><td style="padding:8px;font-family:monospace">${codigo}</td></tr>
            <tr><td style="padding:8px;background:#f3f4f6;font-weight:600">Tipo</td><td style="padding:8px">${tipo}</td></tr>
            <tr><td style="padding:8px;background:#f3f4f6;font-weight:600">Modo</td><td style="padding:8px">${es_anonimo ? 'Anónima 🔒' : 'Identificada'}</td></tr>
          </table>
          <p style="background:#fef3c7;padding:12px;border-radius:6px;border-left:4px solid #f59e0b">
            <strong>⚠️ Importante:</strong> Por confidencialidad, los detalles completos NO se incluyen en este email. Accede al panel de administración del club para consultarlos.
          </p>
          <p style="font-size:13px;color:#6b7280;margin-top:24px">CD Bustarviejo · Canal de Protección del Menor (LOPIVI)</p>
        </div>
      </div>
    `;

    await base44.integrations.Core.SendEmail({
      to: config.dpi_email,
      subject,
      body,
      from_name: 'CD Bustarviejo - Canal LOPIVI',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('notifyLopiviIncidencia error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});