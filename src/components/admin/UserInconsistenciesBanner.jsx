import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronDown, ChevronUp, Wrench } from "lucide-react";

/**
 * Detecta usuarios con datos contradictorios y los muestra agrupados por tipo
 * de problema. El admin puede pulsar "Arreglar" y abrir el diálogo de rol
 * para corregir manualmente, o usar las acciones rápidas de auto-fix.
 */
export default function UserInconsistenciesBanner({ users, players, onAutoFix, onOpenUser }) {
  const [expanded, setExpanded] = useState(false);
  const [fixingType, setFixingType] = useState(null);

  // ===== DETECCIÓN =====
  const buckets = {
    minor_with_family_panel: [],   // es_menor + tipo_panel=familia (contradictorio)
    minor_is_player: [],           // es_menor + es_jugador (contradictorio)
    player_with_family_panel: [],  // es_jugador + tipo_panel=familia
    player_no_link: [],            // es_jugador pero sin player_id
    minor_no_link: [],             // es_menor pero sin jugador_id
    family_no_kids: [],            // tipo_panel=familia, sin hijos en BD y sin tiene_hijos_jugando
    staff_no_role_flag: [],        // tipo_panel=staff pero sin ningún flag (entrenador/coord/tesorero)
  };

  for (const u of users) {
    if (u.eliminado === true) continue;
    if (u.role === "admin") continue;

    if (u.es_menor === true && u.tipo_panel === "familia") buckets.minor_with_family_panel.push(u);
    if (u.es_menor === true && u.es_jugador === true) buckets.minor_is_player.push(u);
    if (u.es_jugador === true && u.tipo_panel === "familia") buckets.player_with_family_panel.push(u);
    if (u.es_jugador === true && !u.player_id && !u.jugador_id) buckets.player_no_link.push(u);
    if (u.es_menor === true) {
      const email = (u.email || "").trim().toLowerCase();
      const hasJuvenilLink = players.some(p => (p.acceso_menor_email || "").trim().toLowerCase() === email);
      if (!hasJuvenilLink && !u.jugador_id) buckets.minor_no_link.push(u);
    }
    if (u.tipo_panel === "staff" && !u.es_entrenador && !u.es_coordinador && !u.es_tesorero) buckets.staff_no_role_flag.push(u);

    if (u.tipo_panel === "familia" && u.tiene_hijos_jugando !== true) {
      const email = (u.email || "").trim().toLowerCase();
      const hasAnyPlayer = players.some(p =>
        p.activo === true && (
          (p.email_padre || "").trim().toLowerCase() === email ||
          (p.email_tutor_2 || "").trim().toLowerCase() === email
        )
      );
      if (!hasAnyPlayer) buckets.family_no_kids.push(u);
    }
  }

  const total = Object.values(buckets).reduce((s, arr) => s + arr.length, 0);
  if (total === 0) return null;

  const sections = [
    { key: "minor_with_family_panel", title: "🧒 Menores con panel de FAMILIA", color: "red",
      desc: "Son menores pero el panel es de padres. Hay que cambiarles tipo_panel a 'jugador_menor'.",
      fix: { tipo_panel: "jugador_menor" }, fixLabel: "Cambiar a panel juvenil" },
    { key: "minor_is_player", title: "🧒⚽ Menores marcados también como JUGADOR adulto", color: "red",
      desc: "No pueden ser ambos. Si son menores de edad, quitar es_jugador.",
      fix: { es_jugador: false }, fixLabel: "Quitar es_jugador" },
    { key: "player_with_family_panel", title: "⚽ Jugadores +18 con panel de FAMILIA", color: "orange",
      desc: "Tienen es_jugador=true pero ven el panel de padres. Cambiar a panel 'jugador_adulto'.",
      fix: { tipo_panel: "jugador_adulto" }, fixLabel: "Cambiar a panel jugador" },
    { key: "player_no_link", title: "⚽❓ Jugadores sin ficha vinculada", color: "orange",
      desc: "es_jugador=true pero sin player_id. Hay que vincularlos manualmente desde su fila.",
      fix: null, fixLabel: null },
    { key: "minor_no_link", title: "🧒❓ Menores sin acceso juvenil vinculado", color: "orange",
      desc: "Son menores pero ningún jugador tiene su email en 'acceso_menor_email'. Hay que vincularlos desde la ficha del jugador (campo Email del menor) o quitarles es_menor.",
      fix: null, fixLabel: null },
    { key: "family_no_kids", title: "👨‍👩‍👧❓ Padres sin hijos activos en BD", color: "yellow",
      desc: "Tienen panel familia pero ningún jugador les apunta como padre/tutor. Posible visitante o ex-familia.",
      fix: null, fixLabel: null },
    { key: "staff_no_role_flag", title: "👔❓ Staff sin rol concreto", color: "yellow",
      desc: "tipo_panel='staff' pero sin entrenador/coordinador/tesorero. Asignar rol o quitar staff.",
      fix: null, fixLabel: null },
  ];

  const colorMap = {
    red: "bg-red-50 border-red-300 text-red-900",
    orange: "bg-orange-50 border-orange-300 text-orange-900",
    yellow: "bg-yellow-50 border-yellow-300 text-yellow-900",
  };

  const handleAutoFix = async (section) => {
    if (!section.fix || !onAutoFix) return;
    const targets = buckets[section.key];
    if (!window.confirm(`¿Aplicar corrección a ${targets.length} usuario(s)?\n\nCambios: ${JSON.stringify(section.fix)}`)) return;
    setFixingType(section.key);
    try {
      await onAutoFix(targets, section.fix);
    } finally {
      setFixingType(null);
    }
  };

  return (
    <Card className="border-2 border-red-400 bg-gradient-to-br from-red-50 to-orange-50 shadow-md">
      <CardContent className="p-4">
        <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-red-900 text-base">
                ⚠️ {total} inconsistencia{total > 1 ? "s" : ""} detectada{total > 1 ? "s" : ""} en usuarios
              </h3>
              <p className="text-xs text-red-700">Datos contradictorios entre roles y paneles. Toca para revisar.</p>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-red-700" /> : <ChevronDown className="w-5 h-5 text-red-700" />}
        </button>

        {expanded && (
          <div className="mt-4 space-y-3">
            {sections.filter(s => buckets[s.key].length > 0).map(section => {
              const list = buckets[section.key];
              return (
                <div key={section.key} className={`rounded-lg border-2 p-3 ${colorMap[section.color]}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">{section.title}</span>
                        <Badge variant="outline" className="bg-white">{list.length}</Badge>
                      </div>
                      <p className="text-xs mt-1 opacity-90">{section.desc}</p>
                    </div>
                    {section.fix && (
                      <Button size="sm" variant="outline" className="bg-white flex-shrink-0"
                        disabled={fixingType === section.key}
                        onClick={() => handleAutoFix(section)}>
                        <Wrench className="w-3 h-3 mr-1" />
                        {fixingType === section.key ? "Aplicando..." : section.fixLabel}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {list.slice(0, 20).map(u => (
                      <button key={u.id} onClick={() => onOpenUser?.(u)}
                        className="w-full text-left bg-white rounded px-2 py-1 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between gap-2">
                        <span className="truncate">
                          <strong>{u.full_name || "—"}</strong> · <span className="text-slate-500">{u.email}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {u.tipo_panel || "sin panel"}
                        </span>
                      </button>
                    ))}
                    {list.length > 20 && (
                      <p className="text-[10px] text-center opacity-70 pt-1">... y {list.length - 20} más</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}