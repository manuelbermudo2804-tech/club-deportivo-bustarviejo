import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Users, CheckCircle2, XCircle, HelpCircle, Info, Heart, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import EventCapacityBar from "../components/events/EventCapacityBar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function ParentEventRSVP() {
  const [user, setUser] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [rsvpData, setRsvpData] = useState({
    confirmacion: "pendiente",
    num_acompanantes: 0,
    comentario: ""
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
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

  const [showThankYou, setShowThankYou] = useState(false);
  const [confirmedResponse, setConfirmedResponse] = useState(null);

  const updateRSVPMutation = useMutation({
    mutationFn: async ({ event, confirmacion, num_acompanantes, comentario }) => {
      const confirmaciones = event.confirmaciones || [];
      const existingIndex = confirmaciones.findIndex(c => c.usuario_email === user.email);

      const newConfirmacion = {
        usuario_email: user.email,
        usuario_nombre: user.full_name,
        confirmacion,
        num_acompanantes: confirmacion === "asistire" ? (num_acompanantes || 0) : 0,
        fecha_confirmacion: new Date().toISOString(),
        comentario: comentario || "",
        recordatorio_enviado: false
      };

      if (existingIndex >= 0) {
        confirmaciones[existingIndex] = newConfirmacion;
      } else {
        confirmaciones.push(newConfirmacion);
      }

      return await base44.entities.Event.update(event.id, {
        ...event,
        confirmaciones
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setConfirmedResponse(variables.confirmacion);
      setShowThankYou(true);
      setShowRSVPDialog(false);
    },
  });

  const myPlayersSports = user ? (() => {
    const sports = new Set();
    const myPlayers = players.filter(p => 
      p.email_padre === user.email || 
      p.email_tutor_2 === user.email
    );
    myPlayers.forEach(p => sports.add(p.deporte));
    return [...sports];
  })() : [];

  const today = new Date().toISOString().split('T')[0];
  const eventsWithRSVP = events.filter(e => 
    e.publicado && 
    e.fecha >= today &&
    (e.destinatario_categoria === "Todos" || myPlayersSports.includes(e.destinatario_categoria) || e.deporte === "Todos" || myPlayersSports.includes(e.deporte))
  );
  
  // TODOS los eventos publicados (con o sin RSVP) - incluye eventos informativos
  const allPublishedEvents = events.filter(e => 
    e.publicado && 
    e.fecha >= today &&
    (e.destinatario_categoria === "Todos" || myPlayersSports.includes(e.destinatario_categoria) || e.deporte === "Todos" || myPlayersSports.includes(e.deporte))
  );

  const handleOpenRSVP = (event) => {
    const myConfirmation = event.confirmaciones?.find(c => c.usuario_email === user?.email);
    
    // Si ya confirmó, mostrar mensaje de agradecimiento directamente
    if (myConfirmation && myConfirmation.confirmacion !== "pendiente") {
      setSelectedEvent(event);
      setConfirmedResponse(myConfirmation.confirmacion);
      setShowThankYou(true);
      setShowRSVPDialog(true);
      return;
    }
    
    // Si no ha confirmado, mostrar el formulario
    setSelectedEvent(event);
    setRsvpData({
      confirmacion: "pendiente",
      num_acompanantes: 0,
      comentario: ""
    });
    setShowRSVPDialog(true);
  };

  const handleSubmitRSVP = () => {
    if (!selectedEvent) return;
    updateRSVPMutation.mutate({
      event: selectedEvent,
      confirmacion: rsvpData.confirmacion,
      num_acompanantes: parseInt(rsvpData.num_acompanantes) || 0,
      comentario: rsvpData.comentario
    });
  };

  const getMyConfirmation = (event) => {
    return event.confirmaciones?.find(c => c.usuario_email === user?.email);
  };

  const getEventStats = (event) => {
    const confirmaciones = event.confirmaciones || [];
    const asistire = confirmaciones.filter(c => c.confirmacion === "asistire").length;
    const totalAcompanantes = confirmaciones
      .filter(c => c.confirmacion === "asistire")
      .reduce((sum, c) => sum + (c.num_acompanantes || 0), 0);
    return { asistire, totalAcompanantes, total: asistire + totalAcompanantes };
  };

  const handleDownloadCalendar = (event) => {
    try {
      const eventDate = new Date(event.fecha);
      const [hours, minutes] = (event.hora || "10:00").split(':').map(Number);
      eventDate.setHours(hours, minutes, 0);
      
      const endDate = new Date(eventDate);
      endDate.setHours(endDate.getHours() + 2);
      
      const formatICSDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}${month}${day}T${hour}${minute}00`;
      };

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//CD Bustarviejo//ES',
        'BEGIN:VEVENT',
        `DTSTART:${formatICSDate(eventDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:${event.titulo}`,
        `DESCRIPTION:${(event.descripcion || '').replace(/\n/g, '\\n')}`,
        `LOCATION:${event.ubicacion || ''}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${event.titulo.replace(/[^a-z0-9]/gi, '_')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Evento descargado - Ábrelo para añadirlo a tu calendario");
    } catch (error) {
      toast.error("Error al exportar evento");
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Eventos del Club</h1>
        <p className="text-slate-600 mt-1">Confirma tu asistencia a los eventos</p>
      </div>

      {allPublishedEvents.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">No hay eventos próximos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {allPublishedEvents.map(event => {
            const myConfirmation = getMyConfirmation(event);
            const stats = getEventStats(event);
            const confirmationStatus = myConfirmation?.confirmacion || "pendiente";
            const statusConfig = {
              pendiente: { icon: HelpCircle, color: "bg-slate-400", label: "Sin confirmar" },
              asistire: { icon: CheckCircle2, color: "bg-green-600", label: "Asistiré" },
              no_asistire: { icon: XCircle, color: "bg-red-600", label: "No asistiré" },
              quizas: { icon: HelpCircle, color: "bg-yellow-600", label: "Quizás" }
            };
            const config = statusConfig[confirmationStatus];
            const Icon = config.icon;

            return (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={event.importante ? "bg-red-600" : "bg-orange-600"}>
                          {event.tipo}
                        </Badge>
                        <Badge className={config.color}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{event.titulo}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadCalendar(event)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Añadir a mi calendario"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {event.requiere_confirmacion && (
                        <Button 
                         onClick={() => handleOpenRSVP(event)}
                         className={myConfirmation && myConfirmation.confirmacion !== "pendiente" ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                         {myConfirmation && myConfirmation.confirmacion !== "pendiente" ? "Ver mi respuesta" : "Confirmar"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {event.descripcion && (
                    <p className="text-sm text-slate-600">{event.descripcion}</p>
                  )}
                  
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
                  </div>

                  {event.precio && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      💰 Precio: {event.precio}€
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <EventCapacityBar event={event} stats={stats} />
                  </div>

                  {myConfirmation?.comentario && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-slate-600">
                        <strong>Tu comentario:</strong> "{myConfirmation.comentario}"
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showRSVPDialog} onOpenChange={(open) => {
        if (!open) {
          setShowThankYou(false);
          setConfirmedResponse(null);
        }
        setShowRSVPDialog(open);
      }}>
        <DialogContent>
          {showThankYou ? (
            <div className="py-8 text-center space-y-6">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-green-800">¡Muchas Gracias!</h2>
                <p className="text-green-700">
                  {confirmedResponse === "asistire" && "¡Te esperamos! Hemos registrado tu asistencia."}
                  {confirmedResponse === "no_asistire" && "Gracias por avisarnos. ¡Será en otra ocasión!"}
                  {confirmedResponse === "quizas" && "De acuerdo, puedes cambiar tu respuesta cuando lo sepas."}
                </p>
                <p className="text-sm text-slate-600 mt-3">
                  Tu respuesta ya está confirmada para este evento
                </p>
                <div className="flex items-center justify-center gap-2 text-green-600 mt-4">
                  <Heart className="w-4 h-4 fill-current" />
                  <span className="text-sm font-medium">CD Bustarviejo</span>
                  <Heart className="w-4 h-4 fill-current" />
                </div>
              </div>

              <Button 
                onClick={() => {
                  setShowRSVPDialog(false);
                  setShowThankYou(false);
                  setConfirmedResponse(null);
                }}
                className="bg-green-600 hover:bg-green-700 px-8"
              >
                Cerrar
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirmar Asistencia</DialogTitle>
                <DialogDescription>
                  {selectedEvent?.titulo}
                </DialogDescription>
              </DialogHeader>

              {selectedEvent && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      {format(new Date(selectedEvent.fecha), "d 'de' MMMM yyyy", { locale: es })}
                    </div>
                    {selectedEvent.hora && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-600" />
                        {selectedEvent.hora}
                      </div>
                    )}
                    {selectedEvent.ubicacion && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-600" />
                        {selectedEvent.ubicacion}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Tu respuesta *</Label>
                    <RadioGroup value={rsvpData.confirmacion} onValueChange={(value) => setRsvpData({...rsvpData, confirmacion: value})}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-green-50 cursor-pointer">
                        <RadioGroupItem value="asistire" id="asistire" />
                        <Label htmlFor="asistire" className="flex-1 cursor-pointer flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Sí, asistiré
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-red-50 cursor-pointer">
                        <RadioGroupItem value="no_asistire" id="no_asistire" />
                        <Label htmlFor="no_asistire" className="flex-1 cursor-pointer flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-600" />
                          No podré asistir
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-yellow-50 cursor-pointer">
                        <RadioGroupItem value="quizas" id="quizas" />
                        <Label htmlFor="quizas" className="flex-1 cursor-pointer flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-yellow-600" />
                          Aún no lo sé
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {rsvpData.confirmacion === "asistire" && (
                    <div className="space-y-2">
                      <Label htmlFor="acompanantes">¿Traerás acompañantes?</Label>
                      <Input
                        id="acompanantes"
                        type="number"
                        min="0"
                        max="5"
                        value={rsvpData.num_acompanantes}
                        onChange={(e) => setRsvpData({...rsvpData, num_acompanantes: e.target.value})}
                      />
                      <p className="text-xs text-slate-500">Número de personas adicionales que te acompañarán</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="comentario">Comentario (opcional)</Label>
                    <Textarea
                      id="comentario"
                      placeholder="Alguna observación o comentario..."
                      value={rsvpData.comentario}
                      onChange={(e) => setRsvpData({...rsvpData, comentario: e.target.value})}
                      rows={3}
                    />
                  </div>

                  {selectedEvent.capacidad_maxima && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-900">
                        Capacidad limitada: {getEventStats(selectedEvent).total}/{selectedEvent.capacidad_maxima} plazas ocupadas
                      </p>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRSVPDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmitRSVP}
                  disabled={updateRSVPMutation.isPending || !['asistire','no_asistire','quizas'].includes(rsvpData.confirmacion)}
                >
                  Confirmar Respuesta
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}