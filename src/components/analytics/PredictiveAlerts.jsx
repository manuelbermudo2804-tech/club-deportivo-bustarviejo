import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PredictiveAlerts() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Analiza estos datos y predice problemas potenciales:
          - Sistema de pagos: 12% de fallos en últimas 24h
          - Usuarios inactivos: 23% sin actividad hace 30 días
          - Chat sin leer: 156 mensajes acumulados
          - Performance: Página de pagos con 4.2s promedio
          - Errores de integración: 5 fallos en últimas 6 horas
          
          Genera 3-4 predicciones de problemas que podrían ocurrir en las próximas 48-72h.
          Formato JSON con: titulo, descripcion, probabilidad (0-100), impacto, recomendacion`,
          response_json_schema: {
            type: 'object',
            properties: {
              predictions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    titulo: { type: 'string' },
                    descripcion: { type: 'string' },
                    probabilidad: { type: 'number' },
                    impacto: { type: 'string' },
                    recomendacion: { type: 'string' }
                  }
                }
              }
            }
          }
        });

        setPredictions(response.predictions || []);
      } catch (error) {
        console.error('Error fetching predictions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  if (loading) return <div className="p-4">Analizando datos...</div>;

  return (
    <Card className="border-2 border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔮 Predicciones IA (próximas 48-72h)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {predictions.map((pred, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-4 bg-white rounded-lg border border-purple-200 space-y-2"
          >
            <div className="flex items-start justify-between">
              <h4 className="font-bold text-slate-900">{pred.titulo}</h4>
              <Badge className={`${
                pred.probabilidad > 70 ? 'bg-red-500' : 
                pred.probabilidad > 40 ? 'bg-orange-500' : 
                'bg-yellow-500'
              }`}>
                {pred.probabilidad}% riesgo
              </Badge>
            </div>
            
            <p className="text-sm text-slate-600">{pred.descripcion}</p>
            
            <div className="flex gap-2 text-xs">
              <span className={`px-2 py-1 rounded ${
                pred.impacto === 'critical' ? 'bg-red-100 text-red-700' :
                pred.impacto === 'high' ? 'bg-orange-100 text-orange-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                Impacto: {pred.impacto}
              </span>
            </div>

            <div className="p-2 bg-purple-100 rounded text-xs text-purple-900">
              <strong>💡 Recomendación:</strong> {pred.recomendacion}
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}