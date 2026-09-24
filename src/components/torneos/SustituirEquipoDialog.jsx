import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import EscudoUploadButton from "./EscudoUploadButton";

// Sustituye un equipo por otro: el nuevo hereda su plaza (partidos, horarios, campos, grupo)
// y el antiguo desaparece (nombre, escudo, plantilla y goles).
export default function SustituirEquipoDialog({ equipo, onClose, onDone }) {
  const [nombre, setNombre] = useState("");
  const [club, setClub] = useState("");
  const [escudo, setEscudo] = useState("");
  const [resetResultados, setResetResultados] = useState(true);
  const [partidos, setPartidos] = useState(null);

  useEffect(() => {
    if (!equipo) return;
    setNombre(""); setClub(""); setEscudo(""); setResetResultados(true); setPartidos(null);
    base44.entities.TorneoPartido.filter({ categoria_id: equipo.categoria_id }).then((ps) =>
      setPartidos(ps.filter((p) => p.equipo_local_id === equipo.id || p.equipo_visitante_id === equipo.id)));
  }, [equipo]);

  const jugados = (partidos || []).filter((p) => p.finalizado);

  const sustituir = useMutation({
    mutationFn: async () => {
      const [jugadores, goles] = await Promise.all([
        base44.entities.TorneoJugador.filter({ equipo_id: equipo.id }),
        base44.entities.TorneoGol.filter({ equipo_id: equipo.id }),
      ]);
      await Promise.all([
        ...jugadores.map((j) => base44.entities.TorneoJugador.delete(j.id)),
        ...goles.map((g) => base44.entities.TorneoGol.delete(g.id)),
      ]);
      if (resetResultados && jugados.length > 0) {
        await base44.entities.TorneoPartido.bulkUpdate(jugados.map((p) => ({
          id: p.id, marcador_local: null, marcador_visitante: null, ganador_id: "", finalizado: false,
        })));
      }
      await base44.entities.TorneoEquipo.update(equipo.id, { nombre: nombre.trim(), club: club.trim(), escudo_url: escudo });
    },
    onSuccess: () => { toast.success(`${equipo.nombre} sustituido por ${nombre.trim()}`); onDone(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={!!equipo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>🔄 Sustituir a {equipo?.nombre}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <EscudoUploadButton value={escudo} onChange={setEscudo} />
            <Input placeholder="Nombre del equipo nuevo" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
          </div>
          <Input placeholder="Club (opcional)" value={club} onChange={(e) => setClub(e.target.value)} />
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
            {partidos === null ? <p>Cargando partidos…</p> : (
              <p>El equipo nuevo hereda <b>{partidos.length} partidos</b> con sus mismos horarios, campos y grupo.</p>
            )}
            <p><b>{equipo?.nombre}</b> desaparecerá del torneo junto con su escudo, plantilla y goles.</p>
          </div>
          {jugados.length > 0 && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={resetResultados} onCheckedChange={(v) => setResetResultados(!!v)} className="mt-0.5" />
              <span>Borrar los {jugados.length} resultados ya jugados por {equipo?.nombre} y dejarlos pendientes</span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => sustituir.mutate()} disabled={!nombre.trim() || partidos === null || sustituir.isPending}>
            {sustituir.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Sustituir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}