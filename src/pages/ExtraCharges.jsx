import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Send, X, Trash2 } from "lucide-react";

export default function ExtraCharges() {
  const qc = useQueryClient();
  const { data: charges = [] } = useQuery({
    queryKey: ["extraCharges"],
    queryFn: () => base44.entities.ExtraCharge.list(),
    staleTime: 300000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categoryConfigs"],
    queryFn: () => base44.entities.CategoryConfig.list(),
    staleTime: 300000,
    enabled: false,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  const { data: players = [] } = useQuery({
    queryKey: ["allPlayers", openForm, showPlayerPicker],
    queryFn: () => base44.entities.Player.list(),
    staleTime: 300000,
    enabled: openForm && showPlayerPicker,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Lista corta oficial de categorías (fallback)
  const CATEGORY_OPTIONS = [
    "Fútbol Pre-Benjamín (Mixto)",
    "Fútbol Benjamín (Mixto)",
    "Fútbol Alevín (Mixto)",
    "Fútbol Infantil (Mixto)",
    "Fútbol Cadete",
    "Fútbol Juvenil",
    "Fútbol Aficionado",
    "Fútbol Femenino",
    "Baloncesto (Mixto)"
  ];

  // Categorías activas únicas o fallback
  const categoryNames = React.useMemo(() => {
    const unique = Array.from(new Set((categories || [])
      .filter((c) => c && c.activa && c.nombre)
      .map((c) => c.nombre)));
    return unique.length > 0 ? unique : CATEGORY_OPTIONS;
  }, [categories]);

  // Jugadores filtrados por categorías seleccionadas y búsqueda
  const filteredPlayers = React.useMemo(() => {
    let list = players || [];
    const selected = form.selectedCategories || [];
    if (selected.length > 0) {
      list = list.filter((p) =>
        (p.categoria_principal && selected.includes(p.categoria_principal)) ||
        (Array.isArray(p.categorias) && p.categorias.some((cat) => selected.includes(cat)))
      );
    }
    if (form.playerSearch) {
      const q = form.playerSearch.toLowerCase();
      list = list.filter((p) => p.nombre?.toLowerCase().includes(q));
    }
    return list.slice(0, 50);
  }, [players, form.selectedCategories, form.playerSearch]);

  const [openForm, setOpenForm] = useState(false);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    fecha_limite: "",
    metodos: ["Tarjeta", "Transferencia"],
    items: [{ nombre: "Autobús", precio: 10, obligatorio: false, permite_cantidad: false }],
    selectedCategories: [],
    selectedPlayerIds: [],
    includeCoaches: false,
    includeCoordinators: false,
    includeTreasurer: false,
    includeAdmins: false,
    playerSearch: "",
  });

  const createMutation = useMutation({
    mutationFn: (payload) => base44.entities.ExtraCharge.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["extraCharges"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExtraCharge.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["extraCharges"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ExtraCharge.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["extraCharges"] }),
  });

  const resetForm = () => {
    setForm({
      titulo: "",
      descripcion: "",
      fecha_limite: "",
      metodos: ["Tarjeta", "Transferencia"],
      items: [{ nombre: "Concepto", precio: 1, obligatorio: false, permite_cantidad: false }],
      selectedCategories: [],
      selectedPlayerIds: [],
      includeCoaches: false,
      includeCoordinators: false,
      includeTreasurer: false,
      includeAdmins: false,
      playerSearch: "",
    });
  };

  const addItem = () => {
    setForm((f) => ({ ...f, items: [...f.items, { nombre: "", precio: 0, obligatorio: false, permite_cantidad: false }] }));
  };

  const saveDraft = async () => {
    const destinatarios = [
      ...(form.selectedCategories || []).map(c => ({ tipo: 'categoria', valor: c })),
      ...(form.selectedPlayerIds || []).map(id => ({ tipo: 'jugador', valor: id })),
      ...(form.includeCoaches ? [{ tipo: 'equipo', valor: 'staff:entrenadores' }] : []),
      ...(form.includeCoordinators ? [{ tipo: 'equipo', valor: 'staff:coordinadores' }] : []),
      ...(form.includeTreasurer ? [{ tipo: 'equipo', valor: 'staff:tesoreria' }] : []),
      ...(form.includeAdmins ? [{ tipo: 'equipo', valor: 'staff:admins' }] : []),
    ];
    await createMutation.mutateAsync({
      ...form,
      destinatarios,
      asignado_a: form.selectedPlayerIds || [],
      publicado: false,
      banner_activo: false,
      estado: "borrador",
    });
    resetForm();
    setOpenForm(false);
  };

  const publishCharge = async () => {
    const destinatarios = [
      ...(form.selectedCategories || []).map(c => ({ tipo: 'categoria', valor: c })),
      ...(form.selectedPlayerIds || []).map(id => ({ tipo: 'jugador', valor: id })),
      ...(form.includeCoaches ? [{ tipo: 'equipo', valor: 'staff:entrenadores' }] : []),
      ...(form.includeCoordinators ? [{ tipo: 'equipo', valor: 'staff:coordinadores' }] : []),
      ...(form.includeTreasurer ? [{ tipo: 'equipo', valor: 'staff:tesoreria' }] : []),
      ...(form.includeAdmins ? [{ tipo: 'equipo', valor: 'staff:admins' }] : []),
    ];
    await createMutation.mutateAsync({
      ...form,
      destinatarios,
      asignado_a: form.selectedPlayerIds || [],
      publicado: true,
      banner_activo: true,
      estado: "activo",
    });
    resetForm();
    setOpenForm(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Cobros Extra</h1>
        <Button onClick={() => setOpenForm(true)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Cobro
        </Button>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Métodos</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Banner</TableHead>
                <TableHead>Acciones</TableHead>
                <TableHead>Borrar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.titulo}</TableCell>
                  <TableCell>
                    <Badge className={c.estado === "activo" ? "bg-green-600" : c.estado === "borrador" ? "bg-slate-500" : "bg-orange-600"}>
                      {c.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{(c.metodos || []).join(", ")}</TableCell>
                  <TableCell className="text-sm">{(c.items || []).map(i => i.nombre).join(", ")}</TableCell>
                  <TableCell>{c.banner_activo ? "Sí" : "No"}</TableCell>
                  <TableCell className="flex gap-2">
                    {c.estado !== "activo" && (
                      <Button
                        size="sm"
                        onClick={async () => updateMutation.mutate({ id: c.id, data: { publicado: true, banner_activo: true, estado: "activo" } })}
                      >
                        <Send className="w-4 h-4 mr-1" /> Publicar
                      </Button>
                    )}
                    {c.estado === "activo" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => updateMutation.mutate({ id: c.id, data: { banner_activo: false, estado: "cerrado" } })}
                      >
                        Cerrar
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('¿Borrar este cobro extra? Esta acción no se puede deshacer.')) {
                          deleteMutation.mutate(c.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Borrar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Formulario */}
      {openForm && (
        <Card className="border-2 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Nuevo cobro</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpenForm(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600">Título</label>
                <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-600">Fecha límite</label>
                <Input type="date" value={form.fecha_limite} onChange={(e) => setForm({ ...form, fecha_limite: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-600">Descripción</label>
              <Textarea rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Destinatarios</p>
              {/* Categorías / Equipos */}
              <div>
                <p className="text-xs text-slate-600 mb-1">Categorías / Equipos</p>
                <div className="flex flex-wrap gap-2">
                  {(categoryNames || []).map((name) => (
                    <label key={name} className="text-xs bg-slate-100 px-2 py-1 rounded-md flex items-center gap-2">
                      <Checkbox
                        checked={(form.selectedCategories || []).includes(name)}
                        onCheckedChange={(v) => setForm(f => ({
                          ...f,
                          selectedCategories: v ? [...(f.selectedCategories||[]), name] : (f.selectedCategories||[]).filter(x => x !== name)
                        }))}
                      /> {name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Jugadores individuales */}
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600 mb-1">Jugadores individuales</p>
                  <label className="flex items-center gap-2 text-xs">
                    <span>Elegir jugadores concretos</span>
                    <Switch checked={showPlayerPicker} onCheckedChange={setShowPlayerPicker} />
                  </label>
                </div>
                {showPlayerPicker && (
                  <>
                    <Input
                      placeholder={`Buscar en ${filteredPlayers.length} jugadores...`}
                      value={form.playerSearch}
                      onChange={(e) => setForm({ ...form, playerSearch: e.target.value })}
                    />
                    <div className="mt-2 max-h-40 overflow-auto rounded-md border p-2 bg-white">
                      {filteredPlayers.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-xs py-1">
                          <Checkbox
                            checked={(form.selectedPlayerIds || []).includes(p.id)}
                            onCheckedChange={(v) => setForm((f) => ({
                              ...f,
                              selectedPlayerIds: v ? [...(f.selectedPlayerIds || []), p.id] : (f.selectedPlayerIds || []).filter((x) => x !== p.id)
                            }))}
                          /> {p.nombre}
                        </label>
                      ))}
                      {filteredPlayers.length === 0 && (
                        <p className="text-xs text-slate-500">No hay jugadores que coincidan con el filtro.</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Staff */}
              <div className="mt-3">
                <p className="text-xs text-slate-600 mb-1">Staff</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2"><Checkbox checked={form.includeCoaches} onCheckedChange={(v)=>setForm(f=>({...f, includeCoaches: !!v}))} /> Entrenadores</label>
                  <label className="flex items-center gap-2"><Checkbox checked={form.includeCoordinators} onCheckedChange={(v)=>setForm(f=>({...f, includeCoordinators: !!v}))} /> Coordinadores</label>
                  <label className="flex items-center gap-2"><Checkbox checked={form.includeTreasurer} onCheckedChange={(v)=>setForm(f=>({...f, includeTreasurer: !!v}))} /> Tesorería</label>
                  <label className="flex items-center gap-2"><Checkbox checked={form.includeAdmins} onCheckedChange={(v)=>setForm(f=>({...f, includeAdmins: !!v}))} /> Admins</label>
                </div>
              </div>

              {/* Métodos */}
              <div className="mt-4">
                <p className="text-sm font-semibold">Métodos permitidos</p>
                <div className="flex gap-4">
                  {["Tarjeta", "Transferencia"].map(m => (
                    <label key={m} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.metodos.includes(m)}
                        onCheckedChange={(v) => {
                          setForm((f) => ({
                            ...f,
                            metodos: v ? [...f.metodos, m] : f.metodos.filter(x => x !== m)
                          }));
                        }}
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Ítems</p>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" /> Añadir ítem</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((it, idx) => (
                  <div key={idx} className="grid md:grid-cols-12 gap-2 items-center p-2 rounded-lg bg-slate-50">
                    <Input
                      className="md:col-span-5"
                      placeholder="Nombre"
                      value={it.nombre}
                      onChange={(e) => setForm((f) => {
                        const arr = [...f.items];
                        arr[idx] = { ...arr[idx], nombre: e.target.value };
                        return { ...f, items: arr };
                      })}
                    />
                    <Input
                      className="md:col-span-2"
                      type="number"
                      step="0.01"
                      placeholder="Precio (€)"
                      value={it.precio}
                      onChange={(e) => setForm((f) => {
                        const arr = [...f.items];
                        arr[idx] = { ...arr[idx], precio: Number(e.target.value) };
                        return { ...f, items: arr };
                      })}
                    />
                    <label className="md:col-span-2 flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={it.obligatorio}
                        onCheckedChange={(v) => setForm((f) => {
                          const arr = [...f.items];
                          arr[idx] = { ...arr[idx], obligatorio: !!v };
                          return { ...f, items: arr };
                        })}
                      /> Obligatorio
                    </label>
                    <label className="md:col-span-2 flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={it.permite_cantidad}
                        onCheckedChange={(v) => setForm((f) => {
                          const arr = [...f.items];
                          arr[idx] = { ...arr[idx], permite_cantidad: !!v };
                          return { ...f, items: arr };
                        })}
                      /> Permite cantidad
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button variant="outline" onClick={saveDraft}><Save className="w-4 h-4 mr-1" /> Guardar borrador</Button>
              <Button onClick={publishCharge} className="bg-orange-600 hover:bg-orange-700"><Send className="w-4 h-4 mr-1" /> Publicar ahora</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}