import React, { useState } from 'react';
import { FileText, Download, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const MANUALS = [
  {
    id: 'parents',
    title: '👨‍👩‍👧 Manual para Padres',
    description: 'Guía completa con todo lo que necesitas saber como padre/madre en la app',
    sections: 14,
    icon: '📱',
    color: 'from-orange-500 to-orange-600',
    status: 'Disponible'
  },
  {
    id: 'coaches',
    title: '⚽ Manual para Entrenadores',
    description: 'Gestión de entrenamientos, convocatorias y reportes de jugadores',
    sections: 12,
    icon: '📊',
    color: 'from-blue-500 to-blue-600',
    status: 'Próximamente'
  },
  {
    id: 'coordinators',
    title: '🎯 Manual para Coordinadores',
    description: 'Comunicación con padres, gestión de eventos y coordinación general',
    sections: 11,
    icon: '💼',
    color: 'from-purple-500 to-purple-600',
    status: 'Próximamente'
  },
  {
    id: 'admins',
    title: '⚙️ Manual para Administradores',
    description: 'Gestión completa del club, configuración y reportes financieros',
    sections: 15,
    icon: '🔧',
    color: 'from-red-500 to-red-600',
    status: 'Próximamente'
  },
  {
    id: 'players',
    title: '🎮 Manual para Jugadores',
    description: 'Tu rol como jugador, acceso a evaluaciones y logros',
    sections: 8,
    icon: '⭐',
    color: 'from-green-500 to-green-600',
    status: 'Próximamente'
  },
  {
    id: 'treasurers',
    title: '💰 Manual para Tesoreros',
    description: 'Gestión de pagos, presupuestos y reconciliación bancaria',
    sections: 13,
    icon: '📈',
    color: 'from-yellow-500 to-yellow-600',
    status: 'Próximamente'
  }
];

export default function ManualsDownload() {
  const [downloading, setDownloading] = useState(null);

  const handleDownload = async (manualId) => {
    if (manualId !== 'parents') {
      toast.info('Este manual aún no está disponible. ¡Pronto!');
      return;
    }

    setDownloading(manualId);
    try {
      const response = await base44.functions.invoke('generateParentManual');
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Manual_Padres_CD_Bustarviejo.pdf';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success('Manual descargado correctamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al descargar el manual');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex justify-center mb-4">
            <FileText className="w-16 h-16 text-orange-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            📚 Manuales y Guías
          </h1>
          <p className="text-xl text-slate-600">
            Descarga las guías completas para entender la app según tu rol
          </p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-8 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Los manuales incluyen instrucciones paso a paso, captura de pantallas reales y respuestas a las preguntas más frecuentes. Perfecto para compartir por WhatsApp.
          </AlertDescription>
        </Alert>

        {/* Manual Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MANUALS.map((manual) => (
            <Card 
              key={manual.id} 
              className={`hover:shadow-lg transition-all duration-300 ${
                manual.status === 'Próximamente' ? 'opacity-60' : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl">{manual.icon}</div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    manual.status === 'Disponible' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {manual.status}
                  </span>
                </div>
                <CardTitle className="text-xl">{manual.title}</CardTitle>
                <CardDescription>{manual.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center text-sm text-slate-600">
                  <FileText className="w-4 h-4 mr-2" />
                  {manual.sections} secciones
                </div>
                
                <Button
                  onClick={() => handleDownload(manual.id)}
                  disabled={downloading === manual.id || manual.status === 'Próximamente'}
                  className={`w-full ${
                    manual.status === 'Disponible'
                      ? 'bg-gradient-to-r ' + manual.color + ' hover:shadow-lg'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {downloading === manual.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Descargando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      {manual.status === 'Disponible' ? 'Descargar PDF' : 'Próximamente'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tips Section */}
        <div className="mt-12 bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">💡 Consejos para usar los manuales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">📱 En el móvil</h3>
              <p className="text-slate-600">
                Abre el PDF en tu aplicación de lectura favorita. Puedes hacer zoom para leer con facilidad.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">📤 Compartir por WhatsApp</h3>
              <p className="text-slate-600">
                Abre WhatsApp, busca el grupo y comparte el PDF. ¡Así todos acceden a la información!
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">🖨️ Imprimir</h3>
              <p className="text-slate-600">
                Si lo prefieres, puedes imprimir el manual para tener una copia física. Es muy útil.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">📖 Lectura rápida</h3>
              <p className="text-slate-600">
                Usa el índice para ir directo a la sección que necesitas sin leer todo el manual.
              </p>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-8 bg-orange-50 border border-orange-200 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-orange-900 mb-3">
            ¿Todavía tienes dudas?
          </h3>
          <p className="text-orange-800 mb-4">
            Contacta con el coordinador de tu categoría a través del chat de la app
          </p>
          <Button className="bg-orange-600 hover:bg-orange-700">
            Ir al Chat
          </Button>
        </div>
      </div>
    </div>
  );
}