import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function InjuryReportDialog({ open, onOpenChange, player }) {
  const [motivo, setMotivo] = useState("");
  const [fechaVuelta, setFechaVuelta] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!motivo.trim()) {
      toast.error("Describe brevemente la lesión");
      return;
    }

    setSaving(true);
    try {
      // 1. Marcar jugador como lesionado
      await base44.entities.Player.update(player.id, {
        lesionado: true,
        motivo_indisponibilidad: motivo.trim(),
        fecha_disponibilidad: fechaVuelta || null
      });

      // 2. Notificar al entrenador de la categoría por email
      const categoria = player.categoria_principal || player.deporte;
      try {
        // Buscar entrenadores de esa categoría
        const users = await base44.entities.User.list();
        const coaches = users.filter(u =>
          u.es_entrenador &&
          (u.categorias_asignadas || []).some(c => c === categoria)
        );

        const user = await base44.auth.me();
        const fechaTexto = fechaVuelta
          ? new Date(fechaVuelta).toLocaleDateString("es-ES", { day: "numeric", month: "long" })
          : "sin fecha estimada";

        for (const coach of coaches) {
          if (coach.email) {
            await base44.integrations.Core.SendEmail({
              to: coach.email,
              subject: `🏥 Lesión reportada: ${player.nombre}`,
              body: `Hola ${coach.full_name || "entrenador"},\n\n` +
                `El padre/tutor de ${player.nombre} (${categoria}) ha reportado una lesión:\n\n` +
                `📋 Motivo: ${motivo}\n` +
                `📅 Vuelta estimada: ${fechaTexto}\n` +
                `👤 Reportado por: ${user?.full_name || user?.email || "familia"}\n\n` +
                `El jugador aparecerá como NO DISPONIBLE en las convocatorias hasta que se marque como recuperado.\n\n` +
                `— CD Bustarviejo`
            });
          }
        }

        // También notificar al admin
        await base44.integrations.Core.SendEmail({
          to: "cdbustarviejo@gmail.com",
          subject: `🏥 Lesión reportada: ${player.nombre} (${categoria})`,
          body: `Lesión reportada por la familia.\n\nJugador: ${player.nombre}\nCategoría: ${categoria}\nMotivo: ${motivo}\nVuelta estimada: ${fechaTexto}\nReportado por: ${user?.full_name || user?.email || "familia"}`
        });
      } catch (emailErr) {
        console.error("Error enviando notificación de lesión:", emailErr);
      }

      queryClient.invalidateQueries({ queryKey: ["myPlayers"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setDone(true);
      toast.success("Lesión reportada. El entrenador ha sido notificado.");
    } catch (err) {
      console.error("Error reportando lesión:", err);
      toast.error("Error al reportar la lesión");
    } finally {
      setSaving(false);
    }
  };

  const handleClearInjury = async () => {
    setSaving(true);
    try {
      await base44.entities.Player.update(player.id, {
        lesionado: false,
        motivo_indisponibilidad: "",
        fecha_disponibilidad: null
      });

      // Notificar al entrenador
      const categoria = player.categoria_principal || player.deporte;
      try {
        const users = await base44.entities.User.list();
        const coaches = users.filter(u =>
          u.es_entrenador &&
          (u.categorias_asignadas || []).some(c => c === categoria)
        );
        for (const coach of coaches) {
          if (coach.email) {
            await base44.integrations.Core.SendEmail({
              to: coach.email,
              subject: `✅ Jugador recuperado: ${player.nombre}`,
              body: `Hola ${coach.full_name || "entrenador"},\n\n${player.nombre} (${categoria}) ha sido marcado como RECUPERADO por su familia.\n\nYa puede ser convocado de nuevo.\n\n— CD Bustarviejo`
            });
          }
        }
      } catch {}

      queryClient.invalidateQueries({ queryKey: ["myPlayers"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("Jugador marcado como recuperado ✅");
      onOpenChange(false);
    } catch (err) {
      toast.error("Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setMotivo("");
    setFechaVuelta("");
    setDone(false);
    onOpenChange(false);
  };

  if (!player) return null;

  // Si ya está lesionado, mostrar opción de recuperar
  if (player.lesionado) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" /> {player.nombre} — Lesionado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800"><strong>Motivo:</strong> {player.motivo_indisponibilidad || "No especificado"}</p>
              {player.fecha_disponibilidad && (
                <p className="text-sm text-red-800 mt-1">
                  <strong>Vuelta estimada:</strong> {new Date(player.fecha_disponibilidad).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            <p className="text-sm text-slate-600">
              El jugador no aparecerá en las convocatorias mientras esté lesionado. ¿Ya se ha recuperado?
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">Cerrar</Button>
              <Button onClick={handleClearInjury} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                Marcar como recuperado
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🏥 Reportar lesión — {player.nombre}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Lesión reportada</h3>
            <p className="text-sm text-slate-600">
              El entrenador de <strong>{player.categoria_principal || player.deporte}</strong> ha sido notificado. El jugador no será convocado hasta que se marque como recuperado.
            </p>
            <Button onClick={handleClose} className="w-full">Entendido</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              ⚠️ Al reportar una lesión, el jugador será <strong>excluido automáticamente</strong> de las convocatorias y el entrenador será notificado.
            </div>

            <div className="space-y-1.5">
              <Label>¿Qué le ha pasado? *</Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Esguince de tobillo en el entrenamiento del martes"
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Fecha estimada de vuelta (opcional)</Label>
              <Input
                type="date"
                value={fechaVuelta}
                onChange={(e) => setFechaVuelta(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-slate-400">Si no lo sabes, déjalo en blanco</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1" disabled={saving}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <AlertTriangle className="w-4 h-4 mr-1" />}
                Reportar lesión
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}