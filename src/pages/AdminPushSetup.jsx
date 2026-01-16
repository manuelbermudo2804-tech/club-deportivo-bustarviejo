import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPushSetup() {
  const [loading, setLoading] = useState(false);
  const [keys, setKeys] = useState(null);
  const [copied, setCopied] = useState({ public: false, private: false });

  const generateKeys = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateVapidKeys', {});
      setKeys(response.data.keys);
      toast.success('✅ Claves generadas');
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, type) => {
    await navigator.clipboard.writeText(text);
    setCopied({ ...copied, [type]: true });
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopied({ ...copied, [type]: false }), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">⚙️ Configurar Notificaciones Push</h1>

        <Card>
          <CardHeader>
            <CardTitle>Paso 1: Generar claves VAPID</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!keys ? (
              <>
                <p className="text-slate-600">
                  Necesitas generar unas claves para que funcionen las notificaciones push.
                  Solo tienes que hacer clic en este botón:
                </p>
                <Button 
                  onClick={generateKeys} 
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    '🔑 Generar claves VAPID'
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                  <p className="text-green-800 font-bold">✅ ¡Claves generadas!</p>
                  <p className="text-green-700 text-sm mt-1">
                    Ahora copia y pega cada clave en Settings → App Settings → Environment Variables
                  </p>
                </div>

                {/* Clave Pública */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-lg">📍 VAPID_PUBLIC_KEY</label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(keys.publicKey, 'public')}
                      className="gap-2"
                    >
                      {copied.public ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copiar
                    </Button>
                  </div>
                  <div className="bg-slate-900 text-green-400 p-3 rounded-lg font-mono text-xs break-all">
                    {keys.publicKey}
                  </div>
                  <p className="text-sm text-slate-600">
                    👆 Copia esto y reemplaza el valor de <code className="bg-slate-200 px-1 rounded">VAPID_PUBLIC_KEY</code> en Settings
                  </p>
                </div>

                {/* Clave Privada */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-lg">🔐 VAPID_PRIVATE_KEY</label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(keys.privateKey, 'private')}
                      className="gap-2"
                    >
                      {copied.private ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copiar
                    </Button>
                  </div>
                  <div className="bg-slate-900 text-orange-400 p-3 rounded-lg font-mono text-xs break-all">
                    {keys.privateKey}
                  </div>
                  <p className="text-sm text-slate-600">
                    👆 Copia esto y créala como NUEVA en Settings (botón "+ Add variable")
                  </p>
                </div>

                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 space-y-2">
                  <p className="font-bold text-blue-900">📝 Instrucciones:</p>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Haz clic en "Copiar" de cada clave</li>
                    <li>Ve a <strong>Settings → App Settings</strong></li>
                    <li>Scroll hasta <strong>Environment Variables</strong></li>
                    <li>Edita <code>VAPID_PUBLIC_KEY</code> → pega la primera clave</li>
                    <li>Crea <code>VAPID_PRIVATE_KEY</code> → pega la segunda clave</li>
                    <li>¡Listo! El botón "Activar avisos" aparecerá en el menú</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}