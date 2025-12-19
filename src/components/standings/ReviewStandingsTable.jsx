import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Edit2, Trash2, Plus } from "lucide-react";

export default function ReviewStandingsTable({ data, onConfirm, onCancel, isSubmitting }) {
  const [standings, setStandings] = useState(data.standings);
  const [editingIndex, setEditingIndex] = useState(null);

  const handleEdit = (index, field, value) => {
    const updated = [...standings];
    updated[index] = { ...updated[index], [field]: value };
    setStandings(updated);
  };

  const handleDelete = (index) => {
    setStandings(standings.filter((_, i) => i !== index));
  };

  const handleAddRow = () => {
    setStandings([...standings, {
      posicion: standings.length + 1,
      nombre_equipo: "",
      puntos: 0
    }]);
    setEditingIndex(standings.length);
  };

  const handleConfirm = () => {
    onConfirm({
      ...data,
      standings
    });
  };

  return (
    <Card className="border-2 border-green-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-green-600" />
          Revisar Clasificación
        </CardTitle>
        <div className="text-sm text-slate-600 mt-2">
          <p><strong>Temporada:</strong> {data.temporada}</p>
          <p><strong>Categoría:</strong> {data.categoria}</p>
          <p><strong>Jornada:</strong> {data.jornada}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-orange-800">
            <strong>⚠️ Revisa los datos:</strong> Corrige cualquier error de lectura antes de confirmar.
            Puedes editar los campos haciendo clic en ellos.
          </p>
        </div>

        <div className="overflow-x-auto bg-white rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 border-b">Pos</th>
                <th className="text-left p-3 border-b">Equipo</th>
                <th className="text-center p-3 border-b">Pts</th>
                <th className="text-center p-3 border-b">PJ</th>
                <th className="text-center p-3 border-b">G</th>
                <th className="text-center p-3 border-b">E</th>
                <th className="text-center p-3 border-b">P</th>
                <th className="text-center p-3 border-b">GF</th>
                <th className="text-center p-3 border-b">GC</th>
                <th className="text-center p-3 border-b w-16"></th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="p-2 border-b">
                    <Input
                      type="number"
                      value={standing.posicion}
                      onChange={(e) => handleEdit(index, 'posicion', parseInt(e.target.value))}
                      className="w-16 h-8 text-center"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <Input
                      value={standing.nombre_equipo}
                      onChange={(e) => handleEdit(index, 'nombre_equipo', e.target.value)}
                      className="h-8"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <Input
                      type="number"
                      value={standing.puntos}
                      onChange={(e) => handleEdit(index, 'puntos', parseInt(e.target.value))}
                      className="w-16 h-8 text-center font-bold"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <Input
                      type="number"
                      value={standing.partidos_jugados || ""}
                      onChange={(e) => handleEdit(index, 'partidos_jugados', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-16 h-8 text-center"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <Input
                      type="number"
                      value={standing.ganados || ""}
                      onChange={(e) => handleEdit(index, 'ganados', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-16 h-8 text-center"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <Input
                      type="number"
                      value={standing.empatados || ""}
                      onChange={(e) => handleEdit(index, 'empatados', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-16 h-8 text-center"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <Input
                      type="number"
                      value={standing.perdidos || ""}
                      onChange={(e) => handleEdit(index, 'perdidos', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-16 h-8 text-center"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <Input
                      type="number"
                      value={standing.goles_favor || ""}
                      onChange={(e) => handleEdit(index, 'goles_favor', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-16 h-8 text-center"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <Input
                      type="number"
                      value={standing.goles_contra || ""}
                      onChange={(e) => handleEdit(index, 'goles_contra', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-16 h-8 text-center"
                    />
                  </td>
                  <td className="p-2 border-b text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleAddRow}
          className="mt-3 w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Añadir Equipo
        </Button>

        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || standings.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar y Guardar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}