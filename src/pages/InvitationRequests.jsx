import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Users, UserPlus, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";

export default function InvitationRequests() {
  const [filter, setFilter] = useState("pendiente");
  const queryClient = useQueryClient();

  const { data: secondParentInvitations = [], isLoading: loadingSecondParent } = useQuery({
    queryKey: ['secondParentInvitations'],
    queryFn: () => base44.entities.SecondParentInvitation.list(),
  });

  const { data: adultPlayerRequests = [], isLoading: loadingAdult } = useQuery({
    queryKey: ['invitationRequests'],
    queryFn: () => base44.entities.InvitationRequest.list(),
  });

  const markAsProcessedMutation = useMutation({
    mutationFn: async ({ id, type, estado }) => {
      if (type === 'second_parent') {
        await base44.entities.SecondParentInvitation.update(id, { 
          estado,
          fecha_procesado: new Date().toISOString()
        });
      } else {
        await base44.entities.InvitationRequest.update(id, { 
          estado,
          fecha_procesado: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondParentInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['invitationRequests'] });
      toast.success("Estado actualizado");
    },
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  const filteredSecondParent = secondParentInvitations.filter(inv => 
    filter === "all" || inv.estado === filter
  );

  const minorRequests = adultPlayerRequests.filter(r => r.tipo_solicitud === "acceso_menor");
  const adultOnlyRequests = adultPlayerRequests.filter(r => r.tipo_solicitud !== "acceso_menor");

  const filteredAdult = adultOnlyRequests.filter(req => 
    filter === "all" || req.estado === filter
  );

  const filteredMinor = minorRequests.filter(req =>
    filter === "all" || req.estado === filter
  );

  const pendingSecondParentCount = secondParentInvitations.filter(i => i.estado === "pendiente").length;
  const pendingAdultCount = adultOnlyRequests.filter(i => i.estado === "pendiente").length;
  const pendingMinorCount = minorRequests.filter(i => i.estado === "pendiente").length;
  const totalPending = pendingSecondParentCount + pendingAdultCount + pendingMinorCount;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">📧 Solicitudes de Invitación</h1>
        <p className="text-slate-600">
          Gestiona las solicitudes de invitación de segundos progenitores y jugadores mayores de edad
        </p>
        {totalPending > 0 && (
          <Badge className="mt-2 bg-orange-600 text-white text-sm">
            {totalPending} solicitud{totalPending > 1 ? 'es' : ''} pendiente{totalPending > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {totalPending > 0 && (
        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-orange-900 text-lg mb-2">
                  📧 {totalPending} Solicitud{totalPending > 1 ? 'es' : ''} Pendiente{totalPending > 1 ? 's' : ''} de Procesar
                </h3>
                <p className="text-sm text-orange-800 mb-3">
                  Copia los emails y envía las invitaciones desde <strong>Base44 → Compartir App</strong>. Luego marca como procesadas aquí.
                </p>
                <Button
                  onClick={() => {
                    const allPendingEmails = [
                      ...secondParentInvitations.filter(i => i.estado === "pendiente").map(i => i.email_destino),
                      ...adultPlayerRequests.filter(i => i.estado === "pendiente").map(i => i.email_jugador)
                    ];
                    const emailString = allPendingEmails.join('; ');
                    copyToClipboard(emailString);
                    toast.success(`${allPendingEmails.length} emails copiados - ahora ve a Base44 → Compartir App para enviar invitaciones`);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Todos los Emails ({totalPending})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex gap-2">
        <Button 
          variant={filter === "pendiente" ? "default" : "outline"}
          onClick={() => setFilter("pendiente")}
          className={filter === "pendiente" ? "bg-orange-600" : ""}
        >
          <Clock className="w-4 h-4 mr-2" />
          Pendientes {pendingSecondParentCount + pendingAdultCount > 0 && `(${pendingSecondParentCount + pendingAdultCount})`}
        </Button>
        <Button 
          variant={filter === "aceptada" ? "default" : "outline"}
          onClick={() => setFilter("aceptada")}
          className={filter === "aceptada" ? "bg-green-600" : ""}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Procesadas
        </Button>
        <Button 
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className={filter === "all" ? "bg-slate-600" : ""}
        >
          Todas
        </Button>
      </div>

      <Tabs defaultValue={pendingMinorCount > 0 ? "minor" : "second_parent"} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="minor" className="relative text-xs">
            ⚽ Acceso Juvenil
            {pendingMinorCount > 0 && (
              <Badge className="ml-1 bg-green-600 text-white text-xs">{pendingMinorCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="second_parent" className="relative text-xs">
            <Users className="w-3 h-3 mr-1" />
            2º Progenitor
            {pendingSecondParentCount > 0 && (
              <Badge className="ml-1 bg-orange-600 text-white text-xs">{pendingSecondParentCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="adult_players" className="relative text-xs">
            <UserPlus className="w-3 h-3 mr-1" />
            +18
            {pendingAdultCount > 0 && (
              <Badge className="ml-1 bg-orange-600 text-white text-xs">{pendingAdultCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="minor" className="space-y-4 mt-6">
          {loadingAdult ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
            </div>
          ) : filteredMinor.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                No hay solicitudes de acceso juvenil {filter !== "all" && `con estado "${filter}"`}
              </CardContent>
            </Card>
          ) : (
            filteredMinor.map(req => (
              <Card key={req.id} className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">⚽</span>
                        <h3 className="font-bold text-lg">{req.nombre_jugador}</h3>
                        {req.estado === "pendiente" && <Badge className="bg-green-600 text-white">Pendiente</Badge>}
                        {req.estado === "enviada" && <Badge className="bg-blue-600 text-white">Invitación Enviada</Badge>}
                        {req.estado === "completada" && <Badge className="bg-slate-600 text-white">Completada</Badge>}
                      </div>
                      <div className="space-y-1 text-sm text-slate-600 mb-3">
                        <p>📧 <strong>Email menor:</strong> {req.email_jugador}</p>
                        <p>🏷️ <strong>Categoría:</strong> {req.categoria_deseada}</p>
                        {req.fecha_nacimiento && <p>🎂 <strong>Fecha nac.:</strong> {new Date(req.fecha_nacimiento).toLocaleDateString('es-ES')}</p>}
                        <p>👤 <strong>Solicitado por:</strong> {req.solicitado_por_nombre} ({req.solicitado_por_email})</p>
                        {req.consentimiento_fecha && <p>✅ <strong>Consentimiento:</strong> {new Date(req.consentimiento_fecha).toLocaleString('es-ES')} ({req.consentimiento_version})</p>}
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(req.created_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {req.notas && <p className="text-xs bg-green-50 rounded-lg p-2 text-green-800 mb-3">{req.notas}</p>}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(req.email_jugador)}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copiar email
                        </Button>
                        {req.estado === "pendiente" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => markAsProcessedMutation.mutate({ id: req.id, type: 'adult', estado: 'enviada' })}
                            >
                              <Mail className="w-3 h-3 mr-1" /> Marcar Invitación Enviada
                            </Button>
                          </>
                        )}
                        {req.estado === "enviada" && (
                          <Button
                            size="sm"
                            className="bg-slate-600 hover:bg-slate-700"
                            onClick={() => markAsProcessedMutation.mutate({ id: req.id, type: 'adult', estado: 'completada' })}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar Completada
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="second_parent" className="space-y-4 mt-6">
          {loadingSecondParent ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto" />
            </div>
          ) : filteredSecondParent.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                No hay solicitudes de segundos progenitores {filter !== "all" && `con estado "${filter}"`}
              </CardContent>
            </Card>
          ) : (
            filteredSecondParent.map(inv => (
              <Card key={inv.id} className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-600" />
                        Segundo Progenitor
                        {inv.estado === "pendiente" && (
                          <Badge className="bg-orange-600 text-white">Pendiente</Badge>
                        )}
                        {inv.estado === "aceptada" && (
                          <Badge className="bg-green-600 text-white">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Procesada
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        {new Date(inv.fecha_envio).toLocaleDateString('es-ES', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 mb-1">Datos del Segundo Progenitor:</p>
                      <p className="font-bold text-slate-900">{inv.nombre_destino || "No especificado"}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-sm text-slate-700">{inv.email_destino}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(inv.email_destino)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 mb-1">Jugador relacionado:</p>
                      <p className="font-bold text-blue-900">{inv.jugador_nombre}</p>
                      <p className="text-sm text-blue-700 mt-2">
                        Solicitado por: {inv.invitado_por_nombre}
                      </p>
                      <p className="text-xs text-slate-500">{inv.invitado_por_email}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => copyToClipboard(inv.email_destino)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Email
                    </Button>
                    {inv.estado === "pendiente" && (
                      <Button
                        onClick={() => markAsProcessedMutation.mutate({ id: inv.id, type: 'second_parent', estado: 'aceptada' })}
                        disabled={markAsProcessedMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {markAsProcessedMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Marcar como Procesada
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="adult_players" className="space-y-4 mt-6">
          {loadingAdult ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto" />
            </div>
          ) : filteredAdult.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                No hay solicitudes de jugadores +18 {filter !== "all" && `con estado "${filter}"`}
              </CardContent>
            </Card>
          ) : (
            filteredAdult.map(req => (
              <Card key={req.id} className="border-l-4 border-l-purple-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-purple-600" />
                        Jugador +18
                        {req.estado === "pendiente" && (
                          <Badge className="bg-orange-600 text-white">Pendiente</Badge>
                        )}
                        {req.estado === "aceptada" && (
                          <Badge className="bg-green-600 text-white">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Procesada
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        {new Date(req.created_date).toLocaleDateString('es-ES', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 mb-1">Datos del Jugador:</p>
                      <p className="font-bold text-slate-900">{req.nombre_jugador}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-sm text-slate-700">{req.email_jugador}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(req.email_jugador)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      {req.telefono_jugador && (
                        <p className="text-sm text-slate-600 mt-1">📱 {req.telefono_jugador}</p>
                      )}
                      {req.categoria_deseada && (
                        <p className="text-sm text-slate-600 mt-1">⚽ {req.categoria_deseada}</p>
                      )}
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 mb-1">Solicitado por:</p>
                      <p className="font-bold text-blue-900">{req.solicitado_por_nombre}</p>
                      <p className="text-sm text-blue-700">{req.solicitado_por_email}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => copyToClipboard(req.email_jugador)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Email
                    </Button>
                    {req.estado === "pendiente" && (
                      <Button
                        onClick={() => markAsProcessedMutation.mutate({ id: req.id, type: 'adult_player', estado: 'aceptada' })}
                        disabled={markAsProcessedMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {markAsProcessedMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Marcar como Procesada
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {totalPending === 0 && filter === "pendiente" && (
        <Card className="mt-6 bg-green-50 border-green-200">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-lg font-bold text-green-900">¡Todo al día!</p>
            <p className="text-sm text-green-700">No hay solicitudes pendientes</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}