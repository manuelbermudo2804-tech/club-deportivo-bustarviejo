import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, AlertTriangle, ChevronRight } from "lucide-react";

export const KIND_STYLES = {
  entrenamiento: { label: "Entrenamiento", dot: "bg-green-500", chip: "bg-green-100 text-green-800", bar: "bg-green-500" },
  convocatoria: { label: "Convocatoria", dot: "bg-blue-500", chip: "bg-blue-100 text-blue-800", bar: "bg-blue-500" },
  partido: { label: "Partido de liga", dot: "bg-indigo-500", chip: "bg-indigo-100 text-indigo-800", bar: "bg-indigo-500" },
  evento: { label: "Evento del club", dot: "bg-orange-500", chip: "bg-orange-100 text-orange-800", bar: "bg-orange-500" },
};

export default function AgendaItemCard({ item }) {
  const style = KIND_STYLES[item.kind] || KIND_STYLES.evento;

  return (
    <div className={`relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${item.cancelado ? "opacity-60" : ""}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.bar}`} />
      <div className="pl-5 pr-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge className={`${style.chip} border-0 text-xs`}>{style.label}</Badge>
              {item.categoria && <span className="text-xs text-slate-500 truncate">{item.categoria}</span>}
              {item.localVisitante && (
                <span className="text-xs text-slate-500">
                  {item.localVisitante === "Local" ? "🏠 En casa" : "✈️ Fuera"}
                </span>
              )}
            </div>

            <p className={`font-bold text-slate-900 ${item.cancelado ? "line-through" : ""}`}>{item.titulo}</p>

            <div className="mt-1.5 space-y-1 text-sm text-slate-600">
              {item.hora && (
                <p className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {item.hora}
                  {item.horaFin ? ` – ${item.horaFin}` : ""}
                  {item.concentracion && (
                    <span className="text-amber-700 font-medium">· concentración {item.concentracion}</span>
                  )}
                </p>
              )}
              {item.ubicacion && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {item.mapsUrl ? (
                    <a
                      href={item.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-700 hover:underline"
                    >
                      {item.ubicacion}
                    </a>
                  ) : (
                    item.ubicacion
                  )}
                </p>
              )}
              {item.misJugadores?.length > 0 && (
                <p className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {item.misJugadores.join(", ")}
                </p>
              )}
            </div>

            {item.cancelado && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-red-700 bg-red-50 rounded-lg px-2 py-1.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{item.motivoCancelacion || "Cancelado"}</span>
              </p>
            )}

            {!item.cancelado && item.sinResponder > 0 && (
              <Link
                to="/ParentCallups"
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-800 bg-amber-100 rounded-lg px-2.5 py-1.5 hover:bg-amber-200"
              >
                Falta confirmar ({item.sinResponder})
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {item.importante && <span className="text-lg" title="Destacado">⭐</span>}
        </div>
      </div>
    </div>
  );
}