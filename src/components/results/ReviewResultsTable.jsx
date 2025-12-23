import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Edit2 } from "lucide-react";

export default function ReviewResultsTable({ data, onConfirm, onCancel, isSubmitting }) {
  const [rows, setRows] = useState(data.matches || []);

  const handleEdit = (index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: field.includes('goles') ? Number(value) : value };
    setRows(updated);
  };

  const handleConfirm = () => {
    const cleaned = rows.filter(r => 
      String(r.local || '').trim() !== '' && 
      String(r.visitante || '').trim() !== ''
    );
    onConfirm({ ...data, matches: cleaned });
  };

  return (
    <Card className="border-2 border-green-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-green-600" />
          Revisar Resultados
        </CardTitle>
        <div className="text-sm text-slate-600 mt-2">
          <p><strong>Temporada:</strong> {data.temporada}</p>
          <p><strong>Categoría:</strong> {data.categoria}</p>
          <p><strong>Jornada:</strong> {data.jornada}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto bg-white rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 border-b">Local</th>
                <th className="text-center p-3 border-b">Goles L</th>
                <th className="text-center p-3 border-b">-</th>
                <th className="text-center p-3 border-b">Goles V</th>
                <th className="text-left p-3 border-b">Visitante</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-2 border-b">
                    <Input value={r.local || ''} onChange={(e) => handleEdit(i, 'local', e.target.value)} className="h-8" />
                  </td>
                  <td className="p-2 border-b text-center">
                    <Input type="number" value={r.goles_local ?? ''} onChange={(e) => handleEdit(i, 'goles_local', e.target.value)} className="w-16 h-8 text-center" />
                  </td>
                  <td className="p-2 border-b text-center font-bold">-</td>
                  <td className="p-2 border-b text-center">
                    <Input type="number" value={r.goles_visitante ?? ''} onChange={(e) => handleEdit(i, 'goles_visitante', e.target.value)} className="w-16 h-8 text-center" />
                  </td>
                  <td className="p-2 border-b">
                    <Input value={r.visitante || ''} onChange={(e) => handleEdit(i, 'visitante', e.target.value)} className="h-8" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 mt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Atrás</Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || rows.length === 0} className="bg-green-600 hover:bg-green-700">
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