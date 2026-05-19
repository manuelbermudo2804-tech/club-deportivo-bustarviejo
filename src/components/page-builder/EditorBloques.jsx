import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Trash2, ChevronRight, Copy } from "lucide-react";
import { BLOCK_CATALOG, getBlockMeta } from "./blockTypes";
import EditorBloqueProps from "./EditorBloqueProps";

// Editor visual de bloques: lista con drag&drop + edición de propiedades del bloque seleccionado.
export default function EditorBloques({ bloques = [], onChange }) {
  const [openIdx, setOpenIdx] = useState(null);
  const [showCatalog, setShowCatalog] = useState(false);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const next = [...bloques];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    onChange(next);
  };

  const addBlock = (meta) => {
    const newBlock = {
      id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tipo: meta.tipo,
      datos: JSON.parse(JSON.stringify(meta.datosDefault || {})),
    };
    onChange([...bloques, newBlock]);
    setShowCatalog(false);
    setOpenIdx(bloques.length);
  };

  const updateBlock = (idx, updated) => {
    const next = [...bloques];
    next[idx] = updated;
    onChange(next);
  };

  const deleteBlock = (idx) => {
    onChange(bloques.filter((_, i) => i !== idx));
    if (openIdx === idx) setOpenIdx(null);
  };

  const duplicateBlock = (idx) => {
    const copy = { ...bloques[idx], id: `b_${Date.now()}` };
    const next = [...bloques];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-base">🧱 Bloques ({bloques.length})</h3>
        <Button size="sm" onClick={() => setShowCatalog(true)} className="gap-1">
          <Plus className="w-4 h-4" /> Añadir
        </Button>
      </div>

      {bloques.length === 0 ? (
        <div className="p-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-2">🧱</div>
          <p className="text-sm text-slate-500 mb-3">Tu página no tiene bloques de contenido.</p>
          <Button size="sm" variant="outline" onClick={() => setShowCatalog(true)} className="gap-1">
            <Plus className="w-4 h-4" /> Añadir primer bloque
          </Button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="bloques">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {bloques.map((b, idx) => {
                  const meta = getBlockMeta(b.tipo);
                  const isOpen = openIdx === idx;
                  return (
                    <Draggable key={b.id} draggableId={b.id} index={idx}>
                      {(prov, snapshot) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                            snapshot.isDragging ? "shadow-2xl border-slate-900" : "border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 p-2.5">
                            <div {...prov.dragHandleProps} className="text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing p-1">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <button
                              onClick={() => setOpenIdx(isOpen ? null : idx)}
                              className="flex items-center gap-2 flex-1 text-left min-w-0"
                            >
                              <span className="text-xl flex-shrink-0">{meta?.emoji || "📦"}</span>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-sm text-slate-900 truncate">
                                  {meta?.nombre || b.tipo}
                                </div>
                                <div className="text-xs text-slate-400 truncate">
                                  {b.datos?.titulo || b.datos?.texto || meta?.descripcion}
                                </div>
                              </div>
                              <ChevronRight
                                className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
                              />
                            </button>
                            <button
                              onClick={() => duplicateBlock(idx)}
                              className="text-slate-400 hover:text-slate-700 p-1.5"
                              title="Duplicar"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteBlock(idx)}
                              className="text-slate-400 hover:text-red-600 p-1.5"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {isOpen && (
                            <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                              <EditorBloqueProps
                                bloque={b}
                                onChange={(updated) => updateBlock(idx, updated)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Catálogo de bloques */}
      {showCatalog && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setShowCatalog(false)}
        >
          <div
            className="max-w-2xl mx-auto my-8 bg-white rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Añadir bloque</h3>
              <button onClick={() => setShowCatalog(false)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {BLOCK_CATALOG.map((b) => (
                <button
                  key={b.tipo}
                  onClick={() => addBlock(b)}
                  className="text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-slate-900 hover:shadow-lg transition-all group"
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{b.emoji}</div>
                  <div className="font-bold text-slate-900 text-sm mb-1">{b.nombre}</div>
                  <div className="text-xs text-slate-500 leading-snug">{b.descripcion}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}