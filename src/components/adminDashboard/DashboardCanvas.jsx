import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Save, Edit3 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import WidgetShell from "./WidgetShell";
import WidgetPicker from "./WidgetPicker";

function reorder(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result.map((w, idx) => ({ ...w, order: idx }));
}

export default function DashboardCanvas({ registry, getDefaultWidgets }) {
  const qc = useQueryClient();
  const [editMode, setEditMode] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ["adminDashboardConfig", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.AdminDashboardConfig.filter({ user_email: user.email });
    },
    enabled: !!user?.email,
    staleTime: 0,
  });

  const current = configs[0];

  const initialWidgets = React.useMemo(() => {
    if (current?.widgets?.length) return [...current.widgets].sort((a,b) => a.order - b.order);
    return getDefaultWidgets();
  }, [current, getDefaultWidgets]);

  const [widgets, setWidgets] = React.useState(initialWidgets);
  React.useEffect(() => setWidgets(initialWidgets), [initialWidgets]);

  const saveMutation = useMutation({
    mutationFn: async (newWidgets) => {
      if (current) {
        return await base44.entities.AdminDashboardConfig.update(current.id, { widgets: newWidgets });
      }
      return await base44.entities.AdminDashboardConfig.create({ user_email: user.email, widgets: newWidgets });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminDashboardConfig"] });
    }
  });

  const regMap = React.useMemo(() => Object.fromEntries(registry.map(r => [r.key, r])), [registry]);
  const presentKeys = widgets.map(w => w.key);
  const availableToAdd = registry.filter(r => !presentKeys.includes(r.key));

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const newOrder = reorder(widgets, result.source.index, result.destination.index);
    setWidgets(newOrder);
  };

  const handleRemove = (key) => {
    setWidgets(prev => prev.filter(w => w.key !== key).map((w, i) => ({ ...w, order: i })));
  };

  const addWidget = (reg) => {
    setWidgets(prev => [...prev, { key: reg.key, order: prev.length, cols: reg.defaultCols || 1, enabled: true, props: reg.defaultProps || {} }]);
  };

  const gridClass = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4";
  const colClass = (cols) => cols === 2 ? "md:col-span-2" : "md:col-span-1";

  return (
    <div className="bg-slate-50 rounded-2xl p-3 lg:p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-slate-900 font-bold text-lg">Panel personalizable (Admin)</h2>
        <div className="flex items-center gap-2">
          <Button variant={editMode ? "default" : "outline"} onClick={() => setEditMode(v => !v)} className="gap-2">
            <Edit3 className="w-4 h-4" /> {editMode ? "Editar: ON" : "Editar"}
          </Button>
          {editMode && (
            <>
              <Button variant="outline" onClick={() => setPickerOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Añadir widget
              </Button>
              <Button onClick={() => saveMutation.mutate(widgets)} className="gap-2 bg-orange-600 hover:bg-orange-700">
                <Save className="w-4 h-4" /> Guardar
              </Button>
            </>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="adminDashboard">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className={gridClass}>
              {widgets.map((w, index) => {
                const reg = regMap[w.key];
                if (!reg) return null;
                const WidgetComp = reg.component;
                return (
                  <Draggable key={w.key} draggableId={w.key} index={index} isDragDisabled={!editMode}>
                    {(drag) => (
                      <div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps} className={colClass(w.cols || 1)}>
                        <WidgetShell title={reg.title} editMode={editMode} onRemove={() => handleRemove(w.key)}>
                          <WidgetComp {...(w.props || {})} />
                        </WidgetShell>
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

      <WidgetPicker open={pickerOpen} onClose={setPickerOpen} available={availableToAdd} onAdd={addWidget} />
    </div>
  );
}