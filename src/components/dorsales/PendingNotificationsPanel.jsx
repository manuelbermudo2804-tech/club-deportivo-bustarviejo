import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageCircle, CheckCircle2 } from "lucide-react";

// Panel con todas las asignaciones de la temporada/categoría seleccionada
// agrupadas por estado de aviso a la familia.
export default function PendingNotificationsPanel({ assignments = [], categoria, onOpenAssignment }) {
  const [filter, setFilter] = useState("pendientes"); // pendientes | avisados | todos

  const enCategoria = useMemo(
    () => assignments.filter((a) => a.categoria === categoria && a.estado === "asignado"),
    [assignments, categoria]
  );

  const pendientes = enCategoria.filter((a) => !a.email_enviado && !a.whatsapp_enviado);
  const avisados = enCategoria.filter((a) => a.email_enviado || a.whatsapp_enviado);

  const lista = filter === "pendientes" ? pendientes : filter === "avisados" ? avisados : enCategoria;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold">Estado de avisos a familias</h3>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("pendientes")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === "pendientes"
                ? "bg-orange-100 border-orange-400 text-orange-800"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            🟠 Sin avisar ({pendientes.length})
          </button>
          <button
            onClick={() => setFilter("avisados")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === "avisados"
                ? "bg-green-100 border-green-400 text-green-800"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            🟢 Avisados ({avisados.length})
          </button>
          <button
            onClick={() => setFilter("todos")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === "todos"
                ? "bg-slate-200 border-slate-400 text-slate-800"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Todos ({enCategoria.length})
          </button>
        </div>

        {lista.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-6">
            {filter === "pendientes"
              ? "🎉 ¡Todas las familias han sido avisadas en esta categoría!"
              : filter === "avisados"
              ? "Aún no has avisado a nadie en esta categoría."
              : "No hay asignaciones en esta categoría."}
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {lista
              .sort((a, b) => Number(a.dorsal) - Number(b.dorsal))
              .map((a) => {
                const avisado = a.email_enviado || a.whatsapp_enviado;
                return (
                  <button
                    key={a.id}
                    onClick={() => onOpenAssignment?.(a)}
                    className="w-full flex items-center gap-3 p-2 bg-slate-50 hover:bg-orange-50 rounded-lg text-left transition-colors"
                  >
                    <div className="text-xl font-black text-orange-600 w-10 text-center">#{a.dorsal}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{a.jugador_nombre}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {a.email_enviado ? (
                          <Badge variant="outline" className="text-[10px] gap-1 border-green-300 text-green-700">
                            <Mail className="w-3 h-3" /> Email
                          </Badge>
                        ) : null}
                        {a.whatsapp_enviado ? (
                          <Badge variant="outline" className="text-[10px] gap-1 border-green-300 text-green-700">
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </Badge>
                        ) : null}
                        {!avisado && (
                          <Badge className="text-[10px] bg-orange-100 text-orange-800 border-orange-300">
                            Sin avisar
                          </Badge>
                        )}
                      </div>
                    </div>
                    {avisado ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Bell className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}