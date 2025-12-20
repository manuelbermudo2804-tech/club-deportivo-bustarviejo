import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Settings, GripVertical, Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DashboardButtonConfig({ 
  availableButtons, 
  currentConfig, 
  onSave 
}) {
  const [open, setOpen] = useState(false);
  const [buttons, setButtons] = useState(() => {
    // Inicializar con la configuración actual o los 6 primeros por defecto
    const config = currentConfig || availableButtons.slice(0, 6).map(b => b.id);
    return availableButtons.map(btn => ({
      ...btn,
      visible: config.includes(btn.id),
      order: config.indexOf(btn.id) >= 0 ? config.indexOf(btn.id) : 999
    })).sort((a, b) => a.order - b.order);
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(buttons);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setButtons(items);
  };

  const toggleVisibility = (buttonId) => {
    const visibleCount = buttons.filter(b => b.visible).length;
    const button = buttons.find(b => b.id === buttonId);
    
    // No permitir desactivar si solo quedan 1 botón visible
    if (button.visible && visibleCount <= 1) {
      toast.error("Debe haber al menos 1 botón visible");
      return;
    }
    
    // No permitir activar si ya hay 9 visibles
    if (!button.visible && visibleCount >= 9) {
      toast.error("Máximo 9 botones visibles");
      return;
    }
    
    setButtons(buttons.map(b => 
      b.id === buttonId ? { ...b, visible: !b.visible } : b
    ));
  };

  const handleSave = async () => {
    const visibleButtons = buttons.filter(b => b.visible).map(b => b.id);
    
    try {
      await base44.auth.updateMe({
        dashboard_buttons_config: visibleButtons
      });
      onSave(visibleButtons);
      toast.success("✅ Configuración guardada");
      setOpen(false);
    } catch (error) {
      toast.error("Error al guardar");
      console.error(error);
    }
  };

  const resetToDefault = () => {
    setButtons(availableButtons.map((btn, idx) => ({
      ...btn,
      visible: idx < 6,
      order: idx
    })));
  };

  const visibleCount = buttons.filter(b => b.visible).length;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="border-orange-500 text-orange-600 hover:bg-orange-50"
      >
        <Settings className="w-4 h-4 mr-2" />
        Personalizar Botones
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-600" />
              Personalizar Botones del Dashboard
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <p className="text-sm text-slate-700">
                <strong className="text-orange-700">{visibleCount}/9 botones</strong> visibles
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Arrastra para reordenar • Click en 👁️ para mostrar/ocultar
              </p>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="buttons">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {buttons.map((button, index) => (
                      <Draggable 
                        key={button.id} 
                        draggableId={button.id} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`transition-all ${
                              snapshot.isDragging ? 'opacity-50' : ''
                            }`}
                          >
                            <Card className={`p-3 ${
                              button.visible 
                                ? 'bg-white border-2 border-orange-300' 
                                : 'bg-slate-100 border border-slate-300 opacity-50'
                            }`}>
                              <div className="flex items-center gap-3">
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                                </div>
                                
                                <div className={`w-10 h-10 rounded-lg ${button.bgColor} flex items-center justify-center flex-shrink-0`}>
                                  <button.icon className="w-5 h-5 text-white" />
                                </div>
                                
                                <div className="flex-1">
                                  <p className="font-semibold text-sm text-slate-900">
                                    {button.label}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {button.description}
                                  </p>
                                </div>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleVisibility(button.id)}
                                  className="flex-shrink-0"
                                >
                                  {button.visible ? (
                                    <Eye className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <EyeOff className="w-4 h-4 text-slate-400" />
                                  )}
                                </Button>
                              </div>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={resetToDefault}
                className="flex-1"
              >
                Restaurar predeterminados
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}