import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Shield, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPageUrl } from "@/utils";

export default function EscalateToCoordinatorButton({ 
  user, 
  categoria, 
  isCoach = false,
  recentMessages = [] 
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const queryClient = useQueryClient();

  // --- COACH: escalar (crear conversación si no existe) ---
  const escalateMutation = useMutation({
    mutationFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      const padreEmail = recentMessages[0]?.remitente_email;
      const padreNombre = recentMessages[0]?.remitente_nombre;

      if (!padreEmail) throw new Error("No se encontró el padre en los mensajes");

      const myPlayers = allPlayers.filter(p => 
        (p.email_padre === padreEmail || p.email_tutor_2 === padreEmail) && 
        p.deporte === categoria
      );

      // Verificar si ya existe conversación con coordinador para este padre
      const allConvs = await base44.entities.CoordinatorConversation.list();
      const existingConv = allConvs.find(c => 
        c.padre_email === padreEmail &&
        c.jugadores_asociados?.some(j => j.categoria === categoria)
      );

      if (existingConv && !existingConv.archivada) {
        toast.info("Ya existe una conversación activa con el coordinador para esta familia");
        return existingConv;
      }

      // Preparar contexto (últimos 25 mensajes)
      const contexto = recentMessages.slice(-25).map(m => 
        `[${m.tipo === "entrenador_a_grupo" ? "Entrenador" : "Padre"}] ${m.remitente_nombre}: ${m.mensaje}`
      ).join('\n\n');

      const jugadoresAsociados = allPlayers.filter(p => 
        (p.email_padre === padreEmail || p.email_tutor_2 === padreEmail) && 
        p.deporte === categoria
      ).map(p => ({
        jugador_id: p.id,
        jugador_nombre: p.nombre,
        categoria: p.deporte
      }));

      const newConv = await base44.entities.CoordinatorConversation.create({
        padre_email: padreEmail,
        padre_nombre: padreNombre,
        jugadores_asociados: jugadoresAsociados,
        escalada_desde_entrenador: true,
        entrenador_que_escalo: user.email,
        entrenador_nombre_que_escalo: user.full_name,
        fecha_escalacion: new Date().toISOString(),
        contexto_escalacion: contexto,
        ultimo_mensaje: "Conversación escalada por el entrenador",
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: "padre",
        prioritaria: true,
        etiqueta: "Quejas"
      });

      const totalMensajes = recentMessages.length;
      await base44.entities.CoordinatorMessage.create({
        conversacion_id: newConv.id,
        autor: "padre",
        autor_email: padreEmail,
        autor_nombre: padreNombre,
        mensaje: `🚨 CONVERSACIÓN ESCALADA POR ENTRENADOR\n\nEntrenador: ${user.full_name}\nCategoría: ${categoria}\nFecha: ${new Date().toLocaleString('es-ES')}\n\n📋 CONTEXTO (últimos ${Math.min(25, totalMensajes)} de ${totalMensajes} mensajes):\n\n${contexto || 'No hay mensajes previos disponibles'}\n\n---\n\nEl coordinador atenderá tu consulta a la mayor brevedad posible.`,
        leido_coordinador: false,
        leido_padre: true,
        fecha_leido_padre: new Date().toISOString()
      });

      // Notificar al coordinador
      const coordinators = await base44.entities.User.list();
      const coordinator = coordinators.find(u => u.es_coordinador === true);
      if (coordinator) {
        await base44.entities.AppNotification.create({
          usuario_email: coordinator.email,
          titulo: `🚨 Conversación escalada - ${categoria}`,
          mensaje: `${padreNombre} necesita ayuda del coordinador (${categoria})`,
          tipo: "urgente",
          icono: "🚨",
          enlace: "CoordinatorChat",
          vista: false
        });
      }

      // Notificar al entrenador
      await base44.entities.AppNotification.create({
        usuario_email: user.email,
        titulo: `✅ Conversación escalada al coordinador`,
        mensaje: `La conversación con ${padreNombre} ha sido transferida al coordinador`,
        tipo: "info",
        icono: "✅",
        enlace: "CoachParentChat",
        vista: false
      });

      return newConv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
      setShowDialog(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error) => {
      console.error("Error escalating:", error);
      toast.error("Error al crear la conversación");
    }
  });

  // --- PADRE: simplemente redirigir al chat de coordinador existente ---
  const handleParentClick = () => {
    window.location.href = createPageUrl("ParentCoordinatorChat");
  };

  const handleCoachEscalate = () => {
    escalateMutation.mutate();
  };

  // Para PADRES: botón simple que redirige, sin diálogo
  if (!isCoach) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleParentClick}
        className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-2"
      >
        <Shield className="w-4 h-4" />
        ¿Necesitas ayuda del Coordinador?
      </Button>
    );
  }

  // Para ENTRENADORES: mantener diálogo de escalación
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-2"
      >
        <Shield className="w-4 h-4" />
        🚨 Referir al Coordinador
      </Button>

      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-scale">
          <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <p className="font-bold">Escalada al coordinador correctamente</p>
          </div>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <Shield className="w-6 h-6" />
              Referir al Coordinador Deportivo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-800 text-sm">
                <strong>Vas a escalar esta conversación al coordinador deportivo.</strong>
              </AlertDescription>
            </Alert>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm">
              <p className="font-semibold text-slate-900">¿Qué pasará?</p>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Se creará un <strong>chat privado</strong> entre el padre y el coordinador</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Se copiarán los <strong>últimos 25 mensajes</strong> para que el coordinador tenga contexto</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>El coordinador hablará <strong>directamente con el padre</strong> para resolver la situación</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">ℹ</span>
                  <span>Tú <strong>recibirás una notificación</strong> cuando se resuelva</span>
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDialog(false)}
              disabled={escalateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCoachEscalate}
              disabled={escalateMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Shield className="w-4 h-4 mr-2" />
              {escalateMutation.isPending ? "Creando conversación..." : "Referir al Coordinador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}