import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function StepSummary({ currentPlayer, playerAge, isMayorDeEdad, siblingDiscount, isAdultPlayerSelfRegistration }) {
  const sections = [
    {
      title: "👤 Datos del Jugador",
      items: [
        { label: "Nombre", value: currentPlayer.nombre },
        { label: "Fecha nacimiento", value: currentPlayer.fecha_nacimiento ? new Date(currentPlayer.fecha_nacimiento).toLocaleDateString('es-ES') : "" },
        { label: "Edad", value: playerAge !== null ? `${playerAge} años` : "" },
        { label: "Foto", value: currentPlayer.foto_url ? "✅ Subida" : "❌ Falta", ok: !!currentPlayer.foto_url },
      ]
    },
    {
      title: "⚽ Categoría",
      items: [
        { label: "Deporte/Categoría", value: currentPlayer.deporte },
      ]
    },
    {
      title: "📄 Documentación",
      items: [
        { label: "DNI Jugador", value: currentPlayer.dni_jugador || "No proporcionado" },
        { label: "DNI escaneado", value: currentPlayer.dni_jugador_url ? "✅ Subido" : "No subido", ok: !!currentPlayer.dni_jugador_url },
      ]
    },
  ];

  if (!isAdultPlayerSelfRegistration) {
    sections.push({
      title: "👨‍👩‍👧 Tutor Legal",
      items: [
        { label: "Nombre tutor", value: currentPlayer.nombre_tutor_legal || "—" },
        { label: "DNI tutor", value: currentPlayer.dni_tutor_legal || "—" },
        { label: "Email", value: currentPlayer.email_padre },
        { label: "Teléfono", value: currentPlayer.telefono },
      ]
    });

    if (currentPlayer.nombre_tutor_2) {
      sections.push({
        title: "👥 Segundo Progenitor",
        items: [
          { label: "Nombre", value: currentPlayer.nombre_tutor_2 },
          { label: "Email", value: currentPlayer.email_tutor_2 || "—" },
          { label: "Teléfono", value: currentPlayer.telefono_tutor_2 || "—" },
        ]
      });
    }
  }

  sections.push({
    title: "📍 Dirección",
    items: [
      { label: "Dirección", value: currentPlayer.direccion },
      { label: "Municipio", value: currentPlayer.municipio || "—" },
    ]
  });

  sections.push({
    title: "📋 Normativa y Autorizaciones",
    items: [
      { label: "Normativa del club", value: currentPlayer.acepta_normativa ? "✅ Aceptada" : "❌ Pendiente", ok: currentPlayer.acepta_normativa },
      { label: "Política privacidad", value: currentPlayer.acepta_politica_privacidad ? "✅ Aceptada" : "❌ Pendiente", ok: currentPlayer.acepta_politica_privacidad },
      { label: "Fotografías", value: currentPlayer.autorizacion_fotografia || "❌ Pendiente", ok: !!currentPlayer.autorizacion_fotografia },
    ]
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        ✅ Resumen de la Inscripción
      </h3>
      <p className="text-sm text-slate-600">Revisa que todos los datos sean correctos antes de confirmar.</p>

      {siblingDiscount?.hasDiscount && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-sm font-bold text-green-800">🎉 Descuento familiar: -{siblingDiscount.amount}€</span>
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section, i) => (
          <div key={i} className="bg-slate-50 rounded-lg p-4 space-y-2">
            <p className="font-bold text-slate-900 text-sm">{section.title}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              {section.items.map((item, j) => (
                <div key={j} className="flex justify-between items-center py-1 border-b border-slate-200 last:border-0">
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className={`text-xs font-medium ${item.ok === false ? 'text-red-600' : 'text-slate-900'}`}>
                    {item.value || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {currentPlayer.observaciones && (
        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
          <p className="text-xs font-bold text-yellow-800">📝 Observaciones:</p>
          <p className="text-xs text-yellow-700">{currentPlayer.observaciones}</p>
        </div>
      )}
    </div>
  );
}