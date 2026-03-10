import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MODULE_CONFIG = {
  accesos: { emoji: '🔑', label: 'Accesos y Onboarding', color: 'red' },
  subidas: { emoji: '📤', label: 'Subidas y Dispositivos', color: 'orange' },
  pagos: { emoji: '💳', label: 'Pagos', color: 'yellow' },
  jugadores: { emoji: '👥', label: 'Jugadores', color: 'blue' },
  socios: { emoji: '🎫', label: 'Socios', color: 'purple' },
  convocatorias: { emoji: '📋', label: 'Convocatorias', color: 'green' },
  comunicacion: { emoji: '💬', label: 'Comunicación', color: 'cyan' },
  integridad: { emoji: '⚙️', label: 'Integridad', color: 'slate' },
};

const STAT_LABELS = {
  totalUsers: 'Usuarios totales',
  codigoValidado: 'Código validado',
  sinValidar: 'Sin validar',
  atascados48h: 'Atascados >48h',
  codigosExpirados: 'Códigos expirados',
  tasaConversionSegundoPadre: 'Conversión 2º padre',
  intentosFallidos: 'Intentos fallidos',
  totalSubidas: 'Total subidas',
  exitosas: 'Exitosas',
  errores: 'Errores',
  tasaFallo: 'Tasa de fallo',
  dispositivosProblematicos: 'Dispositivos con problemas',
  jugadoresSinFoto: 'Sin foto',
  totalPagos: 'Total pagos',
  pendientes: 'Pendientes',
  enRevision: 'En revisión',
  enRevision7dias: 'En revisión >7d',
  huerfanos: 'Huérfanos',
  sinCuotas: 'Sin cuotas',
  duplicados: 'Duplicados',
  importePendiente: 'Importe pendiente (€)',
  totalActivos: 'Activos',
  fichasCompletas: 'Fichas completas',
  porcentajeCompletitud: '% completitud',
  sinFoto: 'Sin foto',
  sinDNI14plus: 'Sin DNI (+14)',
  emailPadreHuerfano: 'Email padre huérfano',
  categoriaInexistente: 'Categoría inexistente',
  pendientesRevision: 'Pendiente revisión',
  totalTemporada: 'Total temporada',
  pagados: 'Pagados',
  sinOrigen: 'Sin origen',
  padresSinHijos: 'Padres sin hijos',
  vencidosActivos: 'Vencidos activos',
  total: 'Total',
  abiertas: 'Abiertas',
  pasadasSinCerrar: 'Pasadas sin cerrar',
  sinRespuestas: 'Sin respuestas',
  anunciosRecientes: 'Anuncios recientes',
  encuestasBajas: 'Encuestas baja participación',
  eventosRSVPbajos: 'Eventos RSVP bajos',
  categoriasVacias: 'Categorías vacías',
  inactivosConPagos: 'Inactivos con pagos',
};

function getColorClasses(color) {
  const map = {
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  };
  return map[color] || map.slate;
}

export default function DiagnosticStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Object.entries(stats).map(([module, moduleStats]) => {
        const config = MODULE_CONFIG[module] || { emoji: '📊', label: module, color: 'slate' };
        if (!moduleStats || typeof moduleStats !== 'object') return null;

        return (
          <Card key={module} className={`border-2 ${getColorClasses(config.color).split(' ').slice(1, 2).join(' ')}`}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span>{config.emoji}</span>
                {config.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {Object.entries(moduleStats).map(([key, value]) => {
                  const isWarning = (key.includes('error') || key.includes('huerfan') || key.includes('duplicad') || key.includes('atascad') || key.includes('sinValidar') || key.includes('sinCuota') || key.includes('sinFoto') || key.includes('sinOrigen')) && value > 0;
                  return (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 truncate mr-2">{STAT_LABELS[key] || key}</span>
                      <span className={`text-sm font-bold tabular-nums ${isWarning ? 'text-red-600' : ''}`}>
                        {typeof value === 'number' && key.includes('importe') ? `${value.toFixed(0)}€` :
                         typeof value === 'number' && key.includes('tasa') ? `${value}%` :
                         typeof value === 'number' && key.includes('porcentaje') ? `${value}%` :
                         value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}