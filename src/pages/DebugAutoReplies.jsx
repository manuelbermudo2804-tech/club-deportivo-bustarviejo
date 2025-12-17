import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function DebugAutoReplies() {
  const [user, setUser] = useState(null);
  const [coachSettings, setCoachSettings] = useState([]);
  const [coordinatorSettings, setCoordinatorSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const allCoachSettings = await base44.entities.CoachSettings.list();
      setCoachSettings(allCoachSettings);

      const allCoordinatorSettings = await base44.entities.CoordinatorSettings.list();
      setCoordinatorSettings(allCoordinatorSettings);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const now = new Date();
  const dayName = DIAS_SEMANA[now.getDay() === 0 ? 6 : now.getDay() - 1];
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">🔍 Debug - Respuestas Automáticas</h1>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Recargar
        </Button>
      </div>

      {/* Info del usuario */}
      <Card>
        <CardHeader>
          <CardTitle>👤 Usuario Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Nombre:</strong> {user?.full_name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Rol:</strong> {user?.role}</p>
            <p><strong>Es Entrenador:</strong> {user?.es_entrenador ? "✅ Sí" : "❌ No"}</p>
            <p><strong>Es Coordinador:</strong> {user?.es_coordinador ? "✅ Sí" : "❌ No"}</p>
            {user?.categorias_entrena && (
              <p><strong>Categorías que entrena:</strong> {user.categorias_entrena.join(', ')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hora actual */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-lg"><strong>🕐 Hora actual:</strong> {currentTime}</p>
          <p className="text-lg"><strong>📅 Día actual:</strong> {dayName}</p>
        </CardContent>
      </Card>

      {/* Settings de Entrenadores */}
      <Card>
        <CardHeader>
          <CardTitle>🏃 Settings de Entrenadores ({coachSettings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {coachSettings.length === 0 ? (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
              <p className="text-red-800 font-bold">❌ NO HAY CONFIGURACIONES DE ENTRENADOR</p>
              <p className="text-red-600 text-sm mt-2">Los entrenadores deben ir a "Chat Entrenador → ⚙️ Configuración" y guardar sus ajustes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {coachSettings.map((setting, idx) => {
                const isWorkingDay = setting.dias_laborales?.includes(dayName);
                const isWithinHours = setting.horario_inicio && setting.horario_fin && 
                  currentTime >= setting.horario_inicio && currentTime <= setting.horario_fin;

                return (
                  <div key={idx} className="bg-slate-50 border-2 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg">{setting.entrenador_nombre || setting.entrenador_email}</p>
                        <p className="text-sm text-slate-600">{setting.entrenador_email}</p>
                      </div>
                    </div>

                    {setting.categorias_entrena?.length > 0 ? (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">📚 Categorías:</p>
                        <div className="flex flex-wrap gap-1">
                          {setting.categorias_entrena.map((cat, i) => (
                            <Badge key={i} className="bg-blue-600">{cat}</Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-300 rounded p-2 mb-3">
                        <p className="text-red-700 text-sm font-bold">⚠️ SIN CATEGORÍAS ASIGNADAS</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">🌙 Modo Ausente:</p>
                        {setting.modo_ausente === true ? (
                          <div className="bg-green-100 border-2 border-green-300 rounded p-2">
                            <p className="text-green-800 font-bold flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              ✅ ACTIVO
                            </p>
                            <p className="text-xs text-green-700 mt-1 italic">"{setting.mensaje_ausente}"</p>
                          </div>
                        ) : (
                          <div className="bg-slate-100 border rounded p-2">
                            <p className="text-slate-600 flex items-center gap-2">
                              <XCircle className="w-4 h-4" />
                              Desactivado
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">⏰ Horario Laboral:</p>
                        {setting.horario_laboral_activo === true ? (
                          <div className="bg-blue-100 border-2 border-blue-300 rounded p-2">
                            <p className="text-blue-800 font-bold flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              ✅ ACTIVO
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              {setting.horario_inicio} - {setting.horario_fin}
                            </p>
                            <p className="text-xs text-blue-700">
                              {setting.dias_laborales?.join(', ') || 'Sin días'}
                            </p>
                            <div className="mt-2 p-2 bg-white rounded">
                              <p className="text-xs font-bold">Estado actual:</p>
                              <p className="text-xs">
                                {isWorkingDay ? "✅ Día laboral" : "❌ No es día laboral"}
                              </p>
                              <p className="text-xs">
                                {isWithinHours ? "✅ Dentro de horario" : "❌ Fuera de horario"}
                              </p>
                              {(!isWorkingDay || !isWithinHours) && (
                                <p className="text-xs text-orange-600 font-bold mt-1">
                                  → Debería enviar: "{setting.mensaje_fuera_horario}"
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-100 border rounded p-2">
                            <p className="text-slate-600 flex items-center gap-2">
                              <XCircle className="w-4 h-4" />
                              Desactivado
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings de Coordinadores */}
      <Card>
        <CardHeader>
          <CardTitle>👔 Settings de Coordinadores ({coordinatorSettings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {coordinatorSettings.length === 0 ? (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
              <p className="text-red-800 font-bold">❌ NO HAY CONFIGURACIONES DE COORDINADOR</p>
              <p className="text-red-600 text-sm mt-2">Los coordinadores deben ir a "⚙️ Configuración Chat Coordinador" y guardar sus ajustes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {coordinatorSettings.map((setting, idx) => {
                const isWorkingDay = setting.dias_laborales?.includes(dayName);
                const isWithinHours = setting.horario_inicio && setting.horario_fin && 
                  currentTime >= setting.horario_inicio && currentTime <= setting.horario_fin;

                return (
                  <div key={idx} className="bg-slate-50 border-2 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg">{setting.coordinador_email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">🌙 Modo Ausente:</p>
                        {setting.modo_ausente === true ? (
                          <div className="bg-green-100 border-2 border-green-300 rounded p-2">
                            <p className="text-green-800 font-bold flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              ✅ ACTIVO
                            </p>
                            <p className="text-xs text-green-700 mt-1 italic">"{setting.mensaje_ausente}"</p>
                          </div>
                        ) : (
                          <div className="bg-slate-100 border rounded p-2">
                            <p className="text-slate-600 flex items-center gap-2">
                              <XCircle className="w-4 h-4" />
                              Desactivado
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">⏰ Horario Laboral:</p>
                        {setting.horario_laboral_activo === true ? (
                          <div className="bg-blue-100 border-2 border-blue-300 rounded p-2">
                            <p className="text-blue-800 font-bold flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              ✅ ACTIVO
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              {setting.horario_inicio} - {setting.horario_fin}
                            </p>
                            <p className="text-xs text-blue-700">
                              {setting.dias_laborales?.join(', ') || 'Sin días'}
                            </p>
                            <div className="mt-2 p-2 bg-white rounded">
                              <p className="text-xs font-bold">Estado actual:</p>
                              <p className="text-xs">
                                {isWorkingDay ? "✅ Día laboral" : "❌ No es día laboral"}
                              </p>
                              <p className="text-xs">
                                {isWithinHours ? "✅ Dentro de horario" : "❌ Fuera de horario"}
                              </p>
                              {(!isWorkingDay || !isWithinHours) && (
                                <p className="text-xs text-orange-600 font-bold mt-1">
                                  → Debería enviar: "{setting.mensaje_fuera_horario}"
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-100 border rounded p-2">
                            <p className="text-slate-600 flex items-center gap-2">
                              <XCircle className="w-4 h-4" />
                              Desactivado
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card className="bg-orange-50 border-orange-300">
        <CardHeader>
          <CardTitle>📋 Cómo Probar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-bold text-orange-900 mb-2">Para Entrenadores:</p>
            <ol className="list-decimal list-inside text-sm space-y-1 text-slate-700">
              <li>Ve a "Chat Entrenador" → pestaña "⚙️ Configuración"</li>
              <li>Activa "Modo Ausente" y escribe un mensaje</li>
              <li>Pulsa "💾 Guardar Configuración"</li>
              <li>Verifica aquí que aparece con categorías asignadas</li>
              <li>Abre el chat como padre y escribe - debería llegar respuesta automática</li>
            </ol>
          </div>

          <div>
            <p className="font-bold text-cyan-900 mb-2">Para Coordinadores:</p>
            <ol className="list-decimal list-inside text-sm space-y-1 text-slate-700">
              <li>Ve a "⚙️ Configuración Chat Coordinador"</li>
              <li>Activa "Modo Ausente" y escribe un mensaje</li>
              <li>Pulsa "💾 Guardar Configuración"</li>
              <li>Verifica aquí que aparece activado</li>
              <li>Abre el chat como padre y escribe - debería llegar respuesta automática</li>
            </ol>
          </div>

          <div className="bg-white border-2 border-orange-400 rounded-lg p-3 mt-4">
            <p className="text-sm font-bold text-orange-900 mb-2">⚠️ Problemas Comunes:</p>
            <ul className="text-xs space-y-1 text-slate-700">
              <li>• Si no aparecen configuraciones: no se han guardado correctamente</li>
              <li>• Si aparecen SIN categorías: el entrenador debe volver a guardar</li>
              <li>• Si modo ausente está desactivado: verifica el switch está en verde</li>
              <li>• Las respuestas automáticas se envían SOLO cuando escribes como PADRE</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}