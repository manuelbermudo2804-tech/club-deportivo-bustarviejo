import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Mail, MessageCircle, Calendar, Loader2, Users } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export default function BulkReportDialog({ 
  isOpen, 
  onClose, 
  onSend,
  isLoading,
  selectedCategory
}) {
  const [periodType, setPeriodType] = useState("day");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sendMethod, setSendMethod] = useState("email");

  const getDateRange = () => {
    const today = new Date();
    switch (periodType) {
      case "day":
        return { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case "week":
        return {
          start: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        };
      case "month":
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd')
        };
      case "custom":
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
    }
  };

  const handleSend = () => {
    const dateRange = getDateRange();
    if (periodType === "custom" && (!customStartDate || !customEndDate)) {
      alert("Por favor selecciona las fechas");
      return;
    }
    if (periodType === "custom" && customStartDate > customEndDate) {
      alert("La fecha de inicio debe ser anterior a la fecha de fin");
      return;
    }
    onSend({ dateRange, sendMethod, periodType });
  };

  const getPeriodLabel = () => {
    switch (periodType) {
      case "day": return "Hoy";
      case "week": return "Esta semana";
      case "month": return "Este mes";
      case "custom": return "Personalizado";
      default: return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            Enviar Reportes Masivos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>📊 Envío masivo:</strong> Se enviará un reporte individualizado a cada padre de los jugadores que asistieron en el periodo seleccionado.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Periodo del Reporte
            </label>
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">📅 Un solo día (hoy)</SelectItem>
                <SelectItem value="week">📆 Esta semana</SelectItem>
                <SelectItem value="month">🗓️ Este mes</SelectItem>
                <SelectItem value="custom">🎯 Fechas personalizadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodType === "custom" && (
            <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Fecha de inicio</label>
                <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Fecha de fin</label>
                <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm" />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Método de envío</label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setSendMethod("email")}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${sendMethod === "email" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                <Mail className="w-5 h-5" />
                <span className="font-medium text-xs">Email</span>
              </button>
              <button onClick={() => setSendMethod("chat")}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${sendMethod === "chat" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                <MessageCircle className="w-5 h-5" />
                <span className="font-medium text-xs">Mensajes Club</span>
              </button>
              <button onClick={() => setSendMethod("both")}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${sendMethod === "both" ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                <div className="flex gap-1"><Mail className="w-4 h-4" /><MessageCircle className="w-4 h-4" /></div>
                <span className="font-medium text-xs">Ambos</span>
              </button>
            </div>
          </div>

          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <p className="text-xs text-green-800">
              <strong>Se enviará:</strong> Reporte de <strong>{getPeriodLabel()}</strong> por <strong>{sendMethod === "email" ? "Email" : sendMethod === "chat" ? "Mensajes del Club" : "Email + Mensajes del Club"}</strong>
              <br />• A todos los padres de jugadores que asistieron
              <br />• Categoría: {selectedCategory}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSend} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
            {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>) : (<><Send className="w-4 h-4 mr-2" />Enviar Reportes</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}