import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Clock, MapPin, Goal } from "lucide-react";
import { format } from "date-fns";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Construye las opciones de campo a partir de las sedes del torneo.
// Devuelve [{ value: "sedeNombre|||campo", sede_nombre, campo, label }]
function opcionesCampo(torneo) {
  const opts = [];
  (torneo?.sedes || []).forEach((sede) => {
    const campos = sede.campos && sede.campos.length > 0 ? sede.campos : [""];
    campos.forEach((campo) => {
      opts.push({
        value: `${sede.nombre}|||${campo}`,
        sede_nombre: sede.nombre,
        campo,
        label: campo ? `${sede.nombre} · ${campo}` : sede.nombre,
      });
    });
  });
  return opts;
}

// La "pantalla soñada": Campo / Hora / Local [x] Visitante [y] [Guardar]
export default function PartidoResultRow({ partido, equipos, onSave, onSaveUbicacion, isSaving, torneo, onGoleadores, golesCount = 0 }) {
  const eqLocal = equipos.find((e) => e.id === partido.equipo_local_id);
  const eqVisit = equipos.find((e) => e.id === partido.equipo_visitante_id);
  const nombreLocal = eqLocal?.nombre || partido.equipo_local_placeholder || "Por decidir";
  const nombreVisit = eqVisit?.nombre || partido.equipo_visitante_placeholder || "Por decidir";

  const [local, setLocal] = useState(partido.marcador_local ?? "");
  const [visit, setVisit] = useState(partido.marcador_visitante ?? "");

  useEffect(() => {
    setLocal(partido.marcador_local ?? "");
    setVisit(partido.marcador_visitante ?? "");
  }, [partido.marcador_local, partido.marcador_visitante]);

  const puedeGuardar = eqLocal && eqVisit && local !== "" && visit !== "";
  const cambiado = String(local) !== String(partido.marcador_local ?? "") || String(visit) !== String(partido.marcador_visitante ?? "");

  const campos = opcionesCampo(torneo);
  const campoActual = partido.sede_nombre ? `${partido.sede_nombre}|||${partido.campo || ""}` : "";

  const handleCampo = (value) => {
    if (!onSaveUbicacion) return;
    if (value === "none") {
      onSaveUbicacion(partido, { sede_nombre: "", campo: "" });
      return;
    }
    const [sede_nombre, campo] = value.split("|||");
    onSaveUbicacion(partido, { sede_nombre, campo });
  };

  const handleHora = (e) => {
    if (!onSaveUbicacion) return;
    onSaveUbicacion(partido, { fecha_hora: e.target.value ? new Date(e.target.value).toISOString() : "" });
  };

  // Valor para el input datetime-local (formato yyyy-MM-ddTHH:mm)
  const horaInputValue = partido.fecha_hora
    ? format(new Date(partido.fecha_hora), "yyyy-MM-dd'T'HH:mm")
    : "";

  const escudoL = eqLocal?.escudo_url;
  const escudoV = eqVisit?.escudo_url;

  return (
    <div className={`bg-white rounded-lg border p-2.5 ${partido.finalizado ? "border-green-200" : ""}`}>
      {/* Fila superior: campo + hora (editables si onSaveUbicacion) */}
      {onSaveUbicacion ? (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {campos.length > 0 ? (
            <Select value={campoActual || "none"} onValueChange={handleCampo}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-[130px] gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <SelectValue placeholder="Campo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin campo</SelectItem>
                {campos.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-[11px] text-amber-600 inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Añade sedes en Ajustes del torneo para asignar campo
            </span>
          )}
          <Input
            type="datetime-local"
            value={horaInputValue}
            onChange={handleHora}
            className="h-7 text-xs w-auto"
          />
          {partido.finalizado && <span className="text-green-600 ml-auto inline-flex items-center gap-0.5 text-[11px]"><Check className="w-3 h-3" /> Final</span>}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1.5">
          {(partido.sede_nombre || partido.campo) && (
            <span className="bg-slate-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />{[partido.sede_nombre, partido.campo].filter(Boolean).join(" · ")}
            </span>
          )}
          {partido.fecha_hora && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(partido.fecha_hora), "dd/MM HH:mm")}
            </span>
          )}
          {partido.finalizado && <span className="text-green-600 ml-auto inline-flex items-center gap-0.5"><Check className="w-3 h-3" /> Final</span>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="flex-1 flex items-center justify-end gap-1.5 text-sm font-medium truncate">
          <span className="truncate">{nombreLocal}</span>
          {escudoL && <img src={escudoL} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />}
        </span>
        <Input
          type="number"
          className="w-12 text-center px-1"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          disabled={!eqLocal || !eqVisit}
        />
        <span className="text-slate-300">-</span>
        <Input
          type="number"
          className="w-12 text-center px-1"
          value={visit}
          onChange={(e) => setVisit(e.target.value)}
          disabled={!eqLocal || !eqVisit}
        />
        <span className="flex-1 flex items-center gap-1.5 text-sm font-medium truncate">
          {escudoV && <img src={escudoV} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />}
          <span className="truncate">{nombreVisit}</span>
        </span>
        <Button
          size="sm"
          className="h-8"
          disabled={!puedeGuardar || !cambiado || isSaving}
          onClick={() => onSave(partido, Number(local), Number(visit))}
        >
          Guardar
        </Button>
      </div>

      {onGoleadores && partido.finalizado && (
        <div className="mt-2 pt-2 border-t flex items-center justify-between">
          <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
            <Goal className="w-3 h-3" /> {golesCount > 0 ? `${golesCount} gol${golesCount > 1 ? "es" : ""} registrado${golesCount > 1 ? "s" : ""}` : "Sin goleadores"}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onGoleadores(partido)}>
            <Goal className="w-3 h-3 mr-1" /> Goleadores
          </Button>
        </div>
      )}
    </div>
  );
}