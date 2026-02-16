import React from "react";
import { AlertCircle, Camera, FileText, FileSignature, CreditCard } from "lucide-react";

export default function PlayerCardChecklist({ checklistItems }) {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <p className="text-xs font-bold text-amber-900">Documentación pendiente:</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${checklistItems.foto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <Camera className="w-3 h-3" />
          {checklistItems.foto ? '✓ Foto' : '✗ Foto'}
        </div>
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${checklistItems.dni ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <FileText className="w-3 h-3" />
          {checklistItems.dni ? '✓ DNI/Libro' : '✗ DNI/Libro'}
        </div>
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${checklistItems.firma ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <FileSignature className="w-3 h-3" />
          {checklistItems.firma ? '✓ Firmas' : '✗ Firmas'}
        </div>
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${checklistItems.pago ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <CreditCard className="w-3 h-3" />
          {checklistItems.pago ? '✓ Pagos' : '✗ Pagos'}
        </div>
      </div>
    </div>
  );
}