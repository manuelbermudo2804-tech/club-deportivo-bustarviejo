import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, MapPin, Clock, Mail, Bell, CheckCircle2, XCircle, HelpCircle, AlertTriangle, Download, Plus, Edit, Trash2, Eye, Copy, Bookmark } from "lucide-react";
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
import CalendarSyncButton from "../components/calendar/CalendarSyncButton";
import EventCapacityBar from "../components/events/EventCapacityBar";

export default function EventManagement() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin" || currentUser.es_coordinador === true || currentUser.es_entrenador === true);
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

  const { data: templates } = useQuery({
    queryKey: ['eventTemplates'],
    queryFn: () => base44.entities.EventTemplate.list('-created_date'),
    initialData: [],
  });

  // Crear plantillas fijas anuales si no existen
  useEffect(() => {
    const createDefaultTemplates = async () => {
      if (!isAdmin || templates.length > 0) return;
      
      const defaultTemplates = [
        { nombre: "INSCRIPCIONES Y PEDIDOS ROPA", titulo: "Apertura Inscripciones y Pedidos Ropa", tipo: "Inscripción", mes: 6, dia: 1, importante: true, color: "green" },
        { nombre: "FIESTA CLUB", titulo: "Fiesta del Club", tipo: "Fiesta Club", mes: 6, dia: 15, importante: true, color: "purple" },
        { nombre: "INSCRIPCION EQUIPOS FEDERACION", titulo: "Inscripción Equipos en Federación", tipo: "Gestión Club", mes: 6, dia: 20, importante: true, color: "blue" },
        { nombre: "PAGO INSCRIPCION", titulo: "Fecha Límite Pago Inscripción", tipo: "Pago", mes: 6, dia: 30, importante: true, color: "red" },
        { nombre: "PEDIDO DE ROPA", titulo: "Cierre Pedidos de Ropa", tipo: "Pedido Ropa", mes: 7, dia: 7, importante: true, color: "orange" },
        { nombre: "TRAMITACION FICHAS FEDERATIVAS", titulo: "Tramitación Fichas Federativas", tipo: "Gestión Club", mes: 7, dia: 15, importante: true, color: "blue" },
        { nombre: "INICIO ENTRENAMIENTOS AFICIONADO Y JUVENIL", titulo: "Inicio Entrenamientos Aficionado y Juvenil", tipo: "Inicio Temporada", mes: 8, dia: 1, importante: true, color: "green" },
        { nombre: "CHEQUEO INSCRIPCIONES AGOSTO", titulo: "Chequeo Inscripciones y Pedidos Ropa", tipo: "Gestión Club", mes: 8, dia: 7, importante: false, color: "yellow" },
        { nombre: "INICIO COMPETICION", titulo: "Inicio Competición Aficionados y Entrenamientos Resto", tipo: "Inicio Temporada", mes: 9, dia: 1, importante: true, color: "green" },
        { nombre: "SEGUNDO PAGO", titulo: "Fecha Límite Segundo Pago", tipo: "Pago", mes: 9, dia: 15, importante: true, color: "red" },
        { nombre: "CHEQUEO INSCRIPCIONES OCTUBRE", titulo: "Chequeo Inscripciones y Pedidos Ropa", tipo: "Gestión Club", mes: 10, dia: 7, importante: false, color: "yellow" },
        { nombre: "TERCER PAGO", titulo: "Fecha Límite Tercer Pago", tipo: "Pago", mes: 12, dia: 15, importante: true, color: "red" },
        { nombre: "FIN COMPETICION", titulo: "Fin de Competición", tipo: "Fin Temporada", mes: 5, dia: 30, importante: true, color: "purple" }
      ];

      for (const tmpl of defaultTemplates) {
        await base44.entities.EventTemplate.create({
          nombre_plantilla: tmpl.nombre,
          titulo: tmpl.titulo,
          descripcion: "",
          tipo: tmpl.tipo,
          deporte: "Todos",
          categoria: "Todas",
          mes_tipico: tmpl.mes,
          hora: "",
          ubicacion: "",
          importante: tmpl.importante,
          color: tmpl.color,
          requiere_confirmacion: false,
          activa: true,
          es_plantilla_anual: true
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['eventTemplates'] });
    };

    if (isAdmin) {
      createDefaultTemplates();
    }
  }, [isAdmin, templates.length]);

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

  const saveAsTemplateMutation = useMutation({
    mutationFn: async ({ event, name }) => {
      const eventDate = new Date(event.fecha);
      const templateData = {
        nombre_plantilla: name,
        titulo: event.titulo,
        descripcion: event.descripcion,
        tipo: event.tipo,
        deporte: event.deporte,
        categoria: event.categoria,
        mes_tipico: eventDate.getMonth() + 1,
        dia_semana_preferido: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][eventDate.getDay()],
        hora: event.hora,
        hora_fin: event.hora_fin,
        ubicacion: event.ubicacion,
        ubicacion_url: event.ubicacion_url,
        importante: event.importante,
        color: event.color,
        requiere_confirmacion: event.requiere_confirmacion,
        capacidad_maxima: event.capacidad_maxima,
        precio: event.precio,
        activa: true
      };
      return await base44.entities.EventTemplate.create(templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTemplates'] });
      setShowTemplateDialog(false);
      setTemplateName("");
      setSelectedEvent(null);
      toast.success("📋 Plantilla guardada");
    },
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async ({ template, fecha }) => {
      const eventData = {
        titulo: template.titulo,
        descripcion: template.descripcion,
        tipo: template.tipo,
        deporte: template.deporte,
        categoria: template.categoria,
        fecha: fecha,
        hora: template.hora,
        hora_fin: template.hora_fin,
        ubicacion: template.ubicacion,
        ubicacion_url: template.ubicacion_url,
        importante: template.importante,
        color: template.color,
        requiere_confirmacion: template.requiere_confirmacion,
        capacidad_maxima: template.capacidad_maxima,
        precio: template.precio,
        publicado: true,
        es_automatico: false,
        notificado: false,
        confirmaciones: []
      };
      return await base44.entities.Event.create(eventData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("✅ Evento creado desde plantilla");
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.EventTemplate.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTemplates'] });
      toast.success("🗑️ Plantilla eliminada");
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

  const handleDuplicate = (event) => {
    setEditingEvent({
      ...event,
      fecha: new Date().toISOString().split('T')[0],
      confirmaciones: []
    });
    setShowForm(true);
  };

  const handleSaveAsTemplate = (event) => {
    setSelectedEvent(event);
    setShowTemplateDialog(true);
  };

  const handleCreateFromTemplate = (template) => {
    const today = new Date();
    const suggestedDate = new Date(today.getFullYear(), template.mes_tipico - 1, 15);
    const dateStr = suggestedDate.toISOString().split('T')[0];
    
    const confirmDate = prompt(
      `Crear evento "${template.titulo}" para la fecha (formato: YYYY-MM-DD):`,
      dateStr
    );
    
    if (confirmDate) {
      createFromTemplateMutation.mutate({ template, fecha: confirmDate });
    }
  };

  const handleDeleteTemplate = (template) => {
    if (window.confirm(`¿Eliminar plantilla "${template.nombre_plantilla}"?`)) {
      deleteTemplateMutation.mutate(template.id);
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
    toast.success("📥 CSV descargado");
  };

  const exportAttendeesPDF = (event) => {
    const confirmed = event.confirmaciones?.filter(c => c.confirmacion === "asistire") || [];
    const allResponses = event.confirmaciones || [];
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Asistentes - ${event.titulo}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #ea580c; border-bottom: 3px solid #16a34a; padding-bottom: 10px; }
    .info { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #ea580c; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    tr:hover { background: #fef3c7; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; }
    @media print {
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>📋 Lista de Asistentes - ${event.titulo}</h1>
  <div class="info">
    <p><strong>📅 Fecha:</strong> ${format(new Date(event.fecha), "d 'de' MMMM yyyy", { locale: es })}</p>
    <p><strong>🕐 Hora:</strong> ${event.hora || 'Por confirmar'}</p>
    <p><strong>📍 Lugar:</strong> ${event.ubicacion || 'Por confirmar'}</p>
    <p><strong>✅ Total confirmados:</strong> ${confirmed.length} personas (+ ${confirmed.reduce((sum, c) => sum + (c.num_acompanantes || 0), 0)} acompañantes)</p>
  </div>

  <h2>✅ Confirman Asistencia (${confirmed.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Email</th>
        <th>Acompañantes</th>
        <th>Fecha Confirmación</th>
        <th>Comentario</th>
      </tr>
    </thead>
    <tbody>
      ${confirmed.map(c => `
        <tr>
          <td>${c.usuario_nombre}</td>
          <td>${c.usuario_email}</td>
          <td style="text-align: center;">${c.num_acompanantes || 0}</td>
          <td>${format(new Date(c.fecha_confirmacion), "dd/MM/yyyy HH:mm")}</td>
          <td><em>${c.comentario || '-'}</em></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2 style="margin-top: 40px;">📊 Todas las Respuestas (${allResponses.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Email</th>
        <th>Respuesta</th>
        <th>Fecha</th>
      </tr>
    </thead>
    <tbody>
      ${allResponses.map(c => {
        const statusEmoji = {asistire: '✅', no_asistire: '❌', quizas: '❓', pendiente: '⏳'}[c.confirmacion];
        const statusText = {asistire: 'Asistiré', no_asistire: 'No asistiré', quizas: 'Quizás', pendiente: 'Pendiente'}[c.confirmacion];
        return `
        <tr>
          <td>${c.usuario_nombre}</td>
          <td>${c.usuario_email}</td>
          <td>${statusEmoji} ${statusText}</td>
          <td>${format(new Date(c.fecha_confirmacion), "dd/MM/yyyy HH:mm")}</td>
        </tr>
      `}).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p><strong>CD Bustarviejo</strong></p>
    <p>Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm")}</p>
  </div>

  <button onclick="window.print()" style="position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #ea580c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
    🖨️ Imprimir / Guardar PDF
  </button>
</body>
</html>
    `;

    const newWindow = window.open('', '_blank');
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    toast.success("📄 PDF abierto en nueva ventana");
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(e => e.fecha >= today && (isAdmin || e.publicado)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pastEvents = events.filter(e => e.fecha < today && (isAdmin || e.publicado)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const eventosConRSVP = upcomingEvents.filter(e => e.requiere_confirmacion);

  // Verificar qué plantillas anuales necesitan actualización
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const templatesNeedingUpdate = templates.filter(tmpl => {
    if (!tmpl.es_plantilla_anual) return false;
    
    // Verificar si ya existe un evento creado este año para esta plantilla
    const eventThisYear = events.find(e => {
      const eventYear = new Date(e.fecha).getFullYear();
      return e.titulo === tmpl.titulo && eventYear === currentYear;
    });
    
    // Si no existe evento para este año Y el mes ya pasó o es el mes actual, necesita actualización
    if (!eventThisYear && tmpl.mes_tipico <= currentMonth + 1) {
      return true;
    }
    
    return false;
  });

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
              <p className="text-red-700">Solo administradores, coordinadores y entrenadores pueden gestionar eventos.</p>
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

      {/* Banner de recordatorio de plantillas anuales */}
      {templatesNeedingUpdate.length > 0 && (
        <Card className="border-2 border-orange-400 bg-gradient-to-r from-orange-50 to-red-50 animate-pulse">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-orange-900 text-lg mb-2">
                  ⚠️ Eventos Anuales Pendientes de Actualizar
                </h3>
                <p className="text-sm text-orange-800 mb-3">
                  Las siguientes plantillas anuales necesitan fechas actualizadas para este año:
                </p>
                <div className="grid md:grid-cols-2 gap-2">
                  {templatesNeedingUpdate.map(tmpl => (
                    <div key={tmpl.id} className="bg-white rounded-lg p-3 border border-orange-200">
                      <p className="font-semibold text-slate-900 text-sm">{tmpl.titulo}</p>
                      <p className="text-xs text-slate-600">Mes típico: {tmpl.mes_tipico}</p>
                      <Button
                        size="sm"
                        onClick={() => handleCreateFromTemplate(tmpl)}
                        className="mt-2 w-full bg-orange-600 hover:bg-orange-700"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Crear para {currentYear}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Plantillas ({templates.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Próximos ({upcomingEvents.length})</TabsTrigger>
          <TabsTrigger value="rsvp">Con RSVP ({eventosConRSVP.length})</TabsTrigger>
          <TabsTrigger value="past">Pasados ({pastEvents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Bookmark className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Plantillas de Eventos</h3>
                  <p className="text-sm text-blue-700">
                    Guarda eventos como plantillas para crearlos fácilmente cada año. Puedes ajustar las fechas según el calendario.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Bookmark className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No hay plantillas guardadas</p>
                <p className="text-sm text-slate-400">
                  Crea un evento y guárdalo como plantilla usando el botón "Guardar como plantilla"
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {templates.filter(t => t.activa).map(template => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow border-blue-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-600">
                            <Bookmark className="w-3 h-3 mr-1" />
                            Plantilla
                          </Badge>
                          <Badge variant="outline">{template.tipo}</Badge>
                          {template.importante && <Badge className="bg-red-600">Importante</Badge>}
                        </div>
                        <CardTitle className="text-xl">{template.nombre_plantilla}</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">{template.titulo}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleCreateFromTemplate(template)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Crear
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTemplate(template)}
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
                        <Calendar className="w-4 h-4 text-blue-600" />
                        {template.mes_tipico && `Mes ${template.mes_tipico}`} • {template.dia_semana_preferido}
                      </div>
                      {template.hora && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Clock className="w-4 h-4 text-blue-600" />
                          {template.hora}
                        </div>
                      )}
                      {template.ubicacion && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          {template.ubicacion}
                        </div>
                      )}
                      {template.deporte && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <span>🏃</span>
                          {template.deporte} - {template.categoria}
                        </div>
                      )}
                    </div>
                    {template.descripcion && (
                      <p className="text-sm text-slate-600">{template.descripcion}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

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
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicate(event)}
                            title="Duplicar evento"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveAsTemplate(event)}
                            title="Guardar como plantilla"
                          >
                            <Bookmark className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingEvent(event);
                              setShowForm(true);
                            }}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(event)}
                            className="text-red-600 hover:bg-red-50"
                            title="Eliminar"
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

                      <div className="border-t pt-3">
                        <CalendarSyncButton 
                          event={event} 
                          onSyncComplete={() => queryClient.invalidateQueries({ queryKey: ['events'] })}
                        />
                      </div>

                      {event.requiere_confirmacion && (
                        <div className="border-t pt-3 space-y-4">
                          <EventCapacityBar event={event} stats={stats} />
                          
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
                          
                          <div className="flex gap-2 mt-3">
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => exportAttendees(event)}
                             className="flex-1"
                           >
                             <Download className="w-4 h-4 mr-2" />
                             CSV
                           </Button>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => exportAttendeesPDF(event)}
                             className="flex-1"
                           >
                             <Download className="w-4 h-4 mr-2" />
                             PDF
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

      {/* Dialog para guardar plantilla */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar como Plantilla</DialogTitle>
            <DialogDescription>
              Esta plantilla te permitirá crear el mismo evento cada año ajustando solo la fecha
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Nombre de la plantilla</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="ej: Cena de Navidad, Torneo Primavera..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            {selectedEvent && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-slate-900 mb-1">Vista previa:</p>
                <p className="text-slate-600">• {selectedEvent.titulo}</p>
                <p className="text-slate-600">• {selectedEvent.tipo}</p>
                <p className="text-slate-600">• {selectedEvent.ubicacion}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTemplateDialog(false);
              setTemplateName("");
              setSelectedEvent(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (!templateName.trim()) {
                  toast.error("Escribe un nombre para la plantilla");
                  return;
                }
                saveAsTemplateMutation.mutate({ event: selectedEvent, name: templateName });
              }}
              disabled={!templateName.trim() || saveAsTemplateMutation.isPending}
            >
              Guardar Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <>
                <Button variant="outline" onClick={() => exportAttendees(selectedEvent)}>
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button onClick={() => exportAttendeesPDF(selectedEvent)}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}