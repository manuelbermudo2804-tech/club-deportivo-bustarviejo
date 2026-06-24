import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Phone, Mail, Euro } from "lucide-react";
import { getSponsorAlert, fmtEuro } from "./crmConfig";

// Tarjeta de una empresa dentro de una columna del Kanban.
export default function CrmPipelineCard({ sponsor, index, onClick }) {
  const alert = getSponsorAlert(sponsor);
  const importe = sponsor.etapa_crm === "ganado" ? sponsor.precio_anual : (sponsor.importe_potencial || sponsor.precio_anual);

  return (
    <Draggable draggableId={sponsor.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(sponsor)}
          className={`bg-white rounded-lg border p-3 mb-2 cursor-pointer shadow-sm hover:shadow-md transition-shadow ${
            snapshot.isDragging ? "shadow-lg ring-2 ring-amber-400 rotate-1" : "border-slate-200"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-slate-900 leading-tight">{sponsor.nombre}</p>
            {alert && (
              <span title={alert.label} className="text-xs shrink-0">{alert.emoji}</span>
            )}
          </div>

          {sponsor.sector && (
            <p className="text-[11px] text-slate-400 mt-0.5">{sponsor.sector}</p>
          )}
          {sponsor.interes && (
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">🎯 {sponsor.interes}</p>
          )}

          {importe ? (
            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-slate-700">
              <Euro className="w-3 h-3" />
              {fmtEuro(importe)}
            </div>
          ) : null}

          <div className="flex items-center gap-2 mt-2">
            {sponsor.contacto_telefono && (
              <a
                href={`tel:${sponsor.contacto_telefono}`}
                onClick={(e) => e.stopPropagation()}
                className="text-slate-400 hover:text-green-600"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
            {sponsor.contacto_email && (
              <a
                href={`mailto:${sponsor.contacto_email}`}
                onClick={(e) => e.stopPropagation()}
                className="text-slate-400 hover:text-blue-600"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            )}
            {alert && (
              <span className="ml-auto text-[10px] text-slate-400 truncate">{alert.label}</span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}