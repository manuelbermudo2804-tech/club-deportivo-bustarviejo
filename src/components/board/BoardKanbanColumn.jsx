import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import BoardTaskCard from "./BoardTaskCard";

export default function BoardKanbanColumn({ columnId, title, tasks, onEdit, onDelete, onComplete }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 shadow-sm min-h-[200px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-700 text-sm">{title} <span className="text-slate-400">({tasks.length})</span></h3>
      </div>
      <Droppable droppableId={columnId}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 min-h-[100px]">
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(dragProvided) => (
                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                    <BoardTaskCard task={task} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}