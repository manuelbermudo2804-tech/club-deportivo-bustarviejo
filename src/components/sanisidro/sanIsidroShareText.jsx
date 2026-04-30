// Generadores de texto para compartir listas de San Isidro por WhatsApp.
// Se usa el mismo formato en el botón de compartir y en la copia al portapapeles.

import { TURNOS, getTurno } from "./turnosConfig";

const fechaCorta = (d) => {
  try {
    return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
};

// === INSCRIPCIONES A LOS TORNEOS ===
export function buildInscripcionesText(registrations) {
  if (!registrations || registrations.length === 0) {
    return "📋 *INSCRIPCIONES SAN ISIDRO 2026*\n\n_Aún no hay inscripciones._";
  }

  const grupos = {};
  registrations.forEach(r => {
    const key = r.modalidad || "Sin modalidad";
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(r);
  });

  const lines = [];
  lines.push("🎉 *INSCRIPCIONES SAN ISIDRO 2026*");
  lines.push(`📅 ${new Date().toLocaleDateString("es-ES")} • CD Bustarviejo`);
  lines.push(`📊 Total: *${registrations.length}* inscripciones`);
  lines.push("");

  Object.keys(grupos).sort().forEach(modalidad => {
    const items = grupos[modalidad];
    const isChapa = modalidad.startsWith("Fútbol Chapa");
    lines.push(`${isChapa ? "🏆" : "⚽"} *${modalidad}* (${items.length})`);
    lines.push("─────────────────");
    items.forEach((r, idx) => {
      if (isChapa) {
        lines.push(`${idx + 1}. ${r.jugador_nombre || r.nombre_responsable}`);
        lines.push(`   📞 ${r.telefono_responsable}`);
      } else {
        lines.push(`${idx + 1}. *${r.nombre_equipo || "Equipo"}*`);
        const jugadores = [r.jugador_1, r.jugador_2, r.jugador_3].filter(Boolean);
        jugadores.forEach((j, i) => lines.push(`   • J${i + 1}: ${j}`));
        lines.push(`   📞 ${r.telefono_responsable} (${r.nombre_responsable})`);
      }
      lines.push("");
    });
  });

  lines.push("_Generado desde la app del CD Bustarviejo_");
  return lines.join("\n");
}

// === VOLUNTARIOS ===
export function buildVoluntariosText(voluntarios) {
  if (!voluntarios || voluntarios.length === 0) {
    return "💖 *VOLUNTARIOS SAN ISIDRO 2026*\n\n_Aún no hay voluntarios apuntados._";
  }

  // Agrupar por turno
  const porTurno = {};
  TURNOS.forEach(t => { porTurno[t.id] = []; });
  const sinTurno = [];

  voluntarios.forEach(v => {
    if (v.estado === "descartado") return;
    if (v.turno && porTurno[v.turno]) {
      porTurno[v.turno].push(v);
    } else {
      sinTurno.push(v);
    }
  });

  const totalActivos = TURNOS.reduce((s, t) => s + porTurno[t.id].length, 0) + sinTurno.length;

  const lines = [];
  lines.push("💖 *VOLUNTARIOS SAN ISIDRO 2026*");
  lines.push(`📅 ${new Date().toLocaleDateString("es-ES")} • CD Bustarviejo`);
  lines.push(`👥 Total apuntados: *${totalActivos}*`);
  lines.push("");

  TURNOS.forEach(t => {
    const list = porTurno[t.id];
    const completo = t.forzarCompleto || list.length >= t.plazas;
    const lock = completo ? " 🔒 COMPLETO" : "";
    lines.push(`${t.emoji} *${t.label} (${t.horario})* — ${list.length}/${t.plazas}${lock}`);
    lines.push("─────────────────");
    if (list.length === 0) {
      lines.push("_(sin voluntarios)_");
    } else {
      list.forEach((v, idx) => {
        const estadoEmoji = v.estado === "confirmado" ? "✅" : v.estado === "contactado" ? "📞" : v.estado === "descartado" ? "❌" : "⚠️";
        lines.push(`${idx + 1}. ${estadoEmoji} ${v.nombre}`);
        lines.push(`   📞 ${v.telefono}`);
        if (v.notas) lines.push(`   📝 ${v.notas}`);
      });
    }
    lines.push("");
  });

  if (sinTurno.length > 0) {
    lines.push(`❓ *Sin turno asignado* (${sinTurno.length})`);
    lines.push("─────────────────");
    sinTurno.forEach((v, idx) => {
      lines.push(`${idx + 1}. ${v.nombre} — 📞 ${v.telefono}`);
    });
    lines.push("");
  }

  lines.push("Leyenda: ⚠️ pendiente · 📞 contactado · ✅ confirmado");
  lines.push("");
  lines.push("_Generado desde la app del CD Bustarviejo_");
  return lines.join("\n");
}