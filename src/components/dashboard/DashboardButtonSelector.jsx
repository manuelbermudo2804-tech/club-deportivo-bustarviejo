import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, GripVertical, Eye, EyeOff, RotateCcw } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";

export default function DashboardButtonSelector({ 
  allButtons, 
  selectedButtonIds, 
  onSave, 
  minButtons = 4, 
  maxButtons = 999,
  defaultButtons,
  panelName = "Dashboard"
}) {
  const [open, setOpen] = useState(false);
  const [localSelected, setLocalSelected] = useState(selectedButtonIds);

  const handleToggle = (buttonId) => {
    if (localSelected.includes(buttonId)) {
      if (localSelected.length <= minButtons) {
        toast.error(`Mínimo ${minButtons} botones requeridos`);
        return;
      }
      setLocalSelected(localSelected.filter(id => id !== buttonId));
    } else {
      setLocalSelected([...localSelected, buttonId]);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(localSelected);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setLocalSelected(items);
  };

  const handleSave = () => {
    onSave(localSelected);
    setOpen(false);
    toast.success("✅ Configuración guardada");
  };

  const handleReset = () => {
    setLocalSelected(defaultButtons);
    toast.info("🔄 Configuración restaurada");
  };

  const selectedButtons = localSelected
    .map(id => allButtons.find(b => b.id === id))
    .filter(Boolean);

  const availableButtons = allButtons.filter(b => !localSelected.includes(b.id));

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="bg-slate-800 hover:bg-slate-700 text-white border-slate-600"
      >
        <Settings className="w-4 h-4 mr-2" />
        Personalizar {panelName}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>⚙️ Personalizar {panelName}</DialogTitle>
            <p className="text-sm text-slate-600">
              Elige los botones que quieras ver. Arrastra para reordenar.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 p-1">
            {/* Botones Seleccionados (Reordenables) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">
                  ✅ Tus Botones ({localSelected.length})
                </h3>
                <Badge className={localSelected.length < minButtons ? "bg-red-500" : "bg-green-500"}>
                  {localSelected.length < minButtons ? `Faltan ${minButtons - localSelected.length}` : "Válido"}
                </Badge>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="selected">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2 min-h-[100px] bg-slate-50 rounded-lg p-2"
                    >
                      {selectedButtons.map((button, index) => (
                        <Draggable key={button.id} draggableId={button.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                                snapshot.isDragging 
                                  ? 'bg-white border-orange-500 shadow-lg' 
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab" />
                              </div>
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${button.gradient} flex items-center justify-center flex-shrink-0`}>
                                <button.icon className="w-5 h-5 text-white" />
                              </div>
                              <span className="flex-1 font-medium text-sm">{button.title}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggle(button.id)}
                                disabled={localSelected.length <= minButtons}
                              >
                                <EyeOff className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* Botones Disponibles */}
            {availableButtons.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  ➕ Disponibles para Añadir ({availableButtons.length})
                </h3>
                <div className="space-y-2">
                  {availableButtons.map((button) => (
                    <div
                      key={button.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border-2 border-slate-200 hover:border-slate-300 transition-all"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${button.gradient} flex items-center justify-center flex-shrink-0`}>
                        <button.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="flex-1 font-medium text-sm">{button.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(button.id)}
                      >
                        <Eye className="w-4 h-4 text-green-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar por Defecto
            </Button>
            <Button onClick={handleSave} disabled={localSelected.length < minButtons}>
              Guardar Configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}