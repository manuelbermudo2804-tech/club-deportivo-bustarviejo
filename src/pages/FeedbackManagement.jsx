import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle, CheckCircle, Clock, AlertCircle, Eye, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function FeedbackManagement() {
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const queryClient = useQueryClient();

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['allFeedbacks'],
    queryFn: async () => {
      return await base44.entities.Feedback.list('-created_date', 100);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Feedback.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allFeedbacks']);
      toast.success('Feedback actualizado');
    }
  });

  const convertToTaskMutation = useMutation({
    mutationFn: async (feedback) => {
      const task = await base44.entities.BoardTask.create({
        titulo: feedback.titulo,
        descripcion: `${feedback.descripcion}\n\n---\nOriginal de: ${feedback.usuario_nombre}\nTipo: ${feedback.tipo}\nCategoría: ${feedback.categoria}`,
        estado: 'Por Hacer',
        prioridad: feedback.prioridad,
        categoria: 'Mejoras App',
        tags: [feedback.tipo, feedback.categoria],
        fecha_limite: null
      });

      await base44.entities.Feedback.update(feedback.id, {
        convertido_a_tarea: true,
        tarea_id: task.id,
        estado: 'En Proceso'
      });

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allFeedbacks']);
      toast.success('Convertido a tarea de la junta');
    }
  });

  const handleRespond = async () => {
    if (!respuesta.trim()) {
      toast.error('Escribe una respuesta');
      return;
    }

    const user = await base44.auth.me();
    
    await updateMutation.mutateAsync({
      id: selectedFeedback.id,
      data: {
        respuesta,
        respondido_por: user.email,
        fecha_respuesta: new Date().toISOString(),
        estado: 'Completado'
      }
    });

    setSelectedFeedback(null);
    setRespuesta('');
  };

  const handleChangeStatus = (feedback, newStatus) => {
    updateMutation.mutate({
      id: feedback.id,
      data: { estado: newStatus }
    });
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    if (filterEstado !== 'all' && f.estado !== filterEstado) return false;
    if (filterTipo !== 'all' && f.tipo !== filterTipo) return false;
    return true;
  });

  const stats = {
    total: feedbacks.length,
    pendientes: feedbacks.filter(f => f.estado === 'Pendiente').length,
    enProceso: feedbacks.filter(f => f.estado === 'En Proceso' || f.estado === 'En Revisión').length,
    completados: feedbacks.filter(f => f.estado === 'Completado').length
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'Bug': return '🐛';
      case 'Sugerencia': return '💡';
      case 'Pregunta': return '❓';
      default: return '📝';
    }
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'Completado': return 'bg-green-100 text-green-800';
      case 'En Proceso': return 'bg-blue-100 text-blue-800';
      case 'En Revisión': return 'bg-purple-100 text-purple-800';
      case 'Rechazado': return 'bg-red-100 text-red-800';
      default: return 'bg-orange-100 text-orange-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestión de Retroalimentación</h1>
        <p className="text-slate-600 mt-1">Revisa y responde al feedback de los usuarios</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{stats.pendientes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">En Proceso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.enProceso}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Completados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.completados}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Pendiente">Pendiente</SelectItem>
            <SelectItem value="En Revisión">En Revisión</SelectItem>
            <SelectItem value="En Proceso">En Proceso</SelectItem>
            <SelectItem value="Completado">Completado</SelectItem>
            <SelectItem value="Rechazado">Rechazado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="Bug">🐛 Bug</SelectItem>
            <SelectItem value="Sugerencia">💡 Sugerencia</SelectItem>
            <SelectItem value="Pregunta">❓ Pregunta</SelectItem>
            <SelectItem value="Otro">📝 Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredFeedbacks.map((feedback) => (
          <Card key={feedback.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-3xl">{getTipoIcon(feedback.tipo)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{feedback.titulo}</CardTitle>
                      <Badge className={getStatusColor(feedback.estado)}>{feedback.estado}</Badge>
                      <Badge variant="outline">{feedback.tipo}</Badge>
                      {feedback.categoria !== 'General' && (
                        <Badge variant="outline">{feedback.categoria}</Badge>
                      )}
                      {feedback.convertido_a_tarea && (
                        <Badge className="bg-purple-100 text-purple-800">Tarea Creada</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      De: <strong>{feedback.usuario_nombre}</strong> ({feedback.usuario_email})
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(feedback.created_date).toLocaleString('es-ES')} • Prioridad: {feedback.prioridad}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFeedback(feedback)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalle
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-slate-700">{feedback.descripcion}</p>
              
              <div className="flex gap-2">
                <Select
                  value={feedback.estado}
                  onValueChange={(value) => handleChangeStatus(feedback, value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="En Revisión">En Revisión</SelectItem>
                    <SelectItem value="En Proceso">En Proceso</SelectItem>
                    <SelectItem value="Completado">Completado</SelectItem>
                    <SelectItem value="Rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>

                {!feedback.convertido_a_tarea && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => convertToTaskMutation.mutate(feedback)}
                  >
                    Convertir a Tarea
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{getTipoIcon(selectedFeedback?.tipo)}</span>
              {selectedFeedback?.titulo}
            </DialogTitle>
          </DialogHeader>
          
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getStatusColor(selectedFeedback.estado)}>
                  {selectedFeedback.estado}
                </Badge>
                <Badge variant="outline">{selectedFeedback.tipo}</Badge>
                <Badge variant="outline">{selectedFeedback.categoria}</Badge>
                <Badge variant="outline">Prioridad: {selectedFeedback.prioridad}</Badge>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">De:</p>
                <p className="font-medium">{selectedFeedback.usuario_nombre}</p>
                <p className="text-sm text-slate-600">{selectedFeedback.usuario_email}</p>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Descripción:</p>
                <p className="text-slate-900 whitespace-pre-wrap">{selectedFeedback.descripcion}</p>
              </div>

              {selectedFeedback.capturas && selectedFeedback.capturas.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600 mb-2">Capturas:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedFeedback.capturas.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={url}
                          alt={`Captura ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg hover:opacity-75"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedFeedback.respuesta ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="font-semibold text-green-900 mb-1">Respuesta enviada</p>
                  <p className="text-sm text-green-700 mb-2">
                    Por {selectedFeedback.respondido_por} el{' '}
                    {new Date(selectedFeedback.fecha_respuesta).toLocaleString('es-ES')}
                  </p>
                  <p className="text-green-800 whitespace-pre-wrap">{selectedFeedback.respuesta}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">Responder al usuario:</p>
                  <Textarea
                    placeholder="Escribe tu respuesta aquí..."
                    value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)}
                    rows={4}
                  />
                  <Button onClick={handleRespond} className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Respuesta y Marcar como Completado
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}