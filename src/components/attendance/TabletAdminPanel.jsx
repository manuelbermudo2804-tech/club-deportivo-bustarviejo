import React from "react";
import { Button } from "@/components/ui/button";
import { Save, ArrowLeft, RefreshCw } from "lucide-react";

export default function TabletAdminPanel({ onSave, onGoIdle, onForceRefresh, saving }) {
  return (
    <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center" onClick={onGoIdle}>
      <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-3 min-w-[280px]" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-900 text-center">🔧 Panel Entrenador</h3>
        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={onSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" /> Guardar asistencia
        </Button>
        <Button variant="outline" className="w-full" onClick={onForceRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" /> Recargar datos
        </Button>
        <Button variant="outline" className="w-full" onClick={onGoIdle}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver al reposo
        </Button>
        <p className="text-xs text-slate-400 text-center pt-2">Toca fuera para cerrar</p>
      </div>
    </div>
  );
}