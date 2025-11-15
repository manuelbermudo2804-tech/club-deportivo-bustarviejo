import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ManualMatchEntry() {
  const queryClient = useQueryClient();
  const [matches, setMatches] = useState([{
    fecha: "",
    local: "",
    visitante: "",
    goles_local: "",
    goles_visitante: "",
    categoria: ""
  }]);

  const { data: configs } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.filter({ activo: true, temporada: "2024-2025" }),
    initialData: [],
  });

  const createResultMutation = useMutation({
    mutationFn: async (matchData) => {
      const isBustaLocal = matchData.local.toUpperCase().includes('BUSTARVIEJO');
      const goles_favor = isBustaLocal ? parseInt(matchData.goles_local) : parseInt(matchData.goles_visitante);
      const goles_contra = isBustaLocal ? parseInt(matchData.goles_visitante) : parseInt(matchData.goles_local);
      
      let resultado;
      if (goles_favor > goles_contra) resultado = "Victoria";
      else if (goles_favor < goles_contra) resultado = "Derrota";
      else resultado = "Empate";

      return base44.entities.MatchResult.create({
        titulo_partido: `${matchData.local} vs ${matchData.visitante}`,
        categoria: matchData.categoria,
        fecha_partido: matchData.fecha,
        rival: isBustaLocal ? matchData.visitante : matchData.local,
        local_visitante: isBustaLocal ? "Local" : "Visitante",
        goles_favor: goles_favor,
        goles_contra: goles_contra,
        resultado: resultado,
        observaciones: "Entrada manual desde RFFM"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchResults'] });
    }
  });

  const handleAddMatch = () => {
    setMatches([...matches, {
      fecha: "",
      local: "",
      visitante: "",
      goles_local: "",
      goles_visitante: "",
      categoria: ""
    }]);
  };

  const handleRemoveMatch = (index) => {
    setMatches(matches.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const newMatches = [...matches];
    newMatches[index][field] = value;
    setMatches(newMatches);
  };

  const handleSaveAll = async () => {
    try {
      for (const match of matches) {
        if (match.fecha && match.local && match.visitante && match.goles_local !== "" && match.goles_visitante !== "" && match.categoria) {
          await createResultMutation.mutateAsync(match);
        }
      }
      toast.success(`${matches.length} resultados guardados`);
      setMatches([{
        fecha: "",
        local: "",
        visitante: "",
        goles_local: "",
        goles_visitante: "",
        categoria: ""
      }]);
    } catch (error) {
      toast.error("Error al guardar: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="border-2 border-orange-500">
          <CardHeader className="bg-gradient-to-r from-slate-900 to-black text-white">
            <CardTitle className="flex items-center gap-2">
              ✍️ Entrada Manual de Resultados RFFM
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-blue-900 mb-2">📋 Instrucciones:</p>
              <ol className="list-decimal ml-5 space-y-1 text-blue-800">
                <li>Abre la página de calendario de RFFM en otra pestaña</li>
                <li>Copia los resultados de los partidos de Bustarviejo</li>
                <li>Rellena los campos aquí con esos datos</li>
                <li>Guarda todos los partidos a la vez</li>
              </ol>
            </div>

            {matches.map((match, index) => (
              <Card key={index} className="border border-slate-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">Partido {index + 1}</span>
                    {matches.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMatch(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Fecha</Label>
                      <Input
                        type="date"
                        value={match.fecha}
                        onChange={(e) => handleChange(index, 'fecha', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Categoría</Label>
                      <Select
                        value={match.categoria}
                        onValueChange={(value) => handleChange(index, 'categoria', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {configs.map(config => (
                            <SelectItem key={config.id} value={config.categoria_interna}>
                              {config.categoria_interna}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Equipo Local</Label>
                      <Input
                        placeholder="ej: C.D. BUSTARVIEJO"
                        value={match.local}
                        onChange={(e) => handleChange(index, 'local', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Equipo Visitante</Label>
                      <Input
                        placeholder="ej: C.F. COLMENAR VIEJO"
                        value={match.visitante}
                        onChange={(e) => handleChange(index, 'visitante', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Goles Local</Label>
                      <Input
                        type="number"
                        min="0"
                        value={match.goles_local}
                        onChange={(e) => handleChange(index, 'goles_local', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Goles Visitante</Label>
                      <Input
                        type="number"
                        min="0"
                        value={match.goles_visitante}
                        onChange={(e) => handleChange(index, 'goles_visitante', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-3">
              <Button
                onClick={handleAddMatch}
                variant="outline"
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir Otro Partido
              </Button>
              <Button
                onClick={handleSaveAll}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={matches.every(m => !m.fecha || !m.categoria)}
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Todos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}