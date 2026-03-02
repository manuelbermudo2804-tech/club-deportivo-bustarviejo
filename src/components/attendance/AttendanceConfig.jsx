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
    <Card className="border shadow-sm">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm">Configuración</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-slate-600 mb-1 block">Equipo</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9">
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
            <label className="text-xs text-slate-600 mb-1 block">Fecha</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={onSave}
              disabled={!hasUnsavedChanges}
              className={`flex-1 h-9 text-sm ${hasUnsavedChanges ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600'}`}
            >
              <Save className="w-4 h-4 mr-1" />
              Guardar
            </Button>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-600 mb-1 block">Notas Generales</label>
          <Textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Observaciones del entrenamiento..."
            className="h-14 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5 pt-1 border-t">
          <Button
            onClick={onShowBulkDialog}
            disabled={isSendingReports}
            variant="outline"
            className="flex-1 h-9 text-sm"
          >
            <Send className="w-4 h-4 mr-1" />
            📨 Reportes a Familias (Privado)
          </Button>
          <p className="text-[10px] text-green-700 text-center">
            🔒 Cada familia recibe SOLO el reporte de su hijo
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(AttendanceConfig);