import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, SendHorizonal, CheckCircle2, Clock, Inbox, Copy, ExternalLink, Trash2, Phone, MessageCircle, Zap, UserCheck } from "lucide-react";
import { toast } from "sonner";
import AccessRequestSendDialog from "./AccessRequestSendDialog";
import AccessRequestTrustIndicator from "./AccessRequestTrustIndicator";

export default function AccessRequestsPanel() {
  const queryClient = useQueryClient();
  const [sendingId, setSendingId] = useState(null);
  const [dialogRequest, setDialogRequest] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['accessRequests'],
    queryFn: () => base44.entities.AccessRequest.list('-created_date'),
  });

  // Cargar jugadores y usuarios para analizar la confianza de cada solicitud
  const { data: players = [] } = useQuery({
    queryKey: ['playersForTrust'],
    queryFn: () => base44.entities.Player.list(),
    staleTime: 300000,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['usersForTrust'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 300000,
  });

  const pendingRequests = requests.filter(r => r.estado === 'pendiente');
  const processedRequests = requests.filter(r => r.estado !== 'pendiente');

  // Diferenciar enviadas automáticamente (sin intervención del admin)
  // de las enviadas manualmente. Una solicitud se considera "automática"
  // cuando su creación y el envío del código sucedieron casi a la vez
  // (en el mismo flujo del backend submitAccessRequest → generateAccessCode).
  const autoSentRequests = processedRequests.filter(r => {
    if (!r.codigo_enviado_id || !r.updated_date || !r.created_date) return false;
    const diffMs = new Date(r.updated_date).getTime() - new Date(r.created_date).getTime();
    return diffMs < 60_000; // menos de 60s entre crear y enviar = auto
  });
  const manualSentRequests = processedRequests.filter(r => !autoSentRequests.includes(r));

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

  const publicUrl = `https://app.cdbustarviejo.com/SolicitarAcceso`;

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estadísticas: envíos automáticos vs manuales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-green-700 uppercase leading-tight">Auto-enviados</p>
                <p className="text-xl font-black text-green-900 leading-none">{autoSentRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-blue-700 uppercase leading-tight">Manuales</p>
                <p className="text-xl font-black text-blue-900 leading-none">{manualSentRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-orange-700 uppercase leading-tight">Pendientes</p>
                <p className="text-xl font-black text-orange-900 leading-none">{pendingRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                <Inbox className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-700 uppercase leading-tight">Total</p>
                <p className="text-xl font-black text-slate-900 leading-none">{requests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aviso: cómo funciona el auto-envío */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="p-3">
          <p className="text-xs text-green-800 leading-relaxed">
            <Zap className="w-3.5 h-3.5 inline mr-1 text-green-600" />
            <strong>Envío automático activo:</strong> cuando una familia pide acceso con un email que YA está registrado como tutor de un jugador activo, el código se envía automáticamente sin que tengas que hacer nada. El resto (emails desconocidos, sospechosos o duplicados) quedan aquí pendientes para que los revises tú.
          </p>
        </CardContent>
      </Card>

      {/* Link público */}
      <Card className="border-2 border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ExternalLink className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-orange-900 text-sm">📎 Enlace público para familias</p>
              <p className="text-xs text-orange-700 mt-1">Comparte este enlace para que las familias puedan solicitar su código de acceso sin necesidad de WhatsApp ni email.</p>
              <div className="mt-2 space-y-2">
                <code className="block text-xs bg-white border border-orange-200 rounded-lg px-3 py-2 text-orange-800 break-all">{publicUrl}</code>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100 w-full sm:w-auto"
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl);
                    toast.success('Enlace copiado');
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar enlace
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
                      <AccessRequestTrustIndicator request={req} players={players} users={users} />
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">{req.categoria}</Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(req.created_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {req.email}
                    </p>
                    {req.telefono && (
                      <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1 flex-wrap">
                        <Phone className="w-3 h-3" /> {req.telefono}
                        <a
                          href={`https://wa.me/${req.telefono.replace(/\D/g, '').replace(/^0+/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 px-2 py-0.5 rounded-md text-[11px] font-semibold ml-1"
                        >
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                      </p>
                    )}
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
            {processedRequests.map((req) => {
              const wasAuto = autoSentRequests.includes(req);
              return (
                <div key={req.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 border ${wasAuto ? 'bg-emerald-50 border-emerald-200' : 'bg-green-50 border-green-200'}`}>
                  <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${wasAuto ? 'text-emerald-600' : 'text-green-600'}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-800">{req.nombre_progenitor}</span>
                    <span className="text-xs text-slate-500 ml-2">{req.email}</span>
                  </div>
                  {wasAuto && (
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-0.5">
                      <Zap className="w-2.5 h-2.5" />
                      Auto
                    </Badge>
                  )}
                  <Badge className="bg-green-100 text-green-700 text-xs">{req.categoria}</Badge>
                </div>
              );
            })}
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