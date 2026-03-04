import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PartyPopper, ArrowRight, Loader2, AlertTriangle, CheckCircle2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AdultTransitionPanel() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const handlePreview = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await base44.functions.invoke('processAdultTransitions', { dry_run: true });
      setPreview(data);
    } catch (err) {
      toast.error("Error al cargar previsualización: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!confirm(`¿Estás seguro? Se procesarán ${preview?.transitions?.length || 0} transiciones de mayores de edad. Se les revocará el acceso juvenil y se les enviará invitación como jugador adulto.`)) return;
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('processAdultTransitions', { dry_run: false });
      setResult(data);
      setPreview(null);
      toast.success(`✅ ${data.processed} transiciones procesadas`);
    } catch (err) {
      toast.error("Error al procesar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-amber-300">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
        <CardTitle className="flex items-center gap-2">
          <PartyPopper className="w-5 h-5 text-amber-600" />
          Transición Mayores de Edad
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            <strong>¿Qué hace?</strong> Detecta jugadores que cumplen 18 para la próxima temporada:
            <ul className="list-disc ml-4 mt-1 space-y-1 text-xs">
              <li>Revoca su acceso juvenil (si lo tenían)</li>
              <li>Les envía invitación como <strong>jugador adulto</strong> a su email</li>
              <li>Notifica a los padres de que ya no gestionan al jugador</li>
              <li>El jugador deberá introducir su nuevo código al abrir la app</li>
            </ul>
          </AlertDescription>
        </Alert>

        {!preview && !result && (
          <Button
            onClick={handlePreview}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCircle className="w-4 h-4 mr-2" />}
            Ver jugadores que cumplen 18
          </Button>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-amber-600 text-white">
                {preview.transitions?.length || 0} jugadores detectados
              </Badge>
              <span className="text-xs text-slate-500">Temporada: {preview.temporada}</span>
            </div>

            {preview.transitions?.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="font-bold text-green-800">No hay transiciones pendientes</p>
                <p className="text-xs text-slate-500">Todos los jugadores que cumplen 18 ya tienen acceso adulto</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {preview.transitions?.map((t, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-amber-200 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{t.nombre}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>🎂 {t.fecha_nacimiento ? format(new Date(t.fecha_nacimiento), "d MMM yyyy", { locale: es }) : "?"}</span>
                          <span>· {t.edad_actual} años → {t.edad_proxima_temporada}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          📧 {t.email_menor || "Sin email"} · {t.categoria}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {t.tenia_acceso_menor && (
                          <Badge className="bg-orange-100 text-orange-800 text-[10px]">Acceso juvenil</Badge>
                        )}
                        <ArrowRight className="w-4 h-4 text-amber-500" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPreview(null)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleProcess}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Procesar {preview.transitions?.length} transiciones
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-900">✅ Transiciones completadas</p>
              <p className="text-sm text-green-700">{result.processed} procesados · {result.errors} errores</p>
            </div>

            {result.details?.processed?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">Procesados:</p>
                {result.details.processed.map((p, i) => (
                  <div key={i} className="text-xs bg-green-50 rounded p-2 flex items-center justify-between">
                    <span>{p.jugador}</span>
                    <span className="text-green-700">📧 {p.email} · Código: {p.codigo}</span>
                  </div>
                ))}
              </div>
            )}

            {result.details?.errors?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-red-700">Errores:</p>
                {result.details.errors.map((e, i) => (
                  <div key={i} className="text-xs bg-red-50 rounded p-2">
                    {e.jugador}: {e.error}
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" onClick={() => { setResult(null); setPreview(null); }} className="w-full">
              Volver
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}