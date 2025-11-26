import React, { useState, useEffect } from "react";
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
  AlertTriangle, CheckCircle2, Info, Settings, Euro
} from "lucide-react";
import { toast } from "sonner";

// Categorías predefinidas del sistema
const SYSTEM_CATEGORIES = [
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

export default function CategoryManagementContent() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showEditSystemCategory, setShowEditSystemCategory] = useState(false);
  const [editingSystemCategory, setEditingSystemCategory] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    deporte: "Fútbol",
    edad_minima: null,
    edad_maxima: null,
    cuota_unica: 200,
    cuota_fraccionada: 75,
    descuento_hermano: 25,
    incluye_seguro: true,
    incluye_ficha_federativa: true,
    activa: true,
    notas: ""
  });

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

  // Query para categorías personalizadas
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categoryConfigs'],
    queryFn: () => base44.entities.CategoryConfig.list(),
  });

  // Query para jugadores (para contar por categoría)
  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  // Query para temporada activa
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.SeasonConfig.list(),
  });

  const activeSeason = seasons.find(s => s.activa === true);

  // Mutaciones
  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.CategoryConfig.create(data),
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
      edad_minima: null,
      edad_maxima: null,
      cuota_unica: activeSeason?.cuota_unica || 200,
      cuota_fraccionada: activeSeason?.cuota_tres_meses || 75,
      descuento_hermano: 25,
      incluye_seguro: true,
      incluye_ficha_federativa: true,
      activa: true,
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
      edad_minima: category.edad_minima || null,
      edad_maxima: category.edad_maxima || null,
      cuota_unica: category.cuota_unica || 200,
      cuota_fraccionada: category.cuota_fraccionada || 75,
      descuento_hermano: category.descuento_hermano || 25,
      incluye_seguro: category.incluye_seguro !== false,
      incluye_ficha_federativa: category.incluye_ficha_federativa !== false,
      activa: category.activa !== false,
      notas: category.notas || ""
    });
    setShowForm(true);
  };

  const handleEditSystemCategory = (category) => {
    setEditingSystemCategory({
      nombre: category.nombre,
      id: category.id,
      hasCustomConfig: category.hasCustomConfig,
      cuota_unica: category.cuota_unica,
      cuota_fraccionada: category.cuota_fraccionada,
      descuento_hermano: category.descuento_hermano || 25
    });
    setShowEditSystemCategory(true);
  };

  const saveSystemCategoryConfig = async () => {
    if (!editingSystemCategory) return;

    try {
      if (editingSystemCategory.hasCustomConfig && editingSystemCategory.id) {
        // Actualizar configuración existente
        await base44.entities.CategoryConfig.update(editingSystemCategory.id, {
          cuota_unica: editingSystemCategory.cuota_unica,
          cuota_fraccionada: editingSystemCategory.cuota_fraccionada,
          descuento_hermano: editingSystemCategory.descuento_hermano
        });
      } else {
        // Crear nueva configuración para esta categoría
        await base44.entities.CategoryConfig.create({
          nombre: editingSystemCategory.nombre,
          deporte: editingSystemCategory.nombre.includes("Baloncesto") ? "Baloncesto" : "Fútbol",
          cuota_unica: editingSystemCategory.cuota_unica,
          cuota_fraccionada: editingSystemCategory.cuota_fraccionada,
          descuento_hermano: editingSystemCategory.descuento_hermano,
          activa: true
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['categoryConfigs'] });
      toast.success(`Cuotas de ${editingSystemCategory.nombre} actualizadas`);
      setShowEditSystemCategory(false);
      setEditingSystemCategory(null);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar las cuotas");
    }
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createCategoryMutation.mutate(formData);
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

  // Contar jugadores por categoría
  const getPlayerCount = (categoryName) => {
    return players.filter(p => p.deporte === categoryName && p.activo).length;
  };

  // Buscar si hay configuración personalizada para una categoría del sistema
  const getSystemCategoryConfig = (categoryName) => {
    return categories.find(c => c.nombre === categoryName);
  };

  // Combinar categorías del sistema con personalizadas
  const allCategories = [
    ...SYSTEM_CATEGORIES.map(name => {
      const customConfig = getSystemCategoryConfig(name);
      return {
        id: customConfig?.id || null,
        nombre: name,
        isSystem: true,
        hasCustomConfig: !!customConfig,
        cuota_unica: customConfig?.cuota_unica || activeSeason?.cuota_unica || 200,
        cuota_fraccionada: customConfig?.cuota_fraccionada || activeSeason?.cuota_tres_meses || 75,
        descuento_hermano: customConfig?.descuento_hermano || 25,
        playerCount: getPlayerCount(name)
      };
    }),
    ...categories.filter(cat => !SYSTEM_CATEGORIES.includes(cat.nombre)).map(cat => ({
      ...cat,
      isSystem: false,
      playerCount: getPlayerCount(cat.nombre)
    }))
  ];

  // Agrupar por deporte
  const groupedCategories = {
    futbol: allCategories.filter(c => c.nombre?.includes("Fútbol") && !c.nombre?.includes("Femenino")),
    futbolFemenino: allCategories.filter(c => c.nombre?.includes("Femenino")),
    baloncesto: allCategories.filter(c => c.nombre?.includes("Baloncesto")),
    otras: categories.filter(c => 
      !c.nombre?.includes("Fútbol") && 
      !c.nombre?.includes("Baloncesto")
    )
  };

  return (
    <div className="space-y-6">
      {/* Información general */}
      <Alert className="bg-gradient-to-r from-green-50 to-green-100 border-green-300">
        <Euro className="w-5 h-5 text-green-600" />
        <AlertDescription className="text-green-900 ml-2">
          <strong className="text-lg">💰 Cuotas por Categoría - Temporada {activeSeason?.temporada || "actual"}</strong>
          <p className="mt-1 text-sm">
            Aquí puedes ver y <strong>editar las cuotas de cada categoría</strong>. 
            Haz clic en "Editar" en cualquier categoría para modificar sus cuotas.
          </p>
        </AlertDescription>
      </Alert>

      {/* Botón para añadir categoría */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Categoría Personalizada
          </Button>
        </div>
      )}

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
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Fútbol Veteranos"
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
                    <SelectItem value="Paddle">Paddle</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Edad mínima</Label>
                <Input
                  type="number"
                  value={formData.edad_minima || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, edad_minima: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Ej: 6"
                />
              </div>
              <div>
                <Label>Edad máxima</Label>
                <Input
                  type="number"
                  value={formData.edad_maxima || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, edad_maxima: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Ej: 8"
                />
              </div>
              <div>
                <Label>Cuota única (€)</Label>
                <Input
                  type="number"
                  value={formData.cuota_unica}
                  onChange={(e) => setFormData(prev => ({ ...prev, cuota_unica: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Cuota fraccionada (€)</Label>
                <Input
                  type="number"
                  value={formData.cuota_fraccionada}
                  onChange={(e) => setFormData(prev => ({ ...prev, cuota_fraccionada: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Switch
                  checked={formData.incluye_seguro}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, incluye_seguro: checked }))}
                />
                <Label className="text-sm">Incluye seguro de accidentes</Label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Switch
                  checked={formData.incluye_ficha_federativa}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, incluye_ficha_federativa: checked }))}
                />
                <Label className="text-sm">Incluye ficha federativa</Label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Switch
                  checked={formData.activa}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, activa: checked }))}
                />
                <Label className="text-sm">Categoría activa</Label>
              </div>
            </div>

            <div>
              <Label>Notas adicionales</Label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Información adicional sobre esta categoría..."
                rows={2}
              />
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

      {/* Categorías de Fútbol */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚽ Fútbol Masculino/Mixto
          </CardTitle>
          <CardDescription>
            {groupedCategories.futbol.reduce((sum, c) => sum + (c.playerCount || 0), 0)} jugadores en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {groupedCategories.futbol.map((category, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-lg border-2 ${
                  category.isSystem 
                    ? 'bg-slate-50 border-slate-200' 
                    : 'bg-orange-50 border-orange-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-900">{category.nombre}</p>
                    {category.isSystem && (
                      <Badge variant="outline" className="text-[10px] mt-1">Sistema</Badge>
                    )}
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">
                    <Users className="w-3 h-3 mr-1" />
                    {category.playerCount}
                  </Badge>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="flex items-center gap-1">
                    <Euro className="w-3 h-3" />
                    Única: <strong>{category.cuota_unica}€</strong> | Fracc: <strong>{category.cuota_fraccionada}€</strong> x3
                  </p>
                  {category.hasCustomConfig && (
                    <Badge className="bg-orange-100 text-orange-700 text-[10px]">Cuota personalizada</Badge>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button size="sm" variant="outline" onClick={() => handleEditSystemCategory(category)} className="flex-1">
                      <Edit className="w-3 h-3 mr-1" /> Editar Cuotas
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fútbol Femenino */}
      {groupedCategories.futbolFemenino.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚽ Fútbol Femenino
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupedCategories.futbolFemenino.map((category, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-lg border-2 ${
                    category.isSystem 
                      ? 'bg-pink-50 border-pink-200' 
                      : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-900">{category.nombre}</p>
                      {category.isSystem && (
                        <Badge variant="outline" className="text-[10px] mt-1">Sistema</Badge>
                      )}
                    </div>
                    <Badge className="bg-pink-100 text-pink-700">
                      <Users className="w-3 h-3 mr-1" />
                      {category.playerCount}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600">
                    <p className="flex items-center gap-1">
                      <Euro className="w-3 h-3" />
                      Única: <strong>{category.cuota_unica}€</strong> | Fracc: <strong>{category.cuota_fraccionada}€</strong> x3
                    </p>
                    {category.hasCustomConfig && (
                      <Badge className="bg-orange-100 text-orange-700 text-[10px] mt-1">Cuota personalizada</Badge>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={() => handleEditSystemCategory(category)} className="flex-1">
                        <Edit className="w-3 h-3 mr-1" /> Editar Cuotas
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Baloncesto */}
      {groupedCategories.baloncesto.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏀 Baloncesto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupedCategories.baloncesto.map((category, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-lg border-2 ${
                    category.isSystem 
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-900">{category.nombre}</p>
                      {category.isSystem && (
                        <Badge variant="outline" className="text-[10px] mt-1">Sistema</Badge>
                      )}
                    </div>
                    <Badge className="bg-orange-100 text-orange-700">
                      <Users className="w-3 h-3 mr-1" />
                      {category.playerCount}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600">
                    <p className="flex items-center gap-1">
                      <Euro className="w-3 h-3" />
                      Única: <strong>{category.cuota_unica}€</strong> | Fracc: <strong>{category.cuota_fraccionada}€</strong> x3
                    </p>
                    {category.hasCustomConfig && (
                      <Badge className="bg-orange-100 text-orange-700 text-[10px] mt-1">Cuota personalizada</Badge>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={() => handleEditSystemCategory(category)} className="flex-1">
                        <Edit className="w-3 h-3 mr-1" /> Editar Cuotas
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categorías personalizadas */}
      {groupedCategories.otras.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏆 Categorías Personalizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupedCategories.otras.map((category) => (
                <div 
                  key={category.id}
                  className="p-4 rounded-lg border-2 bg-purple-50 border-purple-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-900">{category.nombre}</p>
                      <Badge className="text-[10px] bg-purple-100 text-purple-700 mt-1">
                        {category.deporte}
                      </Badge>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700">
                      <Users className="w-3 h-3 mr-1" />
                      {category.playerCount || 0}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="flex items-center gap-1">
                      <Euro className="w-3 h-3" />
                      Única: {category.cuota_unica}€ | Fracc: {category.cuota_fraccionada}€ x3
                    </p>
                    {(category.edad_minima || category.edad_maxima) && (
                      <p>Edades: {category.edad_minima || "?"} - {category.edad_maxima || "?"} años</p>
                    )}
                  </div>
                  {!category.activa && (
                    <Badge className="mt-2 bg-red-100 text-red-700">Inactiva</Badge>
                  )}
                  {isAdmin && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                        <Edit className="w-3 h-3 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDelete(category)}>
                        <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog para editar cuotas de categoría del sistema */}
      <Dialog open={showEditSystemCategory} onOpenChange={setShowEditSystemCategory}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              💰 Editar Cuotas - {editingSystemCategory?.nombre}
            </DialogTitle>
            <DialogDescription>
              Configura las cuotas específicas para esta categoría
            </DialogDescription>
          </DialogHeader>

          {editingSystemCategory && (
            <div className="space-y-4 py-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800 ml-2 text-sm">
                  Si dejas las cuotas igual que las de la temporada ({activeSeason?.cuota_unica}€ / {activeSeason?.cuota_tres_meses}€), 
                  se usarán las cuotas generales.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Cuota Única (€)</Label>
                  <Input
                    type="number"
                    value={editingSystemCategory.cuota_unica}
                    onChange={(e) => setEditingSystemCategory(prev => ({ 
                      ...prev, 
                      cuota_unica: Number(e.target.value) 
                    }))}
                    className="text-lg font-bold mt-1"
                  />
                </div>
                <div>
                  <Label className="font-medium">Cuota Fraccionada (€)</Label>
                  <Input
                    type="number"
                    value={editingSystemCategory.cuota_fraccionada}
                    onChange={(e) => setEditingSystemCategory(prev => ({ 
                      ...prev, 
                      cuota_fraccionada: Number(e.target.value) 
                    }))}
                    className="text-lg font-bold mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Total: {editingSystemCategory.cuota_fraccionada * 3}€ (3 pagos)
                  </p>
                </div>
              </div>

              <div>
                <Label className="font-medium">Descuento Hermano (€)</Label>
                <Input
                  type="number"
                  value={editingSystemCategory.descuento_hermano}
                  onChange={(e) => setEditingSystemCategory(prev => ({ 
                    ...prev, 
                    descuento_hermano: Number(e.target.value) 
                  }))}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditSystemCategory(false)}>
              Cancelar
            </Button>
            <Button onClick={saveSystemCategoryConfig} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Guardar Cuotas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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