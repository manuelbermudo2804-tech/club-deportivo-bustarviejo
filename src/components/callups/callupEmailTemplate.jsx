import { format } from "date-fns";
import { es } from "date-fns/locale";

export function buildCallupEmailHtml(callup, jugadorNombre) {
  const fechaFormateada = (() => {
    try {
      return format(new Date(callup.fecha_partido), "EEEE, d 'de' MMMM", { locale: es });
    } catch { return callup.fecha_partido; }
  })();

  const rivalText = callup.rival ? `vs ${callup.rival}` : "";
  const localVisitante = callup.local_visitante === "Local" ? "🏠 Local" : "✈️ Visitante";
  const mapsLink = callup.enlace_ubicacion || "";
  const concentracion = callup.hora_concentracion || "";
  const descripcion = callup.descripcion || "";
  const telefono = callup.entrenador_telefono || "";
  const appUrl = "https://app.cdbustarviejo.com/parentcallups";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- Header naranja -->
<tr><td style="background:linear-gradient(135deg,#ea580c,#c2410c);padding:28px 24px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">⚽</div>
  <div style="color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;">¡CONVOCATORIA!</div>
  <div style="color:#fed7aa;font-size:14px;margin-top:4px;">CD Bustarviejo</div>
</td></tr>

<!-- Nombre del jugador -->
<tr><td style="padding:20px 24px 0;text-align:center;">
  <div style="background:#fff7ed;border:2px solid #fdba74;border-radius:12px;padding:14px 16px;">
    <div style="color:#9a3412;font-size:13px;font-weight:600;">JUGADOR CONVOCADO</div>
    <div style="color:#c2410c;font-size:20px;font-weight:800;margin-top:4px;">${jugadorNombre}</div>
  </div>
</td></tr>

<!-- Datos del partido -->
<tr><td style="padding:20px 24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
    ${rivalText ? `<tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
      <div style="color:#64748b;font-size:12px;font-weight:600;">RIVAL</div>
      <div style="color:#0f172a;font-size:17px;font-weight:700;margin-top:2px;">${callup.rival} <span style="color:#94a3b8;font-size:13px;">${localVisitante}</span></div>
    </td></tr>` : ""}
    <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
      <div style="color:#64748b;font-size:12px;font-weight:600;">📅 FECHA</div>
      <div style="color:#0f172a;font-size:16px;font-weight:700;margin-top:2px;text-transform:capitalize;">${fechaFormateada}</div>
    </td></tr>
    <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
      <div style="color:#64748b;font-size:12px;font-weight:600;">⏰ HORA DEL PARTIDO</div>
      <div style="color:#0f172a;font-size:16px;font-weight:700;margin-top:2px;">${callup.hora_partido}h</div>
    </td></tr>
    ${concentracion ? `<tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
      <div style="color:#64748b;font-size:12px;font-weight:600;">🕐 CONCENTRACIÓN</div>
      <div style="color:#c2410c;font-size:16px;font-weight:700;margin-top:2px;">${concentracion}h</div>
    </td></tr>` : ""}
    <tr><td style="padding:14px 16px;">
      <div style="color:#64748b;font-size:12px;font-weight:600;">📍 UBICACIÓN</div>
      <div style="color:#0f172a;font-size:15px;font-weight:600;margin-top:2px;">${callup.ubicacion}</div>
      ${mapsLink ? `<a href="${mapsLink}" style="display:inline-block;margin-top:8px;color:#2563eb;font-size:13px;font-weight:600;text-decoration:none;">🗺️ Ver en Google Maps →</a>` : ""}
    </td></tr>
  </table>
</td></tr>

${descripcion ? `<!-- Instrucciones -->
<tr><td style="padding:0 24px 16px;">
  <div style="background:#eff6ff;border-radius:10px;padding:12px 16px;border-left:4px solid #3b82f6;">
    <div style="color:#1e40af;font-size:12px;font-weight:700;margin-bottom:4px;">📋 INSTRUCCIONES</div>
    <div style="color:#1e3a5f;font-size:14px;line-height:1.5;">${descripcion.replace(/\n/g, "<br>")}</div>
  </div>
</td></tr>` : ""}

<!-- BOTÓN CTA -->
<tr><td style="padding:8px 24px 24px;text-align:center;">
  <a href="${appUrl}" style="display:block;background:linear-gradient(135deg,#16a34a,#15803d);color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;padding:18px 24px;border-radius:14px;text-align:center;letter-spacing:0.3px;">
    ✅ CONFIRMAR ASISTENCIA
  </a>
  <div style="color:#64748b;font-size:12px;margin-top:10px;">Pulsa para abrir la app y confirmar</div>
</td></tr>

<!-- Entrenador -->
<tr><td style="padding:0 24px 20px;">
  <div style="background:#f0fdf4;border-radius:10px;padding:12px 16px;text-align:center;border:1px solid #bbf7d0;">
    <div style="color:#166534;font-size:13px;">Entrenador: <strong>${callup.entrenador_nombre}</strong></div>
    ${telefono ? `<div style="color:#15803d;font-size:13px;margin-top:4px;">📞 ${telefono}</div>` : ""}
  </div>
</td></tr>

<!-- Footer -->
<tr><td style="background:#1e293b;padding:20px 24px;text-align:center;">
  <div style="color:#94a3b8;font-size:12px;line-height:1.6;">
    <strong style="color:#f8fafc;">CD Bustarviejo</strong><br>
    <a href="mailto:cdbustarviejo@gmail.com" style="color:#fb923c;text-decoration:none;">cdbustarviejo@gmail.com</a>
  </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}