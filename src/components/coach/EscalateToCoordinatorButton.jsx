import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Shield, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EscalateToCoordinatorButton({ 
  user, 
  categoria, 
  isCoach = false,
  recentMessages = [] 
}) {
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const escalateMutation = useMutation({
    mutationFn: async () => {
      // Obtener info del usuario actual
      const allPlayers = await base44.entities.Player.list();
      const myPlayers = allPlayers.filter(p => 
        (p.email_padre === user.email || p.email_tutor_2 === user.email) && 
        p.deporte === categoria
      );

      if (myPlayers.length === 0 && !isCoach) {
        throw new Error("No se encontraron jugadores");
      }

      // Verificar si ya existe conversación con coordinador para este padre
      const allConvs = await base44.entities.CoordinatorConversation.list();
      const existingConv = allConvs.find(c => 
        c.padre_email === (isCoach ? recentMessages[0]?.remitente_email : user.email) &&
        c.jugadores_asociados?.some(j => j.categoria === categoria)
      );

      if (existingConv && !existingConv.archivada) {
        // Ya existe conversación activa
        toast.info("Ya tienes una conversación activa con el coordinador para esta categoría");
        return existingConv;
      }

      // Preparar contexto (TODOS los mensajes)
      const contexto = recentMessages.map(m => 
        `[${m.tipo === "entrenador_a_grupo" ? "Entrenador" : "Padre"}] ${m.remitente_nombre}: ${m.mensaje}`
      ).join('\n\n');

      const padreEmail = isCoach ? recentMessages[0]?.remitente_email : user.email;
      const padreNombre = isCoach ? recentMessages[0]?.remitente_nombre : user.full_name;

      // Crear nueva conversación con coordinador
      const jugadoresAsociados = isCoach 
        ? allPlayers.filter(p => 
            (p.email_padre === padreEmail || p.email_tutor_2 === padreEmail) && 
            p.deporte === categoria
          ).map(p => ({
            jugador_id: p.id,
            jugador_nombre: p.nombre,
            categoria: p.deporte
          }))
        : myPlayers.map(p => ({
            jugador_id: p.id,
            jugador_nombre: p.nombre,
            categoria: p.deporte
          }));

      const newConv = await base44.entities.CoordinatorConversation.create({
        padre_email: padreEmail,
        padre_nombre: padreNombre,
        jugadores_asociados: jugadoresAsociados,
        escalada_desde_entrenador: isCoach,
        entrenador_que_escalo: isCoach ? user.email : null,
        entrenador_nombre_que_escalo: isCoach ? user.full_name : null,
        fecha_escalacion: new Date().toISOString(),
        contexto_escalacion: contexto,
        ultimo_mensaje: isCoach ? "Conversación escalada por el entrenador" : "Nueva consulta para el coordinador",
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: "padre",
        no_leidos_coordinador: 1,
        no_leidos_padre: 0,
        prioritaria: true,
        etiqueta: isCoach ? "Quejas" : "Otro"
      });

      // Mensaje inicial con contexto
      const mensajeInicial = isCoach 
        ? `🚨 CONVERSACIÓN ESCALADA POR ENTRENADOR\n\nEntrenador: ${user.full_name}\nCategoría: ${categoria}\nFecha: ${new Date().toLocaleString('es-ES')}\n\n📋 HISTORIAL COMPLETO DE LA CONVERSACIÓN:\n\n${contexto || 'No hay mensajes previos disponibles'}\n\n---\n\nEl coordinador atenderá tu consulta a la mayor brevedad posible.`
        : `Hola, necesito ayuda del coordinador deportivo con una consulta sobre mi hijo/a en ${categoria}.\n\n${contexto ? `📋 Contexto:\n${contexto}` : ''}`;

      await base44.entities.CoordinatorMessage.create({
        conversacion_id: newConv.id,
        autor: "padre",
        autor_email: padreEmail,
        autor_nombre: padreNombre,
        mensaje: mensajeInicial,
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
          titulo: isCoach 
            ? `🚨 Conversación escalada - ${categoria}` 
            : `💬 Nueva consulta de ${padreNombre}`,
          mensaje: `${padreNombre} necesita ayuda del coordinador (${categoria})`,
          tipo: "urgente",
          icono: "🚨",
          enlace: "CoordinatorChat",
          vista: false
        });
      }

      // Si fue escalada por entrenador, notificar también al entrenador
      if (isCoach) {
        await base44.entities.AppNotification.create({
          usuario_email: user.email,
          titulo: `✅ Conversación escalada al coordinador`,
          mensaje: `La conversación con ${padreNombre} ha sido transferida al coordinador`,
          tipo: "info",
          icono: "✅",
          enlace: "CoachParentChat",
          vista: false
        });
      }

      return newConv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
      setShowDialog(false);
      
      if (isCoach) {
        toast.success("✅ Conversación escalada al coordinador. Recibirás actualizaciones.");
      } else {
        toast.success("✅ Conversación iniciada con el coordinador deportivo");
        setTimeout(() => {
          window.location.href = "/ParentCoordinatorChat";
        }, 1500);
      }
    },
    onError: (error) => {
      console.error("Error escalating:", error);
      toast.error("Error al crear la conversación");
    }
  });

  const handleEscalate = () => {
    escalateMutation.mutate();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-2"
      >
        <Shield className="w-4 h-4" />
        {isCoach ? "🚨 Referir al Coordinador" : "¿Necesitas ayuda del Coordinador?"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <Shield className="w-6 h-6" />
              {isCoach ? "Referir al Coordinador Deportivo" : "Contactar con el Coordinador"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isCoach ? (
              // Mensaje para entrenadores
              <>
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
                      <span>Se copiará el <strong>historial COMPLETO de mensajes</strong> para que el coordinador esté informado</span>
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

                <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                  <p className="text-xs text-blue-800 text-center">
                    💡 El coordinador deportivo es el responsable de gestionar situaciones complejas o conflictos que requieren mayor autoridad
                  </p>
                </div>
              </>
            ) : (
              // Mensaje para padres
              <>
                <Alert className="bg-blue-50 border-blue-200">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    <strong>¿Necesitas ayuda adicional?</strong> El coordinador deportivo puede ayudarte.
                  </AlertDescription>
                </Alert>

                <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm">
                  <p className="font-semibold text-slate-900">¿Qué pasará?</p>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Se abrirá un <strong>chat privado</strong> con el Coordinador Deportivo del club</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Podrás comentar <strong>problemas complejos</strong> o situaciones que el entrenador no puede resolver</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>El coordinador tiene <strong>más autoridad</strong> para tomar decisiones importantes</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-orange-50 rounded-lg p-3 border-2 border-orange-200">
                  <p className="text-xs text-orange-800 text-center">
                    ℹ️ <strong>Ejemplos:</strong> quejas, conflictos, decisiones sobre cambios de categoría, problemas con otros padres, etc.
                  </p>
                </div>
              </>
            )}
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
              onClick={handleEscalate}
              disabled={escalateMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Shield className="w-4 h-4 mr-2" />
              {escalateMutation.isPending 
                ? "Creando conversación..." 
                : isCoach 
                  ? "Referir al Coordinador" 
                  : "Contactar Coordinador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}