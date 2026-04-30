import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, SendHorizonal, CheckCircle2, Clock, Inbox, Copy, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AccessRequestSendDialog from "./AccessRequestSendDialog";

export default function AccessRequestsPanel() {
  const queryClient = useQueryClient();
  const [sendingId, setSendingId] = useState(null);
  const [dialogRequest, setDialogRequest] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['accessRequests'],
    queryFn: () => base44.entities.AccessRequest.list('-created_date'),
  });

  const pendingRequests = requests.filter(r => r.estado === 'pendiente');
  const processedRequests = requests.filter(r => r.estado !== 'pendiente');

  const handleSent = async (result, request) => {
    // Marcar la solicitud como procesada
    try {
      await base44.entities.AccessRequest.update(request.id, {
        estado: 'codigo_enviado',
        codigo_enviado_id: result?.id || '',
      });
    } catch {}
    queryClient.invalidateQueries({ queryKey: ['accessRequests'] });
    queryClient.invalidateQueries({ queryKey: ['accessCodes'] });
    setDialogRequest(null);
  };

  const publicUrl = `${window.location.origin}/SolicitarAcceso`;

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Link público */}
      <Card className="border-2 border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ExternalLink className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-orange-900 text-sm">📎 Enlace público para familias</p>
              <p className="text-xs text-orange-700 mt-1">Comparte este enlace para que las familias puedan solicitar su código de acceso sin necesidad de WhatsApp ni email.</p>
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs bg-white border border-orange-200 rounded-lg px-3 py-1.5 flex-1 truncate text-orange-800">{publicUrl}</code>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100 whitespace-nowrap"
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl);
                    toast.success('Enlace copiado');
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Solicitudes pendientes */}
      {pendingRequests.length > 0 ? (
        <div className="space-y-2">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-orange-600" />
            Solicitudes pendientes ({pendingRequests.length})
          </h3>
          {pendingRequests.map((req) => (
            <Card key={req.id} className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm text-slate-900">{req.nombre_progenitor}</span>
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">{req.categoria}</Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(req.created_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {req.email}
                    </p>
                    {req.nombre_jugador && (
                      <p className="text-xs text-slate-500 mt-0.5">⚽ Jugador: {req.nombre_jugador}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
                      onClick={() => setDialogRequest(req)}
                    >
                      <SendHorizonal className="w-3 h-3 mr-1" />
                      Enviar Código
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-100"
                      onClick={async () => {
                        if (!confirm(`¿Eliminar la solicitud de ${req.nombre_progenitor}?`)) return;
                        await base44.entities.AccessRequest.delete(req.id);
                        queryClient.invalidateQueries({ queryKey: ['accessRequests'] });
                        toast.success('Solicitud eliminada');
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            <Inbox className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No hay solicitudes pendientes</p>
            <p className="text-xs text-slate-400 mt-1">Las solicitudes llegarán aquí cuando las familias usen el enlace público</p>
          </CardContent>
        </Card>
      )}

      {/* Solicitudes procesadas */}
      {processedRequests.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-600 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Procesadas ({processedRequests.length})
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-100 text-xs h-7"
              onClick={async () => {
                if (!confirm(`¿Eliminar las ${processedRequests.length} solicitudes procesadas?`)) return;
                for (const r of processedRequests) {
                  try { await base44.entities.AccessRequest.delete(r.id); } catch {}
                }
                queryClient.invalidateQueries({ queryKey: ['accessRequests'] });
                toast.success('Solicitudes procesadas eliminadas');
              }}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Borrar todas
            </Button>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {processedRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 bg-green-50 rounded-xl px-3 py-2 border border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800">{req.nombre_progenitor}</span>
                  <span className="text-xs text-slate-500 ml-2">{req.email}</span>
                </div>
                <Badge className="bg-green-100 text-green-700 text-xs">{req.categoria}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <AccessRequestSendDialog
        request={dialogRequest}
        open={!!dialogRequest}
        onOpenChange={(open) => { if (!open) setDialogRequest(null); }}
        onSent={handleSent}
      />
    </div>
  );
}