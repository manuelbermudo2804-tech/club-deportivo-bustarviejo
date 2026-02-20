import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Edit2 } from "lucide-react";

export default function ReviewResultsTable({ data, onConfirm, onCancel, isSubmitting }) {
  const [rows, setRows] = useState(data.matches || []);
  const [existingMap, setExistingMap] = React.useState({});
  const [stats, setStats] = React.useState({ valid: 0, invalid: 0, toCreate: 0, toUpdate: 0, total: (data.matches || []).length });
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

  React.useEffect(() => {
    (async () => {
      try {
        const existing = await base44.entities.Resultado.filter({ categoria: data.categoria, temporada: data.temporada, jornada: data.jornada }, '-updated_date', 200);
        const map = {};
        existing.forEach(r => { map[`${norm(r.local)}|${norm(r.visitante)}`] = r; });
        setExistingMap(map);
      } catch (e) { /* ignore */ }
    })();
  }, [data.categoria, data.temporada, data.jornada]);

  React.useEffect(() => {
    let valid = 0, invalid = 0, toCreate = 0, toUpdate = 0;
    const seen = new Set();
    rows.forEach(r => {
      const key = `${norm(r.local)}|${norm(r.visitante)}`;
      const issues = [];
      if (!String(r.local || '').trim() || !String(r.visitante || '').trim()) issues.push('Equipos vacíos');
      const gl = r.goles_local, gv = r.goles_visitante;
      const bothNull = (gl === undefined || gl === null) && (gv === undefined || gv === null);
      const bothNumbers = Number.isFinite(Number(gl)) && Number.isFinite(Number(gv)) && Number(gl) >= 0 && Number(gv) >= 0;
      const oneSideOnly = ((gl !== undefined && gl !== null) && (gv === undefined || gv === null)) || ((gl === undefined || gl === null) && (gv !== undefined && gv !== null));
      const isPendiente = r.pendiente || bothNull;
      if (!(isPendiente || bothNumbers || oneSideOnly)) issues.push('Marcador inválido');
      if (seen.has(key)) issues.push('Duplicado'); else seen.add(key);
      if (issues.length === 0) valid++; else invalid++;
      if (existingMap[key]) toUpdate++; else toCreate++;
    });
    setStats({ valid, invalid, toCreate, toUpdate, total: rows.length });
  }, [rows, existingMap]);

  const handleEdit = (index, field, value) => {
    const updated = [...rows];
    if (field.includes('goles')) {
      // Empty string means "no score" (pending), not 0
      updated[index] = { ...updated[index], [field]: value === '' ? null : Number(value), pendiente: false };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setRows(updated);
  };

  const handleConfirm = () => {
    const isNum = (v) => Number.isFinite(Number(v)) && Number(v) >= 0;
    const cleaned = rows
      .filter(r => String(r.local || '').trim() !== '' && String(r.visitante || '').trim() !== '')
      .map(r => {
        const gl = r.goles_local, gv = r.goles_visitante;
        const bothNumbers = isNum(gl) && isNum(gv);
        // Si solo hay un lado, lo guardamos como pendiente (sin goles)
        const goles_local = bothNumbers ? Number(gl) : undefined;
        const goles_visitante = bothNumbers ? Number(gv) : undefined;
        return { ...r, goles_local, goles_visitante };
      });
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
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-orange-800">
            <strong>⚠️ Revisa los datos:</strong> Se permiten partidos pendientes (si falta un gol). Al guardar, esos partidos se guardan sin marcador.
          </p>
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <Badge variant="outline">Total: {stats.total}</Badge>
            <Badge className="bg-green-600">Válidas/Pend.: {stats.valid}</Badge>
            <Badge className="bg-red-600">Con errores: {stats.invalid}</Badge>
            <Badge className="bg-slate-600">Actualizar: {stats.toUpdate}</Badge>
            <Badge className="bg-blue-600">Crear: {stats.toCreate}</Badge>
          </div>
        </div>
        <div className="overflow-x-auto bg-white rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 border-b">Local</th>
                <th className="text-center p-3 border-b">Goles L</th>
                <th className="text-center p-3 border-b">-</th>
                <th className="text-center p-3 border-b">Goles V</th>
                <th className="text-left p-3 border-b">Visitante</th>
                <th className="text-center p-3 border-b">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-2 border-b">
                    <Input value={r.local || ''} onChange={(e) => handleEdit(i, 'local', e.target.value)} className="h-8" />
                  </td>
                  <td className="p-2 border-b text-center">
                    <Input type="number" value={r.goles_local != null ? r.goles_local : ''} onChange={(e) => handleEdit(i, 'goles_local', e.target.value)} placeholder="-" className="w-16 h-8 text-center" />
                  </td>
                  <td className="p-2 border-b text-center font-bold">-</td>
                  <td className="p-2 border-b text-center">
                    <Input type="number" value={r.goles_visitante != null ? r.goles_visitante : ''} onChange={(e) => handleEdit(i, 'goles_visitante', e.target.value)} placeholder="-" className="w-16 h-8 text-center" />
                  </td>
                  <td className="p-2 border-b">
                    <Input value={r.visitante || ''} onChange={(e) => handleEdit(i, 'visitante', e.target.value)} className="h-8" />
                  </td>
                  <td className="p-2 border-b text-center">
                    {(() => {
                      const key = `${norm(r.local)}|${norm(r.visitante)}`;
                      const gl = r.goles_local, gv = r.goles_visitante;
                      const bothNull = (gl === undefined || gl === null) && (gv === undefined || gv === null);
                      const bothNumbers = Number.isFinite(Number(gl)) && Number.isFinite(Number(gv)) && Number(gl) >= 0 && Number(gv) >= 0;
                      const okTeams = String(r.local || '').trim() && String(r.visitante || '').trim();
                      const oneSideOnly = ((gl !== undefined && gl !== null) && (gv === undefined || gv === null)) || ((gl === undefined || gl === null) && (gv !== undefined && gv !== null));
                      const isPendiente = r.pendiente || bothNull;
                      const isValid = okTeams && (isPendiente || bothNumbers || oneSideOnly);
                      const exists = existingMap[key];
                      const color = !isValid ? 'bg-red-600' : isPendiente ? 'bg-amber-500' : (exists ? 'bg-slate-600' : 'bg-blue-600');
                      const label = !isValid ? 'Corregir' : isPendiente ? 'Pendiente' : (exists ? 'Actualizar' : 'Crear');
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