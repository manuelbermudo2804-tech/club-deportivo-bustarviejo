import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle, XCircle, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import ContactCard from "../components/ContactCard";

export default function ParentAttendance() {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: players } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        p.email_padre === user?.email || p.email_tutor_2 === user?.email
      );
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances', selectedPlayerId],
    queryFn: () => base44.entities.Attendance.list('-fecha'),
    initialData: [],
  });

  useEffect(() => {
    if (players.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(players[0].id);
    }
  }, [players]);

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const playerAttendances = attendances.filter(a => a.jugador_id === selectedPlayerId);

  // Calcular estadísticas
  const totalEntrenamientos = playerAttendances.length;
  const totalAsistencias = playerAttendances.filter(a => a.asistio).length;
  const totalFaltas = playerAttendances.filter(a => !a.asistio && !a.justificado).length;
  const totalJustificadas = playerAttendances.filter(a => !a.asistio && a.justificado).length;
  const porcentajeAsistencia = totalEntrenamientos > 0 
    ? Math.round((totalAsistencias / totalEntrenamientos) * 100) 
    : 0;

  if (players.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 text-lg">No tienes jugadores registrados</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">📊 Asistencia a Entrenamientos</h1>
        <p className="text-slate-600 mt-1">Consulta el historial de asistencia</p>
      </div>

      {/* Tabs de jugadores */}
      <Tabs value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
        <TabsList>
          {players.map(player => (
            <TabsTrigger key={player.id} value={player.id}>
              {player.nombre}
            </TabsTrigger>
          ))}
        </TabsList>

        {players.map(player => (
          <TabsContent key={player.id} value={player.id} className="space-y-6">
            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Total Entrenamientos</p>
                      <p className="text-2xl font-bold text-slate-900">{totalEntrenamientos}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-slate-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Asistencias</p>
                      <p className="text-2xl font-bold text-green-600">{totalAsistencias}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Faltas</p>
                      <p className="text-2xl font-bold text-red-600">{totalFaltas}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">% Asistencia</p>
                      <p className="text-2xl font-bold text-blue-600">{porcentajeAsistencia}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Historial */}
            <Card>
              <CardHeader>
                <CardTitle>Historial de Asistencia</CardTitle>
              </CardHeader>
              <CardContent>
                {playerAttendances.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">
                    No hay registros de asistencia aún
                  </p>
                ) : (
                  <div className="space-y-3">
                    {playerAttendances.map((att) => (
                      <div 
                        key={att.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-4">
                          {att.asistio ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <XCircle className={`w-6 h-6 ${att.justificado ? 'text-orange-600' : 'text-red-600'}`} />
                          )}
                          <div>
                            <p className="font-medium">
                              {format(new Date(att.fecha), "EEEE, d 'de' MMMM, yyyy", { locale: es })}
                            </p>
                            {!att.asistio && att.motivo_ausencia && (
                              <p className="text-sm text-slate-600">
                                Motivo: {att.motivo_ausencia}
                              </p>
                            )}
                            {att.notas && (
                              <p className="text-sm text-slate-500 italic">
                                "{att.notas}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {att.asistio ? (
                            <Badge className="bg-green-100 text-green-700">
                              ✓ Asistió
                            </Badge>
                          ) : att.justificado ? (
                            <Badge className="bg-orange-100 text-orange-700">
                              ⚠️ Justificado
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">
                              ✗ Falta
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <ContactCard />
    </div>
  );
}