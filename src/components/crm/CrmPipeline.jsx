import React, { useMemo } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { ETAPAS, COLOR_CLASSES, fmtEuro } from "./crmConfig";
import CrmPipelineCard from "./CrmPipelineCard";

// Tablero Kanban arrastrable del pipeline comercial.
export default function CrmPipeline({ sponsors = [], onCardClick, onMove }) {
  const columnas = useMemo(() => {
    const grouped = {};
    ETAPAS.forEach(e => { grouped[e.id] = []; });
    sponsors.forEach(s => {
      const etapa = s.etapa_crm || (s.activo ? "ganado" : "prospecto");
      if (grouped[etapa]) grouped[etapa].push(s);
      else grouped.prospecto.push(s);
    });
    return grouped;
  }, [sponsors]);

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    onMove(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {ETAPAS.map((etapa) => {
          const items = columnas[etapa.id] || [];
          const colors = COLOR_CLASSES[etapa.color];
          const totalEuro = items.reduce((s, sp) => s + (sp.etapa_crm === "ganado" ? (sp.precio_anual || 0) : (sp.importe_potencial || sp.precio_anual || 0)), 0);
          return (
            <div key={etapa.id} className="shrink-0 w-64">
              <div className={`rounded-t-lg px-3 py-2 ${colors.header} border-t border-x ${colors.border} flex items-center justify-between`}>
                <span className={`text-sm font-semibold ${colors.text} flex items-center gap-1.5`}>
                  <span>{etapa.emoji}</span> {etapa.label}
                </span>
                <span className={`text-xs font-bold ${colors.text} ${colors.bg} px-1.5 py-0.5 rounded`}>
                  {items.length}
                </span>
              </div>
              <Droppable droppableId={etapa.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[120px] p-2 rounded-b-lg border-x border-b ${colors.border} ${
                      snapshot.isDraggingOver ? colors.bg : "bg-slate-50/50"
                    } transition-colors`}
                  >
                    {totalEuro > 0 && (
                      <p className="text-[10px] text-slate-400 px-1 mb-1">{fmtEuro(totalEuro)}</p>
                    )}
                    {items.map((sponsor, index) => (
                      <CrmPipelineCard
                        key={sponsor.id}
                        sponsor={sponsor}
                        index={index}
                        onClick={onCardClick}
                      />
                    ))}
                    {provided.placeholder}
                    {items.length === 0 && (
                      <p className="text-[11px] text-slate-300 text-center py-4">Vacío</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}