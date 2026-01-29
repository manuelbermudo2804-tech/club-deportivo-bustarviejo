import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EscalateToAdminButton({ 
  conversation,
  recentMessages = [],
  coordinatorUser
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [motivo, setMotivo] = useState("Conflicto familiar");
  const [detalles, setDetalles] = useState("");
  const queryClient = useQueryClient();

  const escalateMutation = useMutation({
    mutationFn: async () => {
      if (!detalles.trim()) {
        throw new Error("Debes explicar el motivo de la escalación");
      }

      // Preparar contexto (TODOS los mensajes)
      const contexto = recentMessages.map(m => 
        `[${m.autor === "coordinador" ? "Coordinador" : "Padre"}] ${m.autor_nombre}: ${m.mensaje}`
      ).join('\n\n');

      // Verificar si ya existe conversación con admin para este padre
      const allAdminConvs = await base44.entities.AdminConversation.list();
      const existingConv = allAdminConvs.find(c => 
        c.padre_email === conversation.padre_email && !c.resuelta
      );

      if (existingConv) {
        // Marcar la conversación del coordinador como escalada para que aparezca al admin
        try {
          await base44.entities.CoordinatorConversation.update(conversation.id, {
            escalada_a_admin: true,
            motivo_escalacion_admin: motivo,
            contexto_escalacion_admin: contexto,
            etiqueta: 'Escalada'
          });
        } catch {}
        // Notificar a administradores
        try {
          const allUsers = await base44.entities.User.list();
          const admins = allUsers.filter(u => u.role === 'admin');
          await Promise.all(admins.map(a => base44.entities.AppNotification.create({
            usuario_email: a.email,
            titulo: `🚨 ESCALACIÓN CRÍTICA - ${motivo}`,
            mensaje: `El coordinador ${coordinatorUser.full_name} ha escalado la conversación con ${conversation.padre_nombre}.`,
            tipo: 'urgente',
            icono: '🚨',
            enlace: 'AdminCoordinatorChats',
            vista: false
          })));
        } catch {}
        toast.info("Ya existe una conversación activa con el administrador para este padre");
        return existingConv;
      }

      // Crear nueva conversación con admin
      const newConv = await base44.entities.AdminConversation.create({
        padre_email: conversation.padre_email,
        padre_nombre: conversation.padre_nombre,
        jugadores_asociados: conversation.jugadores_asociados,
        escalada_desde_coordinador: true,
        coordinador_que_escalo: coordinatorUser.email,
        coordinador_nombre_que_escalo: coordinatorUser.full_name,
        fecha_escalacion: new Date().toISOString(),
        contexto_escalacion: contexto,
        motivo_escalacion: motivo,
        motivo_detalle: detalles,
        ultimo_mensaje: "Conversación escalada al administrador",
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: "admin",
        no_leidos_admin: 1,
        no_leidos_padre: 0,
        criticidad: motivo.includes("Insultos") || motivo.includes("Amenazas") ? "Crítica" : "Alta",
        etiqueta: motivo.includes("Insultos") || motivo.includes("Amenazas") ? "Conflicto" : 
                  motivo.includes("Legal") ? "Legal" : "Quejas"
      });

      // Mensaje inicial con contexto
      const mensajeInicial = `🚨 CONVERSACIÓN ESCALADA POR COORDINADOR DEPORTIVO

Coordinador: ${coordinatorUser.full_name}
Padre: ${conversation.padre_nombre}
Jugadores: ${conversation.jugadores_asociados?.map(j => `${j.jugador_nombre} (${j.categoria})`).join(', ')}
Fecha: ${new Date().toLocaleString('es-ES')}

⚠️ MOTIVO DE ESCALACIÓN: ${motivo}

📝 DETALLES:
${detalles}

📋 CONTEXTO COMPLETO DE LA CONVERSACIÓN:

${contexto || 'No hay mensajes previos disponibles'}

---

Esta situación requiere intervención administrativa urgente.`;

      await base44.entities.AdminMessage.create({
        conversacion_id: newConv.id,
        autor: "admin",
        autor_email: "sistema@cdbustarviejo.com",
        autor_nombre: "Sistema",
        mensaje: mensajeInicial,
        leido_admin: false,
        leido_padre: false,
        es_nota_interna: true
      });

      // Notificar a todos los admins
       const allUsers = await base44.entities.User.list();
       const admins = allUsers.filter(u => u.role === "admin");

       for (const admin of admins) {
         await base44.entities.AppNotification.create({
           usuario_email: admin.email,
           titulo: `🚨 ESCALACIÓN CRÍTICA - ${motivo}`,
           mensaje: `El coordinador ${coordinatorUser.full_name} ha escalado la conversación con ${conversation.padre_nombre}. Requiere intervención inmediata.`,
           tipo: "urgente",
           icono: "🚨",
           enlace: "AdminCoordinatorChats",
           vista: false
         });

         // Bubble notification for admin in dashboard
         console.log(`📢 AppNotification creada para admin: ${admin.email}`);
       }

      // Notificar al coordinador
      await base44.entities.AppNotification.create({
        usuario_email: coordinatorUser.email,
        titulo: `✅ Conversación escalada al administrador`,
        mensaje: `La conversación con ${conversation.padre_nombre} ha sido transferida al administrador. Recibirás actualizaciones sobre su resolución.`,
        tipo: "info",
        icono: "✅",
        enlace: "CoordinatorChat",
        vista: false
      });

      return newConv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
      setShowDialog(false);
      setShowSuccess(true);
      setMotivo("Conflicto familiar");
      setDetalles("");
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error) => {
      console.error("Error escalating to admin:", error);
      toast.error(error.message || "Error al escalar al administrador");
    }
  });

  const handleEscalate = () => {
    if (!detalles.trim()) {
      toast.error("Debes explicar el motivo de la escalación");
      return;
    }
    escalateMutation.mutate();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="border-red-300 text-red-700 hover:bg-red-50 gap-2"
      >
        <ShieldAlert className="w-4 h-4" />
        🚨 Escalar al Administrador
      </Button>

      {/* Confirmación de éxito */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-scale">
          <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <p className="font-bold">Escalada al administrador correctamente</p>
          </div>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="w-6 h-6" />
              Escalar al Administrador
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="bg-red-50 border-red-300">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                <strong>Vas a escalar esta conversación al administrador del club.</strong>
              </AlertDescription>
            </Alert>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm">
              <p className="font-semibold text-slate-900">¿Cuándo escalar al administrador?</p>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span><strong>Insultos o amenazas</strong> hacia personal del club</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span><strong>Acusaciones graves</strong> que requieren investigación</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span><strong>Conflictos legales</strong> o que puedan derivar en acciones legales</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span><strong>Situaciones críticas</strong> que superan tu autoridad como coordinador</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Motivo de la escalación *</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Insultos">🤬 Insultos al personal</SelectItem>
                  <SelectItem value="Amenazas">⚠️ Amenazas</SelectItem>
                  <SelectItem value="Acusaciones graves">📢 Acusaciones graves</SelectItem>
                  <SelectItem value="Ataques al personal">💥 Ataques al entrenador/coordinador</SelectItem>
                  <SelectItem value="Conflicto familiar">👨‍👩‍👧 Conflicto familiar</SelectItem>
                  <SelectItem value="Otro">🔹 Otro motivo grave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Explica la situación *</Label>
              <Textarea
                placeholder="Describe detalladamente por qué esta situación requiere intervención del administrador..."
                value={detalles}
                onChange={(e) => setDetalles(e.target.value)}
                rows={4}
                className="text-sm"
              />
              <p className="text-xs text-slate-500">
                Sé específico: qué pasó, quién está involucrado, por qué es grave
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
              <p className="text-xs text-blue-800 text-center">
                ℹ️ El administrador verá todo el contexto de la conversación y se pondrá en contacto con el padre
              </p>
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
              onClick={handleEscalate}
              disabled={escalateMutation.isPending || !detalles.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              {escalateMutation.isPending ? "Escalando..." : "Escalar al Administrador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}