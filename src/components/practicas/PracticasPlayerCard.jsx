import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERMISOS_PRACTICAS, CATEGORIAS_PRACTICAS } from "./permisosPracticas";

export default function PracticasPlayerCard({ player, onChange, saving }) {
  const p = player.entrenador_practicas || {};
  const activo = p.activo === true;
  const sinEquipo = activo && !p.categoria;

  return (
    <Card className="border-none shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          {player.foto_url ? (
            <img src={player.foto_url} alt={player.nombre} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">⚽</div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{player.nombre}</h3>
            <p className="text-xs text-slate-500 truncate">
              Juega en {player.categoria_principal || player.deporte} · {player.acceso_menor_email}
            </p>
            {activo && p.activado_por && (
              <p className="text-[11px] text-slate-400 mt-1">
                Activado por {p.activado_por}
                {p.fecha_activacion ? ` · ${new Date(p.fecha_activacion).toLocaleDateString("es-ES")}` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <Switch
              checked={activo}
              disabled={saving}
              onCheckedChange={(v) => onChange(player, { activo: v })}
            />
            <Badge className={activo ? "bg-green-600 text-white border-none text-[10px]" : "bg-slate-200 text-slate-600 border-none text-[10px]"}>
              {activo ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </div>

        {activo && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div>
              <p className="text-sm font-bold text-slate-800 mb-1.5">🏟️ Equipo que entrena</p>
              <Select
                value={p.categoria || ""}
                disabled={saving}
                onValueChange={(v) => onChange(player, { categoria: v })}
              >
                <SelectTrigger className={sinEquipo ? "border-red-400 bg-red-50" : ""}>
                  <SelectValue placeholder="Elige el equipo al que entrena" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_PRACTICAS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sinEquipo && (
                <p className="text-xs text-red-600 mt-1">
                  Elige un equipo: sin equipo vinculado no verá nada.
                </p>
              )}
            </div>

            <div className="space-y-2">
              {PERMISOS_PRACTICAS.map((perm) => {
                const bloqueado = sinEquipo || (perm.dependeDe && p[perm.dependeDe] !== true);
                return (
                  <div key={perm.key} className={`flex items-start gap-3 rounded-xl p-3 ${perm.avanzado ? "bg-amber-50" : "bg-slate-50"} ${bloqueado ? "opacity-50" : ""}`}>
                    <span className="text-lg">{perm.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {perm.titulo}
                        {perm.avanzado && <span className="ml-2 text-[10px] font-bold text-amber-700">AVANZADO</span>}
                      </p>
                      <p className="text-xs text-slate-500">{perm.descripcion}</p>
                    </div>
                    <Switch
                      checked={p[perm.key] === true}
                      disabled={saving || bloqueado}
                      onCheckedChange={(v) => onChange(player, { [perm.key]: v })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}