import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Play, Pause, Settings, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const AUTOMATION_ACTIONS = [
  {
    id: 'auto-payment-reminder',
    title: '💳 Recordatorio de Pagos Automático',
    description: 'Enviar email a padres con pagos pendientes después de 5 días',
    icon: '📧',
    enabled: true,
    lastRun: '2 horas',
    nextRun: 'Cada 24h'
  },
  {
    id: 'inactive-user-alert',
    title: '👤 Alerta Usuarios Inactivos',
    description: 'Crear alert cuando admin no accede por 30 días',
    icon: '⚠️',
    enabled: true,
    lastRun: '1 día',
    nextRun: 'Cada 24h'
  },
  {
    id: 'failed-payment-escalate',
    title: '🔴 Escalar Pagos Fallidos',
    description: 'Enviar a tesorero cuando hay >5 pagos fallidos',
    icon: '📤',
    enabled: true,
    lastRun: '4 horas',
    nextRun: 'Cada 6h'
  },
  {
    id: 'slow-page-investigation',
    title: '⚡ Investigar Páginas Lentas',
    description: 'Crear ticket cuando página tarda >5 segundos',
    icon: '🔍',
    enabled: false,
    lastRun: 'nunca',
    nextRun: 'Inactivo'
  },
  {
    id: 'chat-unread-cleanup',
    title: '💬 Limpiar Chats Sin Leer',
    description: 'Archivar mensajes sin leer después de 60 días',
    icon: '📦',
    enabled: true,
    lastRun: '5 horas',
    nextRun: 'Cada 48h'
  },
  {
    id: 'daily-digest',
    title: '📊 Resumen Diario Automático',
    description: 'Enviar digest de alertas cada mañana a las 9am',
    icon: '📨',
    enabled: true,
    lastRun: 'Hoy 9:00',
    nextRun: 'Mañana 9:00'
  }
];

export default function AutomationActions() {
  const [automations, setAutomations] = useState(AUTOMATION_ACTIONS);
  const [executing, setExecuting] = useState(null);

  const toggleAutomation = async (id) => {
    setAutomations(prev =>
      prev.map(auto =>
        auto.id === id ? { ...auto, enabled: !auto.enabled } : auto
      )
    );
  };

  const executeNow = async (id) => {
    setExecuting(id);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAutomations(prev =>
        prev.map(auto =>
          auto.id === id ? { ...auto, lastRun: 'Hace unos segundos' } : auto
        )
      );
    } finally {
      setExecuting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>⚙️ Automatizaciones</span>
          <Badge variant="outline">6 activas</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {automations.map((auto, idx) => (
          <motion.div
            key={auto.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{auto.icon}</span>
                  <h4 className="font-semibold text-slate-900">{auto.title}</h4>
                  {auto.enabled && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                </div>
                <p className="text-xs text-slate-600 mt-1">{auto.description}</p>
              </div>
              <Switch
                checked={auto.enabled}
                onCheckedChange={() => toggleAutomation(auto.id)}
                className="ml-2"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t">
              <div className="flex gap-3">
                <span>⏱️ Último: {auto.lastRun}</span>
                <span>📅 Próximo: {auto.nextRun}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => executeNow(auto.id)}
                  disabled={executing === auto.id || !auto.enabled}
                  className="h-7 px-2"
                >
                  {executing === auto.id ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        ))}

        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900">
          💡 <strong>Tip:</strong> Las automatizaciones se ejecutan en segundo plano. Configura alertas para cuando algo falle.
        </div>
      </CardContent>
    </Card>
  );
}