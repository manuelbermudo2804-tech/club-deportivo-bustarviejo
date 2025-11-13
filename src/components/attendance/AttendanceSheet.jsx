import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Save } from "lucide-react";
import { toast } from "sonner";

export default function AttendanceSheet({ players, attendances, onSaveAttendance, isSaving }) {
  const [localAttendances, setLocalAttendances] = useState({});

  useEffect(() => {
    // Inicializar con datos existentes
    const initial = {};
    attendances.forEach(att => {
      initial[att.jugador_id] = {
        asistio: att.asistio,
        justificado: att.justificado,
        motivo: att.motivo_ausencia || "",
        notas: att.notas || ""
      };
    });
    setLocalAttendances(initial);
  }, [attendances]);

  const handleToggleAsistencia = (playerId) => {
    setLocalAttendances(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        asistio: !(prev[playerId]?.asistio || false),
        justificado: false,
        motivo: ""
      }
    }));
  };

  const handleToggleJustificado = (playerId) => {
    setLocalAttendances(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        justificado: !(prev[playerId]?.justificado || false)
      }
    }));
  };

  const handleMotivoChange = (playerId, motivo) => {
    setLocalAttendances(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        motivo
      }
    }));
  };

  const handleNotasChange = (playerId, notas) => {
    setLocalAttendances(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        notas
      }
    }));
  };

  const handleSaveAll = async () => {
    const promises = players.map(player => {
      const data = localAttendances[player.id] || { asistio: false, justificado: false, motivo: "", notas: "" };
      return onSaveAttendance(
        player.id,
        player.nombre,
        data.asistio,
        data.justificado,
        data.motivo,
        data.notas
      );
    });

    await Promise.all(promises);
    toast.success("Asistencia guardada correctamente");
  };

  if (players.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-500">No hay jugadores en esta categoría</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>Lista de Asistencia</CardTitle>
          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Todo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-slate-700">Jugador</th>
                <th className="text-center p-4 font-semibold text-slate-700">Asistió</th>
                <th className="text-center p-4 font-semibold text-slate-700">Justificado</th>
                <th className="text-left p-4 font-semibold text-slate-700">Motivo</th>
                <th className="text-left p-4 font-semibold text-slate-700">Notas</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const data = localAttendances[player.id] || { asistio: false, justificado: false, motivo: "", notas: "" };
                
                return (
                  <tr key={player.id} className="border-b hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {player.foto_url ? (
                          <img
                            src={player.foto_url}
                            alt={player.nombre}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">
                            {player.nombre.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium">{player.nombre}</span>
                      </div>
                    </td>
                    
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleAsistencia(player.id)}
                        className={`p-2 rounded-full transition-colors ${
                          data.asistio 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle className="w-6 h-6" />
                      </button>
                    </td>

                    <td className="p-4 text-center">
                      {!data.asistio && (
                        <button
                          onClick={() => handleToggleJustificado(player.id)}
                          className={`p-2 rounded-full transition-colors ${
                            data.justificado 
                              ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' 
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          <XCircle className="w-6 h-6" />
                        </button>
                      )}
                    </td>

                    <td className="p-4">
                      {!data.asistio && (
                        <Select
                          value={data.motivo}
                          onValueChange={(value) => handleMotivoChange(player.id, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Motivo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Enfermedad">🤒 Enfermedad</SelectItem>
                            <SelectItem value="Viaje familiar">✈️ Viaje</SelectItem>
                            <SelectItem value="Exámenes">📚 Exámenes</SelectItem>
                            <SelectItem value="Lesión">🏥 Lesión</SelectItem>
                            <SelectItem value="Otro">📝 Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>

                    <td className="p-4">
                      <Input
                        value={data.notas}
                        onChange={(e) => handleNotasChange(player.id, e.target.value)}
                        placeholder="Notas adicionales..."
                        className="max-w-xs"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}