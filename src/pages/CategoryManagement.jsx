import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Edit, Trash2, Save, X, Users, CreditCard, 
  AlertTriangle, CheckCircle2, Info, Settings, Euro, Calendar
} from "lucide-react";
import { toast } from "sonner";

// Cuotas por defecto basadas en la tabla proporcionada
const DEFAULT_QUOTAS = {
  "AFICIONADO": { inscripcion: 165, segunda: 100, tercera: 95, total: 360 },
  "JUVENIL": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
  "CADETE": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
  "INFANTIL": { inscripcion: 115, segunda: 83, tercera: 83, total: 281 },
  "ALEVIN": { inscripcion: 115, segunda: 83, tercera: 83, total: 281 },
  "BENJAMIN": { inscripcion: 100, segunda: 75, tercera: 75, total: 250 },
  "PRE-BENJAMIN": { inscripcion: 100, segunda: 75, tercera: 75, total: 250 },
  "FEMENINO": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
  "BALONCESTO": { inscripcion: 50, segunda: 50, tercera: 50, total: 150 }
};

export default function CategoryManagement() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTreasurer, setIsTreasurer] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    deporte: "Fútbol",
    edad_minima: 4,
    edad_maxima: 5,
    cuota_inscripcion: 100,
    cuota_segunda: 75,
    cuota_tercera: 75,
    cuota_total: 250,
    activa: true,
    orden: 0,
    notas: ""
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
        setIsTreasurer(currentUser.es_tesorero === true);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Query para temporada activa - PRIMERO
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.SeasonConfig.list(),
  });

  const activeSeason = useMemo(() => {
    return seasons.find(s => s.activa === true);
  }, [seasons]);

  // Query para jugadores (para contar por categoría)
  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  // Query para categorías - FILTRADAS POR TEMPORADA ACTIVA
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categoryConfigs', activeSeason?.temporada],
    queryFn: async () => {
      const allCategories = await base44.entities.CategoryConfig.list();
      // Si hay temporada activa, filtrar por ella; si no, mostrar todas
      if (activeSeason?.temporada) {
        return allCategories.filter(c => c.temporada === activeSeason.temporada);
      }
      return allCategories;
    },
    enabled: seasons.length > 0,
  });

  // Mutaciones
  const createCategoryMutation = useMutation({
    mutationFn: (data) => {
      // Asignar temporada activa automáticamente
      const dataWithSeason = {
        ...data,
        temporada: activeSeason?.temporada || ""
      };
      return base44.entities.CategoryConfig.create(dataWithSeason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoryConfigs'] });
      toast.success("Categoría creada correctamente");
      resetForm();
    },
    onError: (error) => {
      console.error("Error:", error);
      toast.error("Error al crear la categoría");
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CategoryConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoryConfigs'] });
      toast.success("Categoría actualizada");
      resetForm();
    },
    onError: (error) => {
      console.error("Error:", error);
      toast.error("Error al actualizar");
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.CategoryConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoryConfigs'] });
      toast.success("Categoría eliminada");
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    },
    onError: (error) => {
      console.error("Error:", error);
      toast.error("Error al eliminar");
    }
  });

  const resetForm = () => {
    setFormData({
      nombre: "",
      deporte: "Fútbol",
      edad_minima: 4,
      edad_maxima: 5,
      cuota_inscripcion: 100,
      cuota_segunda: 75,
      cuota_tercera: 75,
      cuota_total: 250,
      activa: true,
      orden: 0,
      notas: ""
    });
    setShowForm(false);
    setEditingCategory(null);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      nombre: category.nombre || "",
      deporte: category.deporte || "Fútbol",
      edad_minima: category.edad_minima || 4,
      edad_maxima: category.edad_maxima || 5,
      cuota_inscripcion: category.cuota_inscripcion || 100,
      cuota_segunda: category.cuota_segunda || 75,
      cuota_tercera: category.cuota_tercera || 75,
      cuota_total: category.cuota_total || 250,
      activa: category.activa !== false,
      orden: category.orden || 0,
      notas: category.notas || ""
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    // Calcular total automáticamente
    const dataToSave = {
      ...formData,
      cuota_total: formData.cuota_inscripcion + formData.cuota_segunda + formData.cuota_tercera
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: dataToSave });
    } else {
      createCategoryMutation.mutate(dataToSave);
    }
  };

  const handleDelete = (category) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteCategoryMutation.mutate(categoryToDelete.id);
    }
  };

  // Crear categorías por defecto
  const createDefaultCategories = async () => {
    const defaultCategories = [
      { nombre: "PRE-BENJAMIN", deporte: "Fútbol", edad_minima: 4, edad_maxima: 5, ...DEFAULT_QUOTAS["PRE-BENJAMIN"], orden: 1 },
      { nombre: "BENJAMIN", deporte: "Fútbol", edad_minima: 6, edad_maxima: 7, ...DEFAULT_QUOTAS["BENJAMIN"], orden: 2 },
      { nombre: "ALEVIN", deporte: "Fútbol", edad_minima: 8, edad_maxima: 9, ...DEFAULT_QUOTAS["ALEVIN"], orden: 3 },
      { nombre: "INFANTIL", deporte: "Fútbol", edad_minima: 10, edad_maxima: 11, ...DEFAULT_QUOTAS["INFANTIL"], orden: 4 },
      { nombre: "CADETE", deporte: "Fútbol", edad_minima: 12, edad_maxima: 15, ...DEFAULT_QUOTAS["CADETE"], orden: 5 },
      { nombre: "JUVENIL", deporte: "Fútbol", edad_minima: 16, edad_maxima: 17, ...DEFAULT_QUOTAS["JUVENIL"], orden: 6 },
      { nombre: "AFICIONADO", deporte: "Fútbol", edad_minima: 18, edad_maxima: 99, ...DEFAULT_QUOTAS["AFICIONADO"], orden: 7 },
      { nombre: "FEMENINO", deporte: "Fútbol", edad_minima: 12, edad_maxima: 99, ...DEFAULT_QUOTAS["FEMENINO"], orden: 8 },
      { nombre: "BALONCESTO", deporte: "Baloncesto", edad_minima: 4, edad_maxima: 18, ...DEFAULT_QUOTAS["BALONCESTO"], orden: 9, notas: "(*) Cuota reducida" }
    ];

    for (const cat of defaultCategories) {
    const exists = categories.find(c => c.nombre === cat.nombre);
    if (!exists) {
      await base44.entities.CategoryConfig.create({
        ...cat,
        cuota_inscripcion: cat.inscripcion,
        cuota_segunda: cat.segunda,
        cuota_tercera: cat.tercera,
        cuota_total: cat.total,
        temporada: activeSeason?.temporada || "",
        activa: true
      });
    }
    }
    queryClient.invalidateQueries({ queryKey: ['categoryConfigs'] });
    toast.success("Categorías por defecto creadas para temporada " + activeSeason?.temporada);
  };

  // Contar jugadores por categoría
  const getPlayerCount = (categoryName) => {
    // Mapeo de nombres de categoría a deportes en la BD
    const categoryMapping = {
      "AFICIONADO": "Fútbol Aficionado",
      "JUVENIL": "Fútbol Juvenil",
      "CADETE": "Fútbol Cadete",
      "INFANTIL": "Fútbol Infantil (Mixto)",
      "ALEVIN": "Fútbol Alevín (Mixto)",
      "BENJAMIN": "Fútbol Benjamín (Mixto)",
      "PRE-BENJAMIN": "Fútbol Pre-Benjamín (Mixto)",
      "FEMENINO": "Fútbol Femenino",
      "BALONCESTO": "Baloncesto (Mixto)"
    };
    
    const mappedName = categoryMapping[categoryName] || categoryName;
    return players.filter(p => p.deporte === mappedName && p.activo).length;
  };

  // Ordenar categorías
  const sortedCategories = [...categories].sort((a, b) => (a.orden || 0) - (b.orden || 0));

  // Agrupar por deporte
  const futbolCategories = sortedCategories.filter(c => c.deporte === "Fútbol" && c.nombre !== "FEMENINO");
  const femeninoCategories = sortedCategories.filter(c => c.nombre === "FEMENINO");
  const baloncestoCategories = sortedCategories.filter(c => c.deporte === "Baloncesto");
  const otrasCategories = sortedCategories.filter(c => c.deporte === "Otro");

  const canEdit = isAdmin || isTreasurer;

  if (!canEdit) {
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🏷️ Gestión de Categorías y Cuotas</h1>
          <p className="text-slate-600 mt-1">Configura las categorías del club y sus cuotas por temporada</p>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <Button
              onClick={createDefaultCategories}
              variant="outline"
              className="border-green-500 text-green-700 hover:bg-green-50"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Crear Categorías por Defecto
            </Button>
          )}
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Categoría
          </Button>
        </div>
      </div>

      {/* Info de fechas de pago */}
      <Alert className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300">
        <Calendar className="w-5 h-5 text-blue-600" />
        <AlertDescription className="text-blue-900 ml-2">
          <strong>📅 Fechas límite de pago:</strong>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-lg p-2 border border-blue-200">
              <span className="font-medium text-green-700">INSCRIPCIÓN:</span> hasta el 30 de junio
            </div>
            <div className="bg-white rounded-lg p-2 border border-blue-200">
              <span className="font-medium text-orange-700">SEGUNDA CUOTA:</span> hasta el 15 de septiembre
            </div>
            <div className="bg-white rounded-lg p-2 border border-blue-200">
              <span className="font-medium text-red-700">TERCER PAGO:</span> hasta el 15 de diciembre
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Formulario */}
      {showForm && (
        <Card className="border-2 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-600" />
              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre de la categoría *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value.toUpperCase() }))}
                  placeholder="Ej: VETERANOS"
                />
              </div>
              <div>
                <Label>Deporte</Label>
                <Select
                  value={formData.deporte}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, deporte: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona deporte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fútbol">Fútbol</SelectItem>
                    <SelectItem value="Baloncesto">Baloncesto</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Edad Mínima (años) *</Label>
                <Input
                  type="number"
                  min="3"
                  max="99"
                  value={formData.edad_minima}
                  onChange={(e) => setFormData(prev => ({ ...prev, edad_minima: Number(e.target.value) }))}
                  placeholder="Ej: 4"
                />
              </div>
              <div>
                <Label>Edad Máxima (años) *</Label>
                <Input
                  type="number"
                  min="3"
                  max="99"
                  value={formData.edad_maxima}
                  onChange={(e) => setFormData(prev => ({ ...prev, edad_maxima: Number(e.target.value) }))}
                  placeholder="Ej: 5"
                />
              </div>
              <div>
                <Label>Orden de visualización</Label>
                <Input
                  type="number"
                  value={formData.orden}
                  onChange={(e) => setFormData(prev => ({ ...prev, orden: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-green-700">Inscripción (€)</Label>
                <Input
                  type="number"
                  value={formData.cuota_inscripcion}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      cuota_inscripcion: val,
                      cuota_total: val + prev.cuota_segunda + prev.cuota_tercera
                    }));
                  }}
                  className="border-green-300"
                />
                <p className="text-xs text-slate-500 mt-1">Hasta 30 junio</p>
              </div>
              <div>
                <Label className="text-orange-700">2ª Cuota (€)</Label>
                <Input
                  type="number"
                  value={formData.cuota_segunda}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      cuota_segunda: val,
                      cuota_total: prev.cuota_inscripcion + val + prev.cuota_tercera
                    }));
                  }}
                  className="border-orange-300"
                />
                <p className="text-xs text-slate-500 mt-1">Hasta 15 sept</p>
              </div>
              <div>
                <Label className="text-red-700">3er Pago (€)</Label>
                <Input
                  type="number"
                  value={formData.cuota_tercera}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      cuota_tercera: val,
                      cuota_total: prev.cuota_inscripcion + prev.cuota_segunda + val
                    }));
                  }}
                  className="border-red-300"
                />
                <p className="text-xs text-slate-500 mt-1">Hasta 15 dic</p>
              </div>
              <div>
                <Label className="text-blue-700 font-bold">TOTAL (€)</Label>
                <Input
                  type="number"
                  value={formData.cuota_inscripcion + formData.cuota_segunda + formData.cuota_tercera}
                  disabled
                  className="bg-blue-50 border-blue-300 font-bold text-blue-700"
                />
                <p className="text-xs text-slate-500 mt-1">Calculado</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Switch
                  checked={formData.activa}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, activa: checked }))}
                />
                <Label className="text-sm">Categoría activa</Label>
              </div>
              <div>
                <Label>Notas adicionales</Label>
                <Input
                  value={formData.notas}
                  onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Ej: (*) Cuota reducida"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingCategory ? "Guardar Cambios" : "Crear Categoría"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerta de duplicados */}
      {categories.length > 9 && (
        <Alert className="bg-red-50 border-red-300">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            <strong>⚠️ ¡{categories.length} categorías detectadas (debería haber solo 9)!</strong>
            <p className="text-sm mt-2">Hay {categories.length - 9} categorías duplicadas. Esto causa problemas en los pagos.</p>
            <div className="mt-3">
              <Button
                size="sm"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  if (!confirm(`¿ELIMINAR ${categories.length - 9} CATEGORÍAS DUPLICADAS?\n\nSolo se conservará 1 categoría de cada tipo (la más reciente).\n\nEsta acción es IRREVERSIBLE.`)) return;
                  
                  try {
                    toast.loading("Eliminando duplicados...");
                    
                    // Agrupar por nombre
                    const grouped = {};
                    categories.forEach(cat => {
                      if (!grouped[cat.nombre]) {
                        grouped[cat.nombre] = [];
                      }
                      grouped[cat.nombre].push(cat);
                    });
                    
                    let deleted = 0;
                    // Para cada grupo, mantener solo la más reciente
                    for (const [nombre, cats] of Object.entries(grouped)) {
                      if (cats.length > 1) {
                        // Ordenar por fecha de creación (más reciente primero)
                        const sorted = cats.sort((a, b) => 
                          new Date(b.created_date || 0) - new Date(a.created_date || 0)
                        );
                        
                        // Eliminar todos excepto el primero
                        for (let i = 1; i < sorted.length; i++) {
                          console.log('🗑️ Eliminando duplicado:', sorted[i].nombre, sorted[i].id);
                          await base44.entities.CategoryConfig.delete(sorted[i].id);
                          deleted++;
                        }
                      }
                    }
                    
                    queryClient.invalidateQueries({ queryKey: ['categoryConfigs'] });
                    toast.success(`✅ ${deleted} categorías duplicadas eliminadas`);
                  } catch (error) {
                    console.error("Error:", error);
                    toast.error("Error: " + error.message);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar {categories.length - 9} Duplicados
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabla de categorías */}
      {categories.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-green-600" />
              Cuotas por Categoría - Temporada {activeSeason?.temporada || "Actual"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border p-3 text-left font-bold text-slate-700">CATEGORÍA</th>
                    <th className="border p-3 text-center font-bold text-purple-700">
                      EDADES
                    </th>
                    <th className="border p-3 text-center font-bold text-green-700">
                      INSCRIPCIÓN<br/>
                      <span className="text-xs font-normal">(hasta 30 junio)</span>
                    </th>
                    <th className="border p-3 text-center font-bold text-orange-700">
                      2ª CUOTA<br/>
                      <span className="text-xs font-normal">(hasta 15 sept)</span>
                    </th>
                    <th className="border p-3 text-center font-bold text-red-700">
                      3er PAGO<br/>
                      <span className="text-xs font-normal">(hasta 15 dic)</span>
                    </th>
                    <th className="border p-3 text-center font-bold text-blue-700">TOTAL</th>
                    <th className="border p-3 text-center font-bold text-slate-700">JUGADORES</th>
                    <th className="border p-3 text-center font-bold text-slate-700">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.map((category) => (
                    <tr key={category.id} className={`hover:bg-slate-50 ${!category.activa ? 'opacity-50 bg-red-50' : ''}`}>
                      <td className="border p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-orange-700">{category.nombre}</span>
                          {category.notas && (
                            <span className="text-xs text-slate-500">{category.notas}</span>
                          )}
                          {!category.activa && (
                            <Badge className="bg-red-100 text-red-700 text-xs">Inactiva</Badge>
                          )}
                        </div>
                      </td>
                      <td className="border p-3 text-center font-medium text-purple-700">
                        {category.edad_minima || '?'} - {category.edad_maxima || '?'} años
                      </td>
                      <td className="border p-3 text-center font-medium text-green-700">
                        {category.cuota_inscripcion?.toFixed(2)} €
                      </td>
                      <td className="border p-3 text-center font-medium text-orange-700">
                        {category.cuota_segunda?.toFixed(2)} €
                      </td>
                      <td className="border p-3 text-center font-medium text-red-700">
                        {category.cuota_tercera?.toFixed(2)} €
                      </td>
                      <td className="border p-3 text-center font-bold text-blue-700">
                        {category.cuota_total?.toFixed(2)} €
                      </td>
                      <td className="border p-3 text-center">
                        <Badge className="bg-blue-100 text-blue-700">
                          <Users className="w-3 h-3 mr-1" />
                          {getPlayerCount(category.nombre)}
                        </Badge>
                      </td>
                      <td className="border p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(category)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="py-12 text-center">
            <Euro className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No hay categorías configuradas</h3>
            <p className="text-slate-500 mb-4">
              Crea las categorías del club con sus respectivas cuotas
            </p>
            <Button
              onClick={createDefaultCategories}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Crear Categorías por Defecto
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resumen por deporte */}
      {categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <span className="text-4xl">⚽</span>
                <h3 className="font-bold text-green-900 mt-2">Fútbol</h3>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {futbolCategories.length + femeninoCategories.length} categorías
                </p>
                <p className="text-sm text-green-600">
                  {futbolCategories.reduce((sum, c) => sum + getPlayerCount(c.nombre), 0) + 
                   femeninoCategories.reduce((sum, c) => sum + getPlayerCount(c.nombre), 0)} jugadores
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <span className="text-4xl">🏀</span>
                <h3 className="font-bold text-orange-900 mt-2">Baloncesto</h3>
                <p className="text-2xl font-bold text-orange-700 mt-1">
                  {baloncestoCategories.length} categorías
                </p>
                <p className="text-sm text-orange-600">
                  {baloncestoCategories.reduce((sum, c) => sum + getPlayerCount(c.nombre), 0)} jugadores
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <span className="text-4xl">💰</span>
                <h3 className="font-bold text-blue-900 mt-2">Total Categorías</h3>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {categories.length}
                </p>
                <p className="text-sm text-blue-600">
                  {categories.filter(c => c.activa).length} activas
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog de confirmación para eliminar */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la categoría "{categoryToDelete?.nombre}"?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmDelete}
              disabled={deleteCategoryMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}