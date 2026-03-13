import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Edit2, Trash2, Plus, AlertTriangle, CheckCircle2, Lock, Loader2, Smartphone, Dumbbell, Activity } from "lucide-react";
import { toast } from "sonner";

// 9 categorías BASE que NUNCA pueden ser eliminadas
const BASE_CATEGORIES = [
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

// Cuotas por defecto de respaldo si no existen categorías previas
const DEFAULT_BASE_QUOTAS = {
  "Fútbol Pre-Benjamín (Mixto)": { inscripcion: 100, segunda: 75, tercera: 75 },
  "Fútbol Benjamín (Mixto)": { inscripcion: 100, segunda: 75, tercera: 75 },
  "Fútbol Alevín (Mixto)": { inscripcion: 115, segunda: 83, tercera: 83 },
  "Fútbol Infantil (Mixto)": { inscripcion: 115, segunda: 83, tercera: 83 },
  "Fútbol Cadete": { inscripcion: 135, segunda: 100, tercera: 95 },
  "Fútbol Juvenil": { inscripcion: 135, segunda: 100, tercera: 95 },
  "Fútbol Aficionado": { inscripcion: 165, segunda: 100, tercera: 95 },
  "Fútbol Femenino": { inscripcion: 135, segunda: 100, tercera: 95 },
  "Baloncesto (Mixto)": { inscripcion: 50, segunda: 50, tercera: 50 }
};

export default function CategoryConfigAdmin() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSeason, setActiveSeason] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    cuota_inscripcion: 0,
    cuota_segunda: 0,
    cuota_tercera: 0,
    es_actividad_complementaria: false,
    incluye_preparacion_fisica: false,
    suplemento_prep_fisica: 0,
    deporte: "Fútbol"
  });
  const [isCreating, setIsCreating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Fetch active season
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.SeasonConfig.list('-created_date'),
  });

  useEffect(() => {
    const active = seasons.find(s => s.activa === true);
    setActiveSeason(active);
  }, [seasons]);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categoryConfig', activeSeason?.id],
    queryFn: () => activeSeason 
      ? base44.entities.CategoryConfig.filter({ temporada: activeSeason.temporada })
      : Promise.resolve([]),
    enabled: !!activeSeason
  });

  // Crear 9 categorías BASE (con backoff automático y bulkCreate para evitar 429)
  const createBaseCategoriesForActiveSeason = async () => {
    if (!activeSeason) return;
    setIsCreating(true);

    const missingNames = BASE_CATEGORIES.filter(name => !categories.some(c => c.nombre === name));
    if (missingNames.length === 0) {
      toast.success('Ya existían las categorías BASE de esta temporada');
      setIsCreating(false);
      return;
    }

    try {
      const allExisting = await base44.entities.CategoryConfig.list();
      const items = missingNames.map((name) => {
        const fromPrevious = allExisting.find(c => c.nombre === name && c.es_base === true);
        const cuotas = fromPrevious ? {
          inscripcion: fromPrevious.cuota_inscripcion,
          segunda: fromPrevious.cuota_segunda,
          tercera: fromPrevious.cuota_tercera,
        } : DEFAULT_BASE_QUOTAS[name];

        return {
          nombre: name,
          temporada: activeSeason.temporada,
          activa: true,
          es_base: true,
          deporte: name.includes('Baloncesto') ? 'Baloncesto' : 'Fútbol',
          cuota_inscripcion: cuotas?.inscripcion || 0,
          cuota_segunda: cuotas?.segunda || 0,
          cuota_tercera: cuotas?.tercera || 0,
          cuota_total: (cuotas?.inscripcion || 0) + (cuotas?.segunda || 0) + (cuotas?.tercera || 0)
        };
      });

      const attempt = async (n) => {
        try {
          if (items.length > 0) {
            // Un único request reduce riesgo de 429
            await base44.entities.CategoryConfig.bulkCreate(items);
          }
          await queryClient.invalidateQueries({ queryKey: ['categoryConfig', activeSeason?.id] });
          await queryClient.invalidateQueries({ queryKey: ['categoryConfig'] });
          toast.success(`Categorías BASE creadas para ${activeSeason.temporada}`);
          setIsCreating(false);
          setRetryCount(0);
        } catch (err) {
          const status = err?.response?.status;
          const is503 = status === 503 || (err?.message || '').includes('503');
          const is429 = status === 429 || (err?.message || '').includes('429');
          if (is503 || is429) {
            const delay = Math.min(60000, Math.floor((is503 ? 3000 : 1500) * Math.pow(2, n)));
            setRetryCount(n + 1);
            toast.info(is503
              ? `Mantenimiento activo: reintentando en ${Math.round(delay/1000)}s...`
              : `Demasiadas peticiones: reintentando en ${Math.round(delay/1000)}s...`);
            setTimeout(() => attempt(n + 1), delay);
          } else {
            console.error('Error creando categorías base:', err);
            toast.error('No se pudieron crear las categorías base');
            setIsCreating(false);
          }
        }
      };

      await attempt(retryCount);
    } catch (e) {
      console.error('Error preparando categorías base:', e);
      toast.error('No se pudieron preparar las categorías base');
      setIsCreating(false);
    }
  };
  // Mutations
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CategoryConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoryConfig'] });
      toast.success("✅ Categoría actualizada");
      setShowDialog(false);
      setEditingId(null);
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.CategoryConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoryConfig'] });
      toast.success("✅ Categoría creada");
      setShowDialog(false);
      setFormData({ nombre: "", cuota_inscripcion: 0, cuota_segunda: 0, cuota_tercera: 0, es_actividad_complementaria: false, incluye_preparacion_fisica: false, suplemento_prep_fisica: 0, deporte: "Fútbol" });
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.CategoryConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoryConfig'] });
      toast.success("✅ Categoría eliminada");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    }
  });

  // Handlers
  const handleEdit = (category) => {
    setEditingId(category.id);
    setFormData({
      nombre: category.nombre,
      cuota_inscripcion: category.cuota_inscripcion,
      cuota_segunda: category.cuota_segunda,
      cuota_tercera: category.cuota_tercera,
      es_actividad_complementaria: category.es_actividad_complementaria || false,
      incluye_preparacion_fisica: category.incluye_preparacion_fisica || false,
      suplemento_prep_fisica: category.suplemento_prep_fisica || 0,
      deporte: category.deporte || "Fútbol"
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.nombre) {
      toast.error("El nombre es requerido");
      return;
    }

    const dataToSave = {
      ...formData,
      cuota_total: formData.cuota_inscripcion + formData.cuota_segunda + formData.cuota_tercera,
      // Si es complementaria, nunca compite en liga
      compite_en_liga: formData.es_actividad_complementaria ? false : undefined
    };

    if (editingId) {
      updateCategoryMutation.mutate({ id: editingId, data: dataToSave });
    } else {
      createCategoryMutation.mutate({
        ...dataToSave,
        temporada: activeSeason.temporada,
        es_base: BASE_CATEGORIES.includes(formData.nombre),
        activa: true
      });
    }
  };

  const handleDelete = (category) => {
    if (BASE_CATEGORIES.includes(category.nombre)) {
      toast.error("❌ No puedes eliminar una categoría BASE");
      return;
    }

    if (confirm(`¿Eliminar categoría "${category.nombre}"?`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const baseCategories = categories.filter(c => BASE_CATEGORIES.includes(c.nombre));
  const extraCategories = categories.filter(c => !BASE_CATEGORIES.includes(c.nombre));
  const missingBaseCount = BASE_CATEGORIES.filter(name => !categories.some(c => c.nombre === name)).length;

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            No tienes permisos para acceder a esta sección.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!activeSeason) {
    return (
      <div className="p-6">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 ml-2">
            No hay temporada activa. Crea una antes de gestionar categorías.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">💰 Gestión de Categorías y Cuotas</h1>
        <p className="text-slate-600 mt-1">Temporada: <strong>{activeSeason.temporada}</strong></p>
      </div>

      {missingBaseCount > 0 && (
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="py-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-900">Faltan {missingBaseCount} de 9 categorías BASE en esta temporada</p>
              <p className="text-sm text-amber-800">Pulsa el botón para completar automáticamente las que falten con sus cuotas.</p>
            </div>
            <Button
              onClick={createBaseCategoriesForActiveSeason}
              disabled={isCreating}
              className={`bg-amber-600 hover:bg-amber-700 ${isCreating ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              {isCreating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</>) : 'Completar categorías BASE'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabla: 9 CATEGORÍAS BASE */}
      <Card className="border-2 border-green-300">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <CardTitle className="text-green-900">✅ 9 Categorías BASE (INMUTABLES)</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {missingBaseCount > 0 && (
                <Button
                  onClick={createBaseCategoriesForActiveSeason}
                  size="sm"
                  disabled={isCreating}
                  className={`bg-amber-600 hover:bg-amber-700 ${isCreating ? 'opacity-80 cursor-not-allowed' : ''}`}
                >
                  {isCreating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</>) : `Completar (${missingBaseCount})`}
                </Button>
              )}
              <Badge className="bg-green-600">Siempre {BASE_CATEGORIES.length}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-green-50 border-b-2 border-green-300">
                <tr>
                  <th className="px-4 py-2 text-left font-bold text-slate-900">Categoría</th>
                  <th className="px-4 py-2 text-center font-bold text-slate-900">Liga</th>
                  <th className="px-4 py-2 text-center font-bold text-slate-900">📲 Check-in</th>
                  <th className="px-4 py-2 text-right font-bold text-slate-900">Inscripción</th>
                  <th className="px-4 py-2 text-right font-bold text-slate-900">2ª Cuota</th>
                  <th className="px-4 py-2 text-right font-bold text-slate-900">3ª Cuota</th>
                  <th className="px-4 py-2 text-right font-bold text-slate-900">Total</th>
                  <th className="px-4 py-2 text-center font-bold text-slate-900">Acciones</th>
                </tr>
                </thead>
                <tbody>
                {baseCategories.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((cat) => (
                  <tr key={cat.id} className={`border-b hover:bg-green-50 transition ${!cat.activa ? 'opacity-50 bg-slate-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {cat.nombre}
                      {!cat.activa && <Badge className="ml-2 bg-slate-500 text-white text-xs">Oculta</Badge>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => updateCategoryMutation.mutate({ id: cat.id, data: { compite_en_liga: !cat.compite_en_liga } })}
                        className={`px-2 py-1 rounded-full text-xs font-bold transition-colors ${cat.compite_en_liga ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                      >
                        {cat.compite_en_liga ? '⚽ Sí' : 'No'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={!!cat.checkin_automatico}
                        onCheckedChange={(v) => updateCategoryMutation.mutate({ id: cat.id, data: { checkin_automatico: v } })}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">{cat.cuota_inscripcion}€</td>
                    <td className="px-4 py-3 text-right">{cat.cuota_segunda}€</td>
                    <td className="px-4 py-3 text-right">{cat.cuota_tercera}€</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">{cat.cuota_total}€</td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(cat)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={cat.activa ? "outline" : "default"}
                        onClick={() => {
                          updateCategoryMutation.mutate({
                            id: cat.id,
                            data: { activa: !cat.activa }
                          });
                        }}
                        className={cat.activa ? "text-orange-600 hover:text-orange-700" : "bg-green-600 hover:bg-green-700 text-white"}
                      >
                        {cat.activa ? "Ocultar" : "Activar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-green-700 mt-3">
            🔒 Las 9 categorías BASE nunca pueden ser eliminadas. Solo puedes editar sus precios. 
            Al resetear la temporada, estos precios se copian automáticamente a la nueva temporada.
          </p>
          <p className="text-xs text-blue-700 mt-1">
            📲 <strong>Check-in:</strong> Activa el switch para que los jugadores se registren tocando su foto en la tablet. El entrenador verá la asistencia pre-rellenada.
          </p>
        </CardContent>
      </Card>

      {/* Tabla: CATEGORÍAS EXTRA (opcional) */}
      {extraCategories.length > 0 && (
        <Card className="border-2 border-orange-300">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-orange-900">📌 Categorías Extra (Opcional)</CardTitle>
              <Badge className="bg-orange-600">{extraCategories.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-orange-50 border-b-2 border-orange-300">
                  <tr>
                    <th className="px-4 py-2 text-left font-bold text-slate-900">Categoría</th>
                    <th className="px-4 py-2 text-center font-bold text-slate-900">Liga</th>
                    <th className="px-4 py-2 text-center font-bold text-slate-900">📲 Check-in</th>
                    <th className="px-4 py-2 text-right font-bold text-slate-900">Inscripción</th>
                    <th className="px-4 py-2 text-right font-bold text-slate-900">2ª Cuota</th>
                    <th className="px-4 py-2 text-right font-bold text-slate-900">3ª Cuota</th>
                    <th className="px-4 py-2 text-right font-bold text-slate-900">Total</th>
                    <th className="px-4 py-2 text-center font-bold text-slate-900">Acciones</th>
                  </tr>
                  </thead>
                  <tbody>
                  {extraCategories.map((cat) => (
                    <tr key={cat.id} className={`border-b hover:bg-orange-50 transition ${!cat.activa ? 'opacity-50 bg-slate-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {cat.nombre}
                        {!cat.activa && <Badge className="ml-2 bg-slate-500 text-white text-xs">Oculta</Badge>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => updateCategoryMutation.mutate({ id: cat.id, data: { compite_en_liga: !cat.compite_en_liga } })}
                          className={`px-2 py-1 rounded-full text-xs font-bold transition-colors ${cat.compite_en_liga ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        >
                          {cat.compite_en_liga ? '⚽ Sí' : 'No'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={!!cat.checkin_automatico}
                          onCheckedChange={(v) => updateCategoryMutation.mutate({ id: cat.id, data: { checkin_automatico: v } })}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">{cat.cuota_inscripcion}€</td>
                      <td className="px-4 py-3 text-right">{cat.cuota_segunda}€</td>
                      <td className="px-4 py-3 text-right">{cat.cuota_tercera}€</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-700">{cat.cuota_total}€</td>
                      <td className="px-4 py-3 text-center space-x-1">
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => handleEdit(cat)}
                         className="text-blue-600 hover:text-blue-700"
                       >
                         <Edit2 className="w-4 h-4" />
                       </Button>
                       <Button
                         size="sm"
                         variant={cat.activa ? "outline" : "default"}
                         onClick={() => {
                           updateCategoryMutation.mutate({
                             id: cat.id,
                             data: { activa: !cat.activa }
                           });
                         }}
                         className={cat.activa ? "text-orange-600 hover:text-orange-700" : "bg-green-600 hover:bg-green-700 text-white"}
                       >
                         {cat.activa ? "Ocultar" : "Activar"}
                       </Button>
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => handleDelete(cat)}
                         className="text-red-600 hover:text-red-700"
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botón para añadir categoría extra */}
      <Button
        onClick={() => {
          setEditingId(null);
          setFormData({ nombre: "", cuota_inscripcion: 0, cuota_segunda: 0, cuota_tercera: 0 });
          setShowDialog(true);
        }}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Añadir Nueva Categoría Extra
      </Button>

      {/* Dialog: Editar/Crear Categoría */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "✏️ Editar Categoría" : "➕ Crear Categoría Extra"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Fútbol Pre-Benjamín (Mixto)"
                disabled={editingId && BASE_CATEGORIES.includes(formData.nombre)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Cuota Inscripción (€)</label>
              <Input
                type="number"
                value={formData.cuota_inscripcion}
                onChange={(e) => setFormData({ ...formData, cuota_inscripcion: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">2ª Cuota (€)</label>
              <Input
                type="number"
                value={formData.cuota_segunda}
                onChange={(e) => setFormData({ ...formData, cuota_segunda: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">3ª Cuota (€)</label>
              <Input
                type="number"
                value={formData.cuota_tercera}
                onChange={(e) => setFormData({ ...formData, cuota_tercera: Number(e.target.value) })}
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-bold text-blue-900">Total: {formData.cuota_inscripcion + formData.cuota_segunda + formData.cuota_tercera}€</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}