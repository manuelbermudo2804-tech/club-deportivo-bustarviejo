import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import ComercioForm from "./ComercioForm";

export default function LoteriaCampanaAdmin() {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(null); // 'nuevo' | id
  const [form, setForm] = useState(null);

  const { data: campana, isSuccess: campanaCargada } = useQuery({
    queryKey: ["loteriaCampana"],
    queryFn: async () => {
      const list = await base44.entities.LoteriaCampana.list();
      return list[0] || null;
    },
  });

  const { data: comercios = [] } = useQuery({
    queryKey: ["loteriaComercios"],
    queryFn: async () => {
      const list = await base44.entities.LoteriaComercio.list();
      return list.sort((a, b) => (a.orden || 0) - (b.orden || 0));
    },
  });

  React.useEffect(() => {
    if (!campanaCargada || form) return;
    if (campana) {
      setForm(campana);
    } else {
      setForm({
        activa: false,
        titulo: "Lotería de Navidad",
        numero: "",
        precio_decimo: 25,
        fecha_sorteo_texto: "22 de diciembre",
        tulotero_url: "",
        tulotero_password: "",
        texto_intro: "",
        texto_como_funciona: "",
        mensaje_whatsapp: "",
      });
    }
  }, [campana, campanaCargada, form]);

  const guardarCampana = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, precio_decimo: Number(data.precio_decimo) || 0 };
      if (campana?.id) return base44.entities.LoteriaCampana.update(campana.id, payload);
      return base44.entities.LoteriaCampana.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loteriaCampana"] });
      toast.success("✅ Campaña guardada");
    },
  });

  const guardarComercio = useMutation({
    mutationFn: async ({ id, data }) => {
      if (id && id !== "nuevo") return base44.entities.LoteriaComercio.update(id, data);
      return base44.entities.LoteriaComercio.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loteriaComercios"] });
      setEditando(null);
      toast.success("✅ Comercio guardado");
    },
  });

  const borrarComercio = useMutation({
    mutationFn: (id) => base44.entities.LoteriaComercio.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loteriaComercios"] });
      toast.success("Comercio eliminado");
    },
  });

  if (!form) return null;

  return (
    <div className="space-y-4">
      <Card className="border-2 border-red-200">
        <CardHeader className="bg-gradient-to-r from-red-50 to-green-50">
          <CardTitle className="text-lg flex items-center justify-between gap-3">
            <span>🎄 Campaña de lotería (página pública)</span>
            <a href="/loteria" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 flex items-center gap-1">
              Ver página <ExternalLink className="w-4 h-4" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
            <div>
              <p className="font-semibold text-slate-900">Página pública activa</p>
              <p className="text-xs text-slate-600">Si la desactivas, la página deja de mostrar la campaña</p>
            </div>
            <Switch checked={form.activa === true} onCheckedChange={(v) => setForm({ ...form, activa: v })} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={form.titulo || ""} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Número de lotería</Label>
              <Input value={form.numero || ""} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="28720" />
            </div>
            <div className="space-y-1">
              <Label>Precio del décimo (€)</Label>
              <Input type="number" value={form.precio_decimo ?? ""} onChange={(e) => setForm({ ...form, precio_decimo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Fecha del sorteo</Label>
              <Input value={form.fecha_sorteo_texto || ""} onChange={(e) => setForm({ ...form, fecha_sorteo_texto: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Enlace de TuLotero</Label>
              <Input value={form.tulotero_url || ""} onChange={(e) => setForm({ ...form, tulotero_url: e.target.value })} placeholder="https://tulotero.com/..." />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Contraseña del enlace de TuLotero</Label>
              <Input value={form.tulotero_password || ""} onChange={(e) => setForm({ ...form, tulotero_password: e.target.value })} placeholder="Ej: BUSTA2026" />
              <p className="text-xs text-slate-500">Se mostrará en la página pública para que puedan entrar al grupo del club.</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Texto de presentación (opcional)</Label>
              <Textarea value={form.texto_intro || ""} onChange={(e) => setForm({ ...form, texto_intro: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Cómo funciona (opcional — si lo dejas vacío se usa la explicación por defecto)</Label>
              <Textarea value={form.texto_como_funciona || ""} onChange={(e) => setForm({ ...form, texto_como_funciona: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Mensaje para compartir por WhatsApp</Label>
              <Textarea
                value={form.mensaje_whatsapp || ""}
                onChange={(e) => setForm({ ...form, mensaje_whatsapp: e.target.value })}
                placeholder="🍀🎄 ¡Ya está aquí la Lotería de Navidad del CD Bustarviejo!..."
              />
              <p className="text-xs text-slate-500">Al mensaje se le añade automáticamente el enlace de la página.</p>
            </div>
          </div>

          <Button onClick={() => guardarCampana.mutate(form)} disabled={guardarCampana.isPending} className="bg-green-600 hover:bg-green-700">
            {guardarCampana.isPending ? "Guardando..." : "Guardar campaña"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-orange-200">
        <CardHeader className="bg-orange-50 flex-row items-center justify-between">
          <CardTitle className="text-lg">🏪 Comercios colaboradores</CardTitle>
          <Button size="sm" onClick={() => setEditando("nuevo")} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-1" /> Añadir
          </Button>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {editando === "nuevo" && (
            <ComercioForm
              onSave={(data) => guardarComercio.mutate({ id: "nuevo", data })}
              onCancel={() => setEditando(null)}
            />
          )}

          {comercios.length === 0 && editando !== "nuevo" && (
            <p className="text-slate-500 text-sm">Todavía no has añadido comercios.</p>
          )}

          {comercios.map((c) =>
            editando === c.id ? (
              <ComercioForm
                key={c.id}
                comercio={c}
                onSave={(data) => guardarComercio.mutate({ id: c.id, data })}
                onCancel={() => setEditando(null)}
              />
            ) : (
              <div key={c.id} className="flex items-center gap-3 bg-white border rounded-xl p-3">
                <div className="w-12 h-12 rounded-lg bg-slate-50 border flex items-center justify-center overflow-hidden shrink-0">
                  {c.logo_url ? <img src={c.logo_url} alt={c.nombre} className="w-full h-full object-contain p-1" /> : <span className="text-xl">🏪</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{c.nombre}</p>
                  <p className="text-xs text-slate-600 truncate">{c.direccion || "Sin dirección"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditando(c.id)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="border-red-300 text-red-600" onClick={() => borrarComercio.mutate(c.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}