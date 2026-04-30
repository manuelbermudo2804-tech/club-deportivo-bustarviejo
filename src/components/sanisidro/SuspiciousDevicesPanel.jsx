import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Ban, ShieldCheck, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Agrupa inscripciones+voluntarios por device_fingerprint y permite bloquear dispositivos sospechosos
export default function SuspiciousDevicesPanel({ registrations = [], voluntarios = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const queryClient = useQueryClient();

  const { data: blocked = [] } = useQuery({
    queryKey: ["sanIsidroBlockedDevices"],
    queryFn: () => base44.entities.SanIsidroBlockedDevice.list("-created_date", 200),
  });

  const blockedSet = useMemo(() => new Set(blocked.map(b => b.device_fingerprint)), [blocked]);

  const devices = useMemo(() => {
    const map = new Map();
    const add = (item, type) => {
      const fp = item.device_fingerprint;
      if (!fp) return;
      if (!map.has(fp)) {
        map.set(fp, { fp, user_agent: item.user_agent || "?", inscripciones: [], voluntarios: [] });
      }
      map.get(fp)[type].push(item);
    };
    registrations.forEach(r => add(r, "inscripciones"));
    voluntarios.forEach(v => add(v, "voluntarios"));

    return Array.from(map.values())
      .map(d => ({ ...d, total: d.inscripciones.length + d.voluntarios.length }))
      .sort((a, b) => b.total - a.total);
  }, [registrations, voluntarios]);

  const suspicious = devices.filter(d => d.total >= 2 || blockedSet.has(d.fp));

  const handleBlock = async (fp) => {
    if (!window.confirm("¿Bloquear este dispositivo? No podrá hacer más inscripciones ni apuntarse como voluntario.")) return;
    setBusyId(fp);
    try {
      await base44.entities.SanIsidroBlockedDevice.create({
        device_fingerprint: fp,
        motivo: "Bloqueado manualmente desde panel admin",
      });
      toast.success("Dispositivo bloqueado");
      queryClient.invalidateQueries({ queryKey: ["sanIsidroBlockedDevices"] });
    } catch {
      toast.error("No se pudo bloquear");
    }
    setBusyId(null);
  };

  const handleUnblock = async (fp) => {
    const item = blocked.find(b => b.device_fingerprint === fp);
    if (!item) return;
    setBusyId(fp);
    try {
      await base44.entities.SanIsidroBlockedDevice.delete(item.id);
      toast.success("Dispositivo desbloqueado");
      queryClient.invalidateQueries({ queryKey: ["sanIsidroBlockedDevices"] });
    } catch {
      toast.error("No se pudo desbloquear");
    }
    setBusyId(null);
  };

  if (devices.length === 0) return null;

  return (
    <Card className="border-slate-200">
      <CardContent className="p-3 space-y-2">
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between text-sm font-bold text-slate-700"
        >
          <span className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Dispositivos
            <Badge variant="outline">{devices.length}</Badge>
            {suspicious.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                {suspicious.length} sospechoso{suspicious.length !== 1 ? "s" : ""}
              </Badge>
            )}
            {blocked.length > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-300">
                {blocked.length} bloqueado{blocked.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] text-slate-500">
              Cada dispositivo es un móvil/ordenador que ha hecho al menos una inscripción. Si ves muchas inscripciones desde el mismo dispositivo y son sospechosas, púlsalo para bloquear.
            </p>
            {devices.map(d => {
              const isBlocked = blockedSet.has(d.fp);
              const isSuspicious = d.total >= 3;
              return (
                <div
                  key={d.fp}
                  className={`p-2 rounded-lg border text-xs ${
                    isBlocked ? "border-red-300 bg-red-50" :
                    isSuspicious ? "border-amber-300 bg-amber-50" :
                    "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">
                        {isBlocked && "🚫 "}
                        {d.user_agent}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{d.fp}</p>
                      <p className="text-slate-600 mt-1">
                        {d.inscripciones.length > 0 && (
                          <span>📝 {d.inscripciones.length} inscrip. </span>
                        )}
                        {d.voluntarios.length > 0 && (
                          <span>💖 {d.voluntarios.length} volunt.</span>
                        )}
                      </p>
                      {(isSuspicious || isBlocked) && d.inscripciones.length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-slate-500 text-[10px]">Ver inscripciones</summary>
                          <ul className="mt-1 space-y-0.5 text-[10px] text-slate-600">
                            {d.inscripciones.map(i => (
                              <li key={i.id}>• {i.modalidad}: {i.nombre_responsable || i.nombre_equipo}</li>
                            ))}
                            {d.voluntarios.map(v => (
                              <li key={v.id}>• Voluntario: {v.nombre} ({v.turno})</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                    {isBlocked ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] gap-1 shrink-0"
                        disabled={busyId === d.fp}
                        onClick={() => handleUnblock(d.fp)}
                      >
                        {busyId === d.fp ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                        Desbloquear
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-[10px] gap-1 shrink-0"
                        disabled={busyId === d.fp}
                        onClick={() => handleBlock(d.fp)}
                      >
                        {busyId === d.fp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                        Bloquear
                      </Button>
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