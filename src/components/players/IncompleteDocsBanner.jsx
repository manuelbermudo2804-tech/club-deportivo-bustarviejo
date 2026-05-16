import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AlertTriangle, ChevronRight } from "lucide-react";

/**
 * Banner que avisa a las familias de documentos incompletos en las fichas de sus jugadores.
 * Se OCULTA automáticamente en cuanto suben lo que falta (recalcula desde los campos del Player).
 *
 * Reglas (mismas que la validación del wizard):
 * - Foto obligatoria siempre.
 * - Si tiene DNI:
 *     · Cara delantera obligatoria si edad >= 14.
 *     · Cara trasera obligatoria SIEMPRE que haya cara delantera.
 * - Si es menor y no tiene DNI: Libro de Familia obligatorio.
 * - Para menores: datos del tutor (nombre, DNI, foto del DNI delantera y trasera).
 */
const calcularEdad = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNac);
  if (isNaN(nacimiento.getTime())) return null;
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

function getMissingDocs(player) {
  const missing = [];
  const edad = calcularEdad(player.fecha_nacimiento);
  const esMayor = edad !== null && edad >= 18;
  const requiereDNI = edad !== null && edad >= 14;
  const tipoDoc = player.tipo_documento || "DNI";

  // Foto
  if (!player.foto_url) missing.push("Foto del jugador");

  // Documento del jugador
  if (requiereDNI && !player.dni_jugador_url) {
    missing.push(tipoDoc === "Pasaporte" ? "Pasaporte (escaneo)" : "DNI (cara delantera)");
  }
  if (tipoDoc === "DNI" && player.dni_jugador_url && !player.dni_jugador_trasero_url) {
    missing.push("DNI (cara trasera)");
  }
  // Menor sin DNI: libro de familia
  if (!requiereDNI && !player.dni_jugador_url && !player.libro_familia_url) {
    missing.push("Libro de Familia");
  }

  // Datos del tutor (solo menores)
  if (!esMayor) {
    if (!player.nombre_tutor_legal?.trim()) missing.push("Nombre del tutor");
    if (!player.dni_tutor_legal?.trim()) missing.push("DNI del tutor (número)");
    if (!player.dni_tutor_legal_url) missing.push("DNI del tutor (cara delantera)");
    const tipoDocTutor = player.tipo_documento_tutor || "DNI";
    if (tipoDocTutor === "DNI" && player.dni_tutor_legal_url && !player.dni_tutor_legal_trasero_url) {
      missing.push("DNI del tutor (cara trasera)");
    }
  }

  return missing;
}

export default function IncompleteDocsBanner({ players = [] }) {
  const playersWithMissing = useMemo(() => {
    return players
      .filter(p => p.activo !== false)
      .map(p => ({ player: p, missing: getMissingDocs(p) }))
      .filter(x => x.missing.length > 0);
  }, [players]);

  if (playersWithMissing.length === 0) return null;

  return (
    <Link to={createPageUrl("ParentPlayers")} className="block">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-4 shadow-lg border-2 border-amber-400 transition-all hover:scale-[1.01] active:scale-95">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm lg:text-base">
              📄 Documentos incompletos
            </p>
            <p className="text-white/90 text-xs lg:text-sm mt-0.5">
              Completa la documentación de {playersWithMissing.length === 1 ? "tu jugador" : "tus jugadores"} para que el club pueda tramitar la ficha federativa.
            </p>
            <div className="mt-2 space-y-1">
              {playersWithMissing.slice(0, 3).map(({ player, missing }) => (
                <div key={player.id} className="bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
                  <p className="text-white font-semibold text-xs">{player.nombre}</p>
                  <p className="text-white/90 text-[11px] leading-tight">
                    Falta: {missing.slice(0, 3).join(", ")}{missing.length > 3 ? "…" : ""}
                  </p>
                </div>
              ))}
              {playersWithMissing.length > 3 && (
                <p className="text-white/80 text-[11px] italic">
                  y {playersWithMissing.length - 3} jugador(es) más…
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white flex-shrink-0 mt-1" />
        </div>
      </div>
    </Link>
  );
}