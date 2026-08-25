import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AVISO_PRACTICAS } from "@/components/practicas/permisosPracticas";

const ESTADOS = [
  { key: "presente", icon: CheckCircle2, label: "Presente", on: "bg-green-100 text-green-700" },
  { key: "tardanza", icon: Clock, label: "Tarde", on: "bg-orange-100 text-orange-700" },
  { key: "ausente", icon: XCircle, label: "Ausente", on: "bg-red-100 text-red-700" },
];

export default function MinorCoachAttendance() {
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [estados, setEstados] = useState({});
  const [sinGuardar, setSinGuardar] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["minorCoachAttendance", fecha],
    queryFn: async () => {
      const res = await base44.functions.invoke("minorCoachTeam", { action: "getAttendance", fecha });
      return res.data;
    },
    retry: false,
  });

  useEffect(() => {
    const map = {};
    (data?.sesion?.asistencias || []).forEach((a) => { map[a.jugador_id] = a.estado; });
    setEstados(map);
    setSinGuardar(false);
  }, [data]);

  const guardar = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("minorCoachTeam", { action: "saveAttendance", fecha, estados });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minorCoachAttendance"] });
      setSinGuardar(false);
      toast.success("✅ Lista guardada");
    },
    onError: () => toast.error("No se pudo guardar la lista"),
  });

  if (error) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6 text-center">
            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-semibold">No tienes acceso a pasar lista</p>
            <p className="text-sm text-slate-500 mt-1">Habla con tu entrenador o con el club.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roster = data?.roster || [];
  const cuenta = (k) => roster.filter((p) => estados[p.id] === k).length;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-3 pb-24">
      <div>
        <h1 className="text-xl font-black text-slate-900">✅ Pasar lista</h1>
        <p className="text-sm text-slate-500">{data?.categoria || "Tu equipo"}</p>
      </div>
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">{AVISO_PRACTICAS}</p>

      <input
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
      />

      <div className="flex gap-2">
        {ESTADOS.map((e) => (
          <Badge key={e.key} className={`${e.on} border-none text-xs`}>{e.label}: {cuenta(e.key)}</Badge>
        ))}
      </div>

      {isLoading && <p className="text-sm text-slate-400">Cargando equipo…</p>}

      {!isLoading && roster.length === 0 && (
        <Card className="border-none shadow-lg">
          <CardContent className="p-6 text-center text-sm text-slate-500">
            No hay jugadores en este equipo.
          </CardContent>
        </Card>
      )}

      {roster.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardContent className="p-3 space-y-2">
            {roster.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  {p.foto_url ? (
                    <img src={p.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs">⚽</div>
                  )}
                  <span className="text-sm font-medium text-slate-800 truncate">{p.nombre}</span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {ESTADOS.map((e) => {
                    const Icon = e.icon;
                    const sel = estados[p.id] === e.key;
                    return (
                      <button
                        key={e.key}
                        title={e.label}
                        onClick={() => { setEstados((prev) => ({ ...prev, [p.id]: e.key })); setSinGuardar(true); }}
                        className={`p-2 rounded-lg ${sel ? e.on : "bg-white text-slate-400"}`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {roster.length > 0 && (
        <Button
          onClick={() => guardar.mutate()}
          disabled={!sinGuardar || guardar.isPending}
          className="w-full h-12 bg-green-600 hover:bg-green-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {guardar.isPending ? "Guardando…" : sinGuardar ? "Guardar lista" : "Guardado"}
        </Button>
      )}
    </div>
  );
}