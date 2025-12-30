import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const prioridadColor = {
  Alta: "bg-red-100 text-red-700",
  Media: "bg-yellow-100 text-yellow-700",
  Baja: "bg-green-100 text-green-700",
};

const ESTADOS = ["Abierta", "En curso", "Resuelta"];

export default function IncidenciasKanban({ incidencias = [], onUpdated }) {
  const [items, setItems] = useState(() => incidencias);

  React.useEffect(() => {
    setItems(incidencias);
  }, [incidencias]);

  const columns = useMemo(() => {
    return ESTADOS.reduce((acc, estado) => {
      acc[estado] = items.filter((i) => i.estado === estado);
      return acc;
    }, {});
  }, [items]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    const destEstado = destination.droppableId;
    const srcEstado = source.droppableId;
    if (destEstado === srcEstado) return;

    // Optimistic UI
    setItems((prev) =>
      prev.map((i) => (i.id === draggableId ? { ...i, estado: destEstado } : i))
    );

    // Persistir cambio
    const me = await base44.auth.me();
    const current = items.find((i) => i.id === draggableId) || {};
    await base44.entities.Incidencia.update(draggableId, {
      ...current,
      estado: destEstado,
      comentarios: [
        ...(current?.comentarios || []),
        {
          usuario_email: me.email,
          usuario_nombre: me.full_name || me.email,
          mensaje: `Estado: ${srcEstado} → ${destEstado}`,
          fecha: new Date().toISOString(),
          tipo: "cambio_estado",
        },
      ],
      fecha_resolucion:
        destEstado === "Resuelta"
          ? new Date().toISOString()
          : current?.fecha_resolucion || null,
    });

    onUpdated?.();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <DragDropContext onDragEnd={onDragEnd}>
        {ESTADOS.map((estado) => (
          <Droppable droppableId={estado} key={estado}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="bg-white border rounded-xl p-3 min-h-[300px]"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-slate-800">{estado}</p>
                  <Badge variant="outline">{columns[estado]?.length || 0}</Badge>
                </div>
                <div className="space-y-2">
                  {(columns[estado] || []).map((i, idx) => (
                    <Draggable draggableId={i.id} index={idx} key={i.id}>
                      {(prov) => (
                        <Card
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className="p-3 border bg-white/90"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-slate-900 truncate">{i.titulo}</p>
                            <Badge className={prioridadColor[i.prioridad]}>{i.prioridad}</Badge>
                            <Badge variant="outline">{i.tipo}</Badge>
                          </div>
                          {i.descripcion && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-3">{i.descripcion}</p>
                          )}
                          {i.asignado_nombre && (
                            <p className="text-[11px] text-slate-500 mt-1">Asignado: {i.asignado_nombre}</p>
                          )}
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </DragDropContext>
    </div>
  );
}