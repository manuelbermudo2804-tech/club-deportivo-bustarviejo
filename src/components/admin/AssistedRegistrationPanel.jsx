import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Phone, CheckCircle2, Clock, Loader2, MessageCircle, UserPlus, Plus } from "lucide-react";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

function RequestCard({ request, onMarkContacted, onMarkResolved, onUpdateNotes }) {
  const [notes, setNotes] = useState(request.notas_admin || "");
  const [saving, setSaving] = useState(false);

  const estadoConfig = {
    pendiente: { color: "bg-red-100 text-red-800 border-red-300", icon: Clock, label: "⏳ Pendiente" },
    contactado: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Phone, label: "📞 Contactado" },
    resuelto: { color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2, label: "✅ Resuelto" },
  };

  const estado = estadoConfig[request.estado] || estadoConfig.pendiente;

  return (
    <Card className={`border-l-4 ${request.estado === 'pendiente' ? 'border-l-red-500' : request.estado === 'contactado' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xl">📞</span>
              <span className="font-bold text-sm">{request.nombre_contacto}</span>
              <Badge className={`${estado.color} border text-xs`}>{estado.label}</Badge>
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <p>📱 <a href={`tel:${request.telefono}`} className="text-blue-600 font-bold hover:underline">{request.telefono}</a>
                {' · '}
                <a href={`https://wa.me/${request.telefono.replace(/[^0-9+]/g, '').replace(/^(\d)/, '34$1')}`} target="_blank" className="text-green-600 font-bold hover:underline">
                  WhatsApp
                </a>
              </p>
              {request.email_usuario && <p>📧 {request.email_usuario}</p>}
              {request.nombre_jugador && <p>⚽ Jugador: {request.nombre_jugador}</p>}
              <p>🔄 Intentos fallidos: {request.intentos_subida || 0}</p>
              <p>📅 {new Date(request.created_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            {/* Notas */}
            <div className="mt-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas sobre esta solicitud..."
                className="text-xs h-16"
              />
              {notes !== (request.notas_admin || "") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 text-xs"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    await onUpdateNotes(request.id, notes);
                    setSaving(false);
                  }}
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Guardar notas
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {request.estado === 'pendiente' && (
              <Button
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700 text-xs"
                onClick={() => onMarkContacted(request.id)}
              >
                <Phone className="w-3 h-3 mr-1" />
                Contactado
              </Button>
            )}
            {request.estado !== 'resuelto' && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-xs"
                onClick={() => onMarkResolved(request.id)}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Resuelto
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AssistedRegistrationPanel() {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['assistedRegistrations'],
    queryFn: () => base44.entities.AssistedRegistration.list('-created_date', 50),
  });

  const pendingCount = requests.filter(r => r.estado === 'pendiente').length;
  const contactedCount = requests.filter(r => r.estado === 'contactado').length;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AssistedRegistration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistedRegistrations'] });
    }
  });

  const handleMarkContacted = async (id) => {
    await updateMutation.mutateAsync({ id, data: { estado: 'contactado', fecha_contacto: new Date().toISOString() } });
    toast.success('Marcado como contactado');
  };

  const handleMarkResolved = async (id) => {
    const user = await base44.auth.me();
    await updateMutation.mutateAsync({ id, data: { estado: 'resuelto', resuelto_por: user?.email, fecha_resolucion: new Date().toISOString() } });
    toast.success('Solicitud resuelta');
  };

  const handleUpdateNotes = async (id, notes) => {
    await updateMutation.mutateAsync({ id, data: { notas_admin: notes } });
    toast.success('Notas guardadas');
  };

  // No mostrar nada si no hay solicitudes pendientes ni contactadas
  const activeRequests = requests.filter(r => r.estado !== 'resuelto');
  if (activeRequests.length === 0 && !isLoading) return null;

  return (
    <Card className={`mb-6 border-2 ${pendingCount > 0 ? 'border-red-400 bg-red-50' : 'border-yellow-300 bg-yellow-50'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Phone className={`w-5 h-5 ${pendingCount > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
          <span className={pendingCount > 0 ? 'text-red-800' : 'text-yellow-800'}>
            Solicitudes de Alta Asistida
          </span>
          {pendingCount > 0 && (
            <Badge className="bg-red-500 text-white ml-2">{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</Badge>
          )}
          {contactedCount > 0 && (
            <Badge className="bg-yellow-500 text-white ml-1">{contactedCount} en proceso</Badge>
          )}
        </CardTitle>
        <p className={`text-sm ${pendingCount > 0 ? 'text-red-700' : 'text-yellow-700'}`}>
          Familias que necesitan ayuda para registrar a sus jugadores. Contáctalas por teléfono o WhatsApp.
        </p>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activeRequests.map(req => (
              <RequestCard
                key={req.id}
                request={req}
                onMarkContacted={handleMarkContacted}
                onMarkResolved={handleMarkResolved}
                onUpdateNotes={handleUpdateNotes}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}