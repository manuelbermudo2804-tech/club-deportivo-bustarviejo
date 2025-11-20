import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, MapPin, Clock, Mail, Bell, CheckCircle2, XCircle, HelpCircle, AlertTriangle, Download, Plus, Edit, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import EventForm from "../components/calendar/EventForm";

export default function EventManagement() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-fecha'),
    initialData: [],
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      return await base44.entities.Event.create(eventData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowForm(false);
      setEditingEvent(null);
      toast.success("✅ Evento creado");
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, eventData }) => {
      return await base44.entities.Event.update(id, eventData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowForm(false);
      setEditingEvent(null);
      toast.success("✅ Evento actualizado");
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Event.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("🗑️ Evento eliminado");
    },
  });

  const sendRemindersMutation = useMutation({
    mutationFn: async (event) => {
      const confirmedAttendees = event.confirmaciones?.filter(c => c.confirmacion === "asistire") || [];
      
      for (const attendee of confirmedAttendees) {
        if (!attendee.recordatorio_enviado) {
          try {
            await base44.integrations.Core.SendEmail({
              to: attendee.usuario_email,
              subject: `🔔 Recordatorio: ${event.titulo}`,
              body: `
                <h2>Recordatorio de Evento</h2>
                <p>Hola <strong>${attendee.usuario_nombre}</strong>,</p>
                <p>Te recordamos que confirmaste asistencia al siguiente evento:</p>
                <ul>
                  <li><strong>Evento:</strong> ${event.titulo}</li>
                  <li><strong>Fecha:</strong> ${format(new Date(event.fecha), "d 'de' MMMM yyyy", { locale: es })}</li>
                  <li><strong>Hora:</strong> ${event.hora || 'Por confirmar'}</li>
                  <li><strong>Ubicación:</strong> ${event.ubicacion || 'Por confirmar'}</li>
                </ul>
                <p>¡Te esperamos!</p>
              `
            });
          } catch (error) {
            console.error(`Error sending reminder to ${attendee.usuario_email}:`, error);
          }
        }
      }

      // Marcar como enviados
      const updatedConfirmaciones = event.confirmaciones?.map(c => ({
        ...c,
        recordatorio_enviado: c.confirmacion === "asistire"
      }));

      await base44.entities.Event.update(event.id, {
        ...event,
        confirmaciones: updatedConfirmaciones,
        recordatorio_enviado: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("📧 Recordatorios enviados");
    },
  });

  const handleSubmit = async (eventData) => {
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, eventData });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleDelete = (event) => {
    if (window.confirm(`¿Eliminar evento "${event.titulo}"?`)) {
      deleteEventMutation.mutate(event.id);
    }
  };

  const exportAttendees = (event) => {
    const confirmed = event.confirmaciones?.filter(c => c.confirmacion === "asistire") || [];
    const csv = [
      ['Nombre', 'Email', 'Acompañantes', 'Fecha Confirmación', 'Comentario'],
      ...confirmed.map(c => [
        c.usuario_nombre,
        c.usuario_email,
        c.num_acompanantes || 0,
        format(new Date(c.fecha_confirmacion), "dd/MM/yyyy HH:mm"),
        c.comentario || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asistentes_${event.titulo.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("📥 Lista descargada");
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(e => e.fecha >= today && (isAdmin || e.publicado)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pastEvents = events.filter(e => e.fecha < today && (isAdmin || e.publicado)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const eventosConRSVP = upcomingEvents.filter(e => e.requiere_confirmacion);

  const getConfirmationStats = (event) => {
    const confirmaciones = event.confirmaciones || [];
    const asistire = confirmaciones.filter(c => c.confirmacion === "asistire").length;
    const noAsistire = confirmaciones.filter(c => c.confirmacion === "no_asistire").length;
    const quizas = confirmaciones.filter(c => c.confirmacion === "quizas").length;
    const pendiente = confirmaciones.filter(c => c.confirmacion === "pendiente").length;
    const totalAcompanantes = confirmaciones
      .filter(c => c.confirmacion === "asistire")
      .reduce((sum, c) => sum + (c.num_acompanantes || 0), 0);
    
    return { asistire, noAsistire, quizas, pendiente, totalAcompanantes };
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto" />
              <h2 className="text-2xl font-bold text-red-900">Acceso Restringido</h2>
              <p className="text-red-700">Solo los administradores pueden gestionar eventos.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Eventos</h1>
          <p className="text-slate-600 mt-1">Cenas, torneos, asambleas y más</p>
        </div>
        <Button
          onClick={() => {
            setEditingEvent(null);
            setShowForm(true);
          }}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Evento
        </Button>
      </div>

      {showForm && (
        <EventForm
          event={editingEvent}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingEvent(null);
          }}
          isSubmitting={createEventMutation.isPending || updateEventMutation.isPending}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Próximos ({upcomingEvents.length})</TabsTrigger>
          <TabsTrigger value="rsvp">Con RSVP ({eventosConRSVP.length})</TabsTrigger>
          <TabsTrigger value="past">Pasados ({pastEvents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">No hay eventos próximos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingEvents.map(event => {
                const stats = getConfirmationStats(event);
                return (
                  <Card key={event.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={event.importante ? "bg-red-600" : "bg-orange-600"}>
                              {event.tipo}
                            </Badge>
                            {!event.publicado && <Badge variant="outline">Borrador</Badge>}
                            {event.requiere_confirmacion && (
                              <Badge className="bg-blue-600">
                                <Users className="w-3 h-3 mr-1" />
                                RSVP
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl">{event.titulo}</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowRSVPDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingEvent(event);
                              setShowForm(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(event)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Calendar className="w-4 h-4 text-orange-600" />
                          {format(new Date(event.fecha), "d 'de' MMMM yyyy", { locale: es })}
                        </div>
                        {event.hora && (
                          <div className="flex items-center gap-2 text-slate-700">
                            <Clock className="w-4 h-4 text-orange-600" />
                            {event.hora}
                          </div>
                        )}
                        {event.ubicacion && (
                          <div className="flex items-center gap-2 text-slate-700">
                            <MapPin className="w-4 h-4 text-orange-600" />
                            {event.ubicacion}
                          </div>
                        )}
                        {event.deporte && (
                          <div className="flex items-center gap-2 text-slate-700">
                            <span>🏃</span>
                            {event.deporte} - {event.categoria}
                          </div>
                        )}
                      </div>

                      {event.descripcion && (
                        <p className="text-sm text-slate-600 line-clamp-2">{event.descripcion}</p>
                      )}

                      {event.requiere_confirmacion && (
                        <div className="border-t pt-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                            <div>
                              <div className="text-2xl font-bold text-green-600">{stats.asistire}</div>
                              <div className="text-xs text-slate-600 flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Asistirán
                              </div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-red-600">{stats.noAsistire}</div>
                              <div className="text-xs text-slate-600 flex items-center justify-center gap-1">
                                <XCircle className="w-3 h-3" />
                                No asistirán
                              </div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-yellow-600">{stats.quizas}</div>
                              <div className="text-xs text-slate-600 flex items-center justify-center gap-1">
                                <HelpCircle className="w-3 h-3" />
                                Quizás
                              </div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-slate-400">{stats.pendiente}</div>
                              <div className="text-xs text-slate-600">Pendientes</div>
                            </div>
                          </div>
                          {stats.totalAcompanantes > 0 && (
                            <div className="text-sm text-slate-600 text-center mt-2">
                              + {stats.totalAcompanantes} acompañantes
                            </div>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exportAttendees(event)}
                              className="flex-1"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Exportar Lista
                            </Button>
                            {event.enviar_recordatorio_automatico && !event.recordatorio_enviado && (
                              <Button
                                size="sm"
                                onClick={() => sendRemindersMutation.mutate(event)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                disabled={sendRemindersMutation.isPending}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Enviar Recordatorios
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rsvp" className="space-y-4">
          {eventosConRSVP.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">No hay eventos con RSVP activo</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {eventosConRSVP.map(event => {
                const stats = getConfirmationStats(event);
                const totalConfirmados = stats.asistire + stats.totalAcompanantes;
                const porcentajeCapacidad = event.capacidad_maxima 
                  ? Math.round((totalConfirmados / event.capacidad_maxima) * 100)
                  : null;

                return (
                  <Card key={event.id} className="hover:shadow-lg transition-shadow border-blue-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-600">
                              <Users className="w-3 h-3 mr-1" />
                              RSVP Activo
                            </Badge>
                            {event.capacidad_maxima && (
                              <Badge variant={porcentajeCapacidad >= 90 ? "destructive" : "outline"}>
                                {totalConfirmados}/{event.capacidad_maxima} plazas
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl">{event.titulo}</CardTitle>
                          <p className="text-sm text-slate-600 mt-1">
                            {format(new Date(event.fecha), "d 'de' MMMM yyyy", { locale: es })} • {event.hora}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowRSVPDialog(true);
                          }}
                        >
                          Ver Detalles
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-3 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-600">{stats.asistire}</div>
                          <div className="text-xs text-slate-600">Confirman</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-orange-600">{stats.totalAcompanantes}</div>
                          <div className="text-xs text-slate-600">Acompañantes</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-yellow-600">{stats.quizas}</div>
                          <div className="text-xs text-slate-600">Quizás</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-slate-400">{stats.pendiente}</div>
                          <div className="text-xs text-slate-600">Pendientes</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastEvents.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">No hay eventos pasados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 opacity-60">
              {pastEvents.slice(0, 10).map(event => (
                <Card key={event.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Badge variant="outline">{event.tipo}</Badge>
                        <h3 className="font-bold text-slate-700 mt-2">{event.titulo}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {format(new Date(event.fecha), "d 'de' MMMM yyyy", { locale: es })}
                        </p>
                      </div>
                      {event.requiere_confirmacion && (
                        <div className="text-right">
                          <div className="text-sm text-slate-600">
                            {getConfirmationStats(event).asistire} asistentes
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de detalles RSVP */}
      <Dialog open={showRSVPDialog} onOpenChange={setShowRSVPDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asistentes: {selectedEvent?.titulo}</DialogTitle>
            <DialogDescription>
              {selectedEvent?.fecha && format(new Date(selectedEvent.fecha), "d 'de' MMMM yyyy", { locale: es })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 text-center">
                {['asistire', 'no_asistire', 'quizas', 'pendiente'].map(status => {
                  const count = selectedEvent.confirmaciones?.filter(c => c.confirmacion === status).length || 0;
                  const icons = { asistire: CheckCircle2, no_asistire: XCircle, quizas: HelpCircle, pendiente: Clock };
                  const colors = { asistire: 'text-green-600', no_asistire: 'text-red-600', quizas: 'text-yellow-600', pendiente: 'text-slate-400' };
                  const labels = { asistire: 'Asistirán', no_asistire: 'No asistirán', quizas: 'Quizás', pendiente: 'Pendientes' };
                  const Icon = icons[status];
                  
                  return (
                    <div key={status}>
                      <div className={`text-2xl font-bold ${colors[status]}`}>{count}</div>
                      <div className="text-xs text-slate-600 flex items-center justify-center gap-1">
                        <Icon className="w-3 h-3" />
                        {labels[status]}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900">Confirman asistencia:</h4>
                {selectedEvent.confirmaciones?.filter(c => c.confirmacion === "asistire").map((c, idx) => (
                  <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{c.usuario_nombre}</p>
                        <p className="text-sm text-slate-600">{c.usuario_email}</p>
                        {c.num_acompanantes > 0 && (
                          <p className="text-sm text-green-700 mt-1">
                            + {c.num_acompanantes} acompañante{c.num_acompanantes > 1 ? 's' : ''}
                          </p>
                        )}
                        {c.comentario && (
                          <p className="text-sm text-slate-500 italic mt-1">"{c.comentario}"</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(c.fecha_confirmacion), "dd/MM HH:mm")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRSVPDialog(false)}>
              Cerrar
            </Button>
            {selectedEvent && (
              <Button onClick={() => exportAttendees(selectedEvent)}>
                <Download className="w-4 h-4 mr-2" />
                Exportar Lista
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}