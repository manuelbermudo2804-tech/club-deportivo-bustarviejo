import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Edit2 } from "lucide-react";

export default function ReviewScorersTable({ data, onConfirm, onCancel, isSubmitting }) {
  const [rows, setRows] = useState(data.players || []);
  const [existingMap, setExistingMap] = React.useState({});
  const [stats, setStats] = React.useState({ valid: 0, invalid: 0, toCreate: 0, toUpdate: 0, total: (data.players || []).length });
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

  React.useEffect(() => {
    (async () => {
      try {
        const existing = await base44.entities.Goleador.filter({ categoria: data.categoria, temporada: data.temporada }, '-updated_date', 500);
        const map = {};
        existing.forEach(r => { map[`${norm(r.jugador_nombre)}|${norm(r.equipo)}`] = r; });
        setExistingMap(map);
      } catch (e) { /* ignore */ }
    })();
  }, [data.categoria, data.temporada]);

  React.useEffect(() => {
    let valid = 0, invalid = 0, toCreate = 0, toUpdate = 0;
    const seen = new Set();
    rows.forEach(r => {
      const key = `${norm(r.jugador_nombre)}|${norm(r.equipo)}`;
      const issues = [];
      if (!String(r.jugador_nombre || '').trim() || !String(r.equipo || '').trim()) issues.push('Campos vacíos');
      if (!Number.isFinite(Number(r.goles)) || Number(r.goles) < 0) issues.push('Goles inválidos');
      if (seen.has(key)) issues.push('Duplicado'); else seen.add(key);
      if (issues.length === 0) valid++; else invalid++;
      if (existingMap[key]) toUpdate++; else toCreate++;
    });
    setStats({ valid, invalid, toCreate, toUpdate, total: rows.length });
  }, [rows, existingMap]);

  const handleEdit = (index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: field === 'goles' ? Number(value) : value };
    setRows(updated);
  };

  const handleConfirm = () => {
    const cleaned = (rows || []).filter(r => String(r.jugador_nombre || '').trim() !== '' && String(r.equipo || '').trim() !== '' && Number.isFinite(Number(r.goles)));
    onConfirm({ ...data, players: cleaned });
  };

  return (
    <Card className="border-2 border-green-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-green-600" />
          Revisar Goleadores
        </CardTitle>
        <div className="text-sm text-slate-600 mt-2">
          <p><strong>Temporada:</strong> {data.temporada}</p>
          <p><strong>Categoría:</strong> {data.categoria}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-orange-800">
            <strong>⚠️ Revisa los datos:</strong> Validación en tiempo real y detección de duplicados (Jugador+Equipo).
          </p>
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <Badge variant="outline">Total: {stats.total}</Badge>
            <Badge className="bg-green-600">Válidas: {stats.valid}</Badge>
            <Badge className="bg-red-600">Con errores: {stats.invalid}</Badge>
            <Badge className="bg-slate-600">Actualizar: {stats.toUpdate}</Badge>
            <Badge className="bg-blue-600">Crear: {stats.toCreate}</Badge>
          </div>
        </div>
        <div className="overflow-x-auto bg-white rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 border-b">#</th>
                <th className="text-left p-3 border-b">Jugador</th>
                <th className="text-left p-3 border-b">Equipo</th>
                <th className="text-center p-3 border-b">Goles</th>
                <th className="text-center p-3 border-b">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-2 border-b w-12">{i + 1}</td>
                  <td className="p-2 border-b">
                    <Input value={r.jugador_nombre || ''} onChange={(e) => handleEdit(i, 'jugador_nombre', e.target.value)} className="h-8" />
                  </td>
                  <td className="p-2 border-b">
                    <Input value={r.equipo || ''} onChange={(e) => handleEdit(i, 'equipo', e.target.value)} className="h-8" />
                  </td>
                  <td className="p-2 border-b text-center">
                    <Input type="number" value={r.goles ?? ''} onChange={(e) => handleEdit(i, 'goles', e.target.value)} className="w-20 h-8 text-center" />
                  </td>
                  <td className="p-2 border-b text-center">
                    {(() => {
                      const key = `${norm(r.jugador_nombre)}|${norm(r.equipo)}`;
                      const okFields = String(r.jugador_nombre || '').trim() && String(r.equipo || '').trim();
                      const okGoles = Number.isFinite(Number(r.goles)) && Number(r.goles) >= 0;
                      const isValid = okFields && okGoles;
                      const exists = existingMap[key];
                      const color = isValid ? (exists ? 'bg-slate-600' : 'bg-blue-600') : 'bg-red-600';
                      const label = isValid ? (exists ? 'Actualizar' : 'Crear') : 'Corregir';
                      return <Badge className={`${color}`}>{label}</Badge>;
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 mt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Atrás</Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || rows.length === 0 || stats.invalid > 0} className="bg-green-600 hover:bg-green-700">
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