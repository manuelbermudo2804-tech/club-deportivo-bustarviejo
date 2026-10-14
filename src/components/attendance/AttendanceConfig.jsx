import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Send } from "lucide-react";
import { format } from "date-fns";

function AttendanceConfig({
  selectedCategory, setSelectedCategory, availableCategories,
  selectedDate, setSelectedDate,
  generalNotes, setGeneralNotes,
  hasUnsavedChanges, onSave, onShowBulkDialog,
  existing, isSendingReports
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
        <CardTitle className="text-base font-bold text-slate-900">Configuración de la sesión</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Equipo</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Fecha</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={onSave}
              disabled={!hasUnsavedChanges}
              className={`h-11 flex-1 rounded-xl text-sm font-semibold shadow-sm ${hasUnsavedChanges ? 'bg-orange-600 hover:bg-orange-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              <Save className="w-4 h-4 mr-1" />
              Guardar
            </Button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Notas generales</label>
          <Textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Observaciones del entrenamiento..."
            className="min-h-20 rounded-xl border-slate-200 text-sm"
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
          <Button
            onClick={onShowBulkDialog}
            disabled={isSendingReports}
            variant="outline"
            className="h-11 w-full rounded-xl border-orange-200 text-sm font-semibold text-orange-700 hover:bg-orange-50"
          >
            <Send className="w-4 h-4 mr-1" />
            📨 Reportes a Familias (Privado)
          </Button>
          <p className="text-xs text-emerald-700 text-center">
            🔒 Cada familia recibe SOLO el reporte de su hijo
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(AttendanceConfig);