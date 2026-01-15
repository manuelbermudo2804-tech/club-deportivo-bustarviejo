import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function BankStatementUpload({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Parser CSV ligero sin dependencias (soporta comas/semicolon y campos entrecomillados)
  const parseCSV = async (file) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const detectDelimiter = (s) => {
      const commas = (s.match(/,/g) || []).length;
      const semis = (s.match(/;/g) || []).length;
      return semis > commas ? ';' : ',';
    };
    const delimiter = detectDelimiter(lines[0]);

    const splitLine = (line) => {
      const out = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === delimiter && !inQuotes) {
          out.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out.map(v => v.replace(/^"|"$/g, '').trim());
    };

    const headers = splitLine(lines[0]);
    const rows = lines.slice(1).map(l => {
      const cells = splitLine(l);
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = cells[idx] ?? ''; });
      return obj;
    });

    const movements = rows.map(row => {
      const fecha = row.Fecha || row.fecha || row['F.Valor'] || row.date;
      const concepto = row.Concepto || row.concepto || row.Descripcion || row.description || row['Desc.'];
      const importe = row.Importe || row.importe || row.Cantidad || row.amount;
      if (!fecha || !concepto || !importe) {
        throw new Error('CSV incompleto - revisa las columnas');
      }
      const importeNum = parseFloat(String(importe).replace(',', '.'));
      return {
        fecha: fecha,
        concepto: String(concepto).trim(),
        importe: Math.abs(importeNum),
        tipo: importeNum > 0 ? 'ingreso' : 'gasto',
      };
    }).filter(m => m.tipo === 'ingreso');

    return movements;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("Solo se aceptan archivos CSV");
      return;
    }

    if (!dateRange.start || !dateRange.end) {
      toast.error("Define el periodo del extracto");
      return;
    }

    setUploading(true);
    try {
      const movements = await parseCSV(file);
      
      if (movements.length === 0) {
        toast.error("No se encontraron movimientos válidos");
        setUploading(false);
        return;
      }

      toast.success(`${movements.length} movimientos importados`);
      onUploadComplete(movements, dateRange);
    } catch (error) {
      console.error("Error parsing CSV:", error);
      toast.error("Error al procesar el CSV: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-orange-600" />
          Subir Extracto Bancario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Formato del CSV:</p>
              <p>Debe contener columnas: <strong>Fecha, Concepto, Importe</strong></p>
              <p className="text-xs text-blue-700 mt-1">Descarga el extracto desde tu banco en formato CSV o Excel</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha inicio</Label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div>
            <Label>Fecha fin</Label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="csv-upload" className="cursor-pointer">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-orange-500 hover:bg-orange-50 transition-colors text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">
                {uploading ? "Procesando..." : "Haz clic para subir CSV"}
              </p>
              <p className="text-xs text-slate-500 mt-1">CSV de tu banco</p>
            </div>
          </Label>
          <Input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
}