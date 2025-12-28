import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2 } from "lucide-react";
import TemplateForm from "./TemplateForm";

export default function TemplateManager() {
  const qc = useQueryClient();
  const { data: templates = [] } = useQuery({
    queryKey: ["announcementTemplates"],
    queryFn: () => base44.entities.AnnouncementTemplate.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AnnouncementTemplate.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcementTemplates"] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AnnouncementTemplate.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcementTemplates"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AnnouncementTemplate.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcementTemplates"] }),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestor de plantillas</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4"/>Nueva plantilla</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle>
            </DialogHeader>
            <TemplateForm
              initial={editing}
              onCancel={() => { setOpen(false); setEditing(null); }}
              onSubmit={(data) => {
                if (editing) {
                  updateMutation.mutate({ id: editing.id, data });
                } else {
                  createMutation.mutate(data);
                }
                setOpen(false);
                setEditing(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <Separator />
      <CardContent className="grid gap-3">
        {templates.length === 0 && (
          <div className="text-sm text-slate-500">Aún no hay plantillas. Crea tu primera con “Nueva plantilla”.</div>
        )}
        {templates.map((tpl) => (
          <div key={tpl.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
            <div>
              <div className="font-medium">{tpl.nombre}</div>
              <div className="text-xs text-slate-500 mt-1">Estilo: {tpl.estilo} • Tono: {tpl.tono}</div>
              {tpl.activa === false && <Badge variant="outline" className="mt-1">Inactiva</Badge>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => { setEditing(tpl); setOpen(true); }}>
                <Pencil className="h-4 w-4"/>
              </Button>
              <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate(tpl.id)}>
                <Trash2 className="h-4 w-4"/>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}