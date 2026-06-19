// Genera un mensaje de WhatsApp con la lista de inscritos/voluntarios de una
// página del constructor, con sus datos de contacto. Mismo estilo que San Isidro.

const ESTADO_EMOJI = {
  nuevo: "🆕",
  contactado: "📞",
  confirmado: "✅",
  cancelado: "❌",
  pendiente_pago: "⏳",
  lista_espera: "🔔",
};

const PAGO_EMOJI = {
  pagado: "✅",
  pendiente: "⏳",
  fallido: "❌",
  reembolsado: "↩️",
};

export function buildInscritosText(submissions, page) {
  const nombrePagina = (page?.nombre || "Página").toUpperCase();

  if (!submissions || submissions.length === 0) {
    return `📋 *${nombrePagina}*\n\n_Aún no hay inscritos._`;
  }

  const tienePago = !!page?.config?.pago?.activo;

  const lines = [];
  lines.push(`📋 *${nombrePagina}*`);
  lines.push(`📅 ${new Date().toLocaleDateString("es-ES")} • CD Bustarviejo`);
  lines.push(`👥 Total: *${submissions.length}*`);
  lines.push("");
  lines.push("─────────────────");

  submissions.forEach((s, idx) => {
    const estadoEmoji = ESTADO_EMOJI[s.estado] || "•";
    lines.push(`${idx + 1}. ${estadoEmoji} ${s.nombre || "Sin nombre"}`);
    if (s.telefono) lines.push(`   📞 ${s.telefono}`);
    if (s.email) lines.push(`   ✉️ ${s.email}`);
    if (tienePago && s.pago_estado) {
      const pe = PAGO_EMOJI[s.pago_estado] || "";
      const detalle = s.pago_opcion_nombre ? ` ${s.pago_opcion_nombre}` : "";
      const importe = s.pago_importe_total > 0 ? ` · ${s.pago_importe_total.toFixed(2)}€` : "";
      lines.push(`   💳 ${pe}${detalle}${importe}`);
    }
    lines.push("");
  });

  lines.push("_Generado desde la app del CD Bustarviejo_");
  return lines.join("\n");
}