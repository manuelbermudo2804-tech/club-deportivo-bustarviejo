import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import FeedbackForm from '../components/feedback/FeedbackForm';
import { MessageCircle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UserFeedback() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: feedbacks = [], isLoading, refetch } = useQuery({
    queryKey: ['myFeedbacks'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      return await base44.entities.Feedback.filter(
        { usuario_email: currentUser.email },
        '-created_date',
        50
      );
    }
  });

  const getStatusIcon = (estado) => {
    switch (estado) {
      case 'Completado':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'En Proceso':
      case 'En Revisión':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'Rechazado':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <MessageCircle className="w-5 h-5 text-orange-600" />;
    }
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'Completado':
        return 'bg-green-100 text-green-800';
      case 'En Proceso':
        return 'bg-blue-100 text-blue-800';
      case 'En Revisión':
        return 'bg-purple-100 text-purple-800';
      case 'Rechazado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-orange-100 text-orange-800';
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'Bug':
        return '🐛';
      case 'Sugerencia':
        return '💡';
      case 'Pregunta':
        return '❓';
      default:
        return '📝';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Retroalimentación</h1>
          <p className="text-slate-600 mt-1">
            Ayúdanos a mejorar reportando bugs o sugiriendo nuevas funcionalidades
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-orange-600 to-orange-700"
        >
          {showForm ? 'Ver Mis Envíos' : '+ Nueva Retroalimentación'}
        </Button>
      </div>

      {showForm ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Enviar Retroalimentación</CardTitle>
              <CardDescription>
                Cuéntanos qué podemos mejorar o qué problema has encontrado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeedbackForm
                onSuccess={() => {
                  setShowForm(false);
                  refetch();
                }}
              />
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {feedbacks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Aún no has enviado ninguna retroalimentación
                </h3>
                <p className="text-slate-600 mb-4">
                  Ayúdanos a mejorar la app compartiendo tus ideas o reportando problemas
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-orange-600 to-orange-700"
                >
                  Enviar Primera Retroalimentación
                </Button>
              </CardContent>
            </Card>
          ) : (
            feedbacks.map((feedback) => (
              <motion.div
                key={feedback.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-3xl">{getTipoIcon(feedback.tipo)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-xl">{feedback.titulo}</CardTitle>
                            <Badge className={getStatusColor(feedback.estado)}>
                              {feedback.estado}
                            </Badge>
                            <Badge variant="outline">{feedback.tipo}</Badge>
                            {feedback.categoria !== 'General' && (
                              <Badge variant="outline">{feedback.categoria}</Badge>
                            )}
                          </div>
                          <CardDescription>
                            Enviado el {new Date(feedback.created_date).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusIcon(feedback.estado)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-slate-700 whitespace-pre-wrap">{feedback.descripcion}</p>
                    </div>

                    {feedback.capturas && feedback.capturas.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {feedback.capturas.map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={url}
                              alt={`Captura ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg hover:opacity-75 transition-opacity"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {feedback.respuesta && (
                      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                        <div className="flex items-start gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold text-green-900">Respuesta del Equipo</p>
                            {feedback.fecha_respuesta && (
                              <p className="text-xs text-green-700">
                                {new Date(feedback.fecha_respuesta).toLocaleDateString('es-ES')}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-green-800 whitespace-pre-wrap ml-7">{feedback.respuesta}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}