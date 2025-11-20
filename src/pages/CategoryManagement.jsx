import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit2, Trash2, Save, X, Users, Euro, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CategoryManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.CategoryConfig.list('orden'),
    initialData: [],
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CategoryConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowDialog(false);
      setEditForm(null);
      toast.success("✅ Categoría creada");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CategoryConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowDialog(false);
      setEditForm(null);
      toast.success("✅ Categoría actualizada");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CategoryConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteConfirm(null);
      toast.success("🗑️ Categoría eliminada");
    },
  });

  const handleNew = () => {
    setEditForm({
      nombre: "",
      activa: true,
      cuota_inscripcion: 0,
      cuota_segunda: 0,
      cuota_tercera: 0,
      cuota_total: 0,
      orden: categories.length,
      notas: ""
    });
    setShowDialog(true);
  };

  const handleEdit = (category) => {
    setEditForm({ ...category });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!editForm.nombre) {
      toast.error("El nombre es obligatorio");
      return;
    }

    // Calcular total automáticamente
    const total = (editForm.cuota_inscripcion || 0) + (editForm.cuota_segunda || 0) + (editForm.cuota_tercera || 0);
    const dataToSave = { ...editForm, cuota_total: total };

    if (editForm.id) {
      updateMutation.mutate({ id: editForm.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const handleDelete = (category) => {
    const playersInCategory = players.filter(p => p.deporte === category.nombre);
    
    if (playersInCategory.length > 0) {
      toast.error(`No se puede eliminar. Hay ${playersInCategory.length} jugadores en esta categoría`);
      return;
    }

    setDeleteConfirm(category);
  };

  const handleMove = async (category, direction) => {
    const currentIndex = categories.findIndex(c => c.id === category.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const targetCategory = categories[targetIndex];

    // Intercambiar órdenes
    await base44.entities.CategoryConfig.update(category.id, {
      ...category,
      orden: targetCategory.orden
    });

    await base44.entities.CategoryConfig.update(targetCategory.id, {
      ...targetCategory,
      orden: category.orden
    });

    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const initializeDefaultCategories = async () => {
    const defaults = [
      { nombre: "Fútbol Pre-Benjamín (Mixto)", cuota_inscripcion: 100, cuota_segunda: 75, cuota_tercera: 75, cuota_total: 250, orden: 0 },
      { nombre: "Fútbol Benjamín (Mixto)", cuota_inscripcion: 100, cuota_segunda: 75, cuota_tercera: 75, cuota_total: 250, orden: 1 },
      { nombre: "Fútbol Alevín (Mixto)", cuota_inscripcion: 115, cuota_segunda: 83, cuota_tercera: 83, cuota_total: 281, orden: 2 },
      { nombre: "Fútbol Infantil (Mixto)", cuota_inscripcion: 115, cuota_segunda: 83, cuota_tercera: 83, cuota_total: 281, orden: 3 },
      { nombre: "Fútbol Cadete", cuota_inscripcion: 135, cuota_segunda: 100, cuota_tercera: 95, cuota_total: 330, orden: 4 },
      { nombre: "Fútbol Juvenil", cuota_inscripcion: 135, cuota_segunda: 100, cuota_tercera: 95, cuota_total: 330, orden: 5 },
      { nombre: "Fútbol Aficionado", cuota_inscripcion: 165, cuota_segunda: 100, cuota_tercera: 95, cuota_total: 360, orden: 6 },
      { nombre: "Fútbol Femenino", cuota_inscripcion: 135, cuota_segunda: 100, cuota_tercera: 95, cuota_total: 330, orden: 7 },
      { nombre: "Baloncesto (Mixto)", cuota_inscripcion: 50, cuota_segunda: 50, cuota_tercera: 50, cuota_total: 150, orden: 8 }
    ];

    for (const cat of defaults) {
      if (!categories.find(c => c.nombre === cat.nombre)) {
        await base44.entities.CategoryConfig.create({ ...cat, activa: true, notas: "" });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['categories'] });
    toast.success("✅ Categorías inicializadas");
  };

  return (
    <div className="p-3 lg:p-8 space-y-4 lg:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold text-slate-900">Gestión de Categorías y Cuotas</h1>
          <p className="text-xs lg:text-base text-slate-600 mt-1">
            Configura las categorías del club y sus cuotas
          </p>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <Button
              onClick={initializeDefaultCategories}
              variant="outline"
              size="sm"
              className="shadow-lg"
            >
              Inicializar Categorías por Defecto
            </Button>
          )}
          <Button
            onClick={handleNew}
            size="sm"
            className="bg-green-600 hover:bg-green-700 shadow-lg"
          >
            <Plus className="w-4 h-4 lg:w-5 lg:h-5 lg:mr-2" />
            <span className="hidden lg:inline">Nueva Categoría</span>
          </Button>
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-300 border-2">
        <AlertDescription className="text-blue-900">
          <p className="font-bold mb-2">ℹ️ Información Importante</p>
          <ul className="text-sm space-y-1">
            <li>• Las cuotas aquí configuradas se usarán automáticamente al generar pagos</li>
            <li>• Si modificas cuotas después de generar pagos, usa "Corregir Cantidades" en Recordatorios</li>
            <li>• No puedes eliminar categorías que tengan jugadores asignados</li>
            <li>• Las categorías inactivas no aparecen en los formularios de inscripción</li>
          </ul>
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : categories.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg mb-4">No hay categorías configuradas</p>
            <Button onClick={initializeDefaultCategories} className="bg-orange-600 hover:bg-orange-700">
              Inicializar Categorías por Defecto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {categories.map((category, index) => {
            const playersCount = players.filter(p => p.deporte === category.nombre).length;
            
            return (
              <Card key={category.id} className={`border-2 ${category.activa ? 'border-green-200' : 'border-slate-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMove(category, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMove(category, 'down')}
                          disabled={index === categories.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg text-slate-900">{category.nombre}</h3>
                          {category.activa ? (
                            <Badge className="bg-green-600">Activa</Badge>
                          ) : (
                            <Badge variant="outline">Inactiva</Badge>
                          )}
                          {playersCount > 0 && (
                            <Badge variant="outline" className="text-orange-700">
                              {playersCount} jugadores
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-xs text-blue-700">Inscripción (Jun)</p>
                            <p className="text-lg font-bold text-blue-900">{category.cuota_inscripcion}€</p>
                          </div>
                          <div className="bg-orange-50 rounded p-2">
                            <p className="text-xs text-orange-700">Segunda (Sep)</p>
                            <p className="text-lg font-bold text-orange-900">{category.cuota_segunda}€</p>
                          </div>
                          <div className="bg-purple-50 rounded p-2">
                            <p className="text-xs text-purple-700">Tercera (Dic)</p>
                            <p className="text-lg font-bold text-purple-900">{category.cuota_tercera}€</p>
                          </div>
                          <div className="bg-green-50 rounded p-2">
                            <p className="text-xs text-green-700">Total</p>
                            <p className="text-lg font-bold text-green-900">{category.cuota_total}€</p>
                          </div>
                        </div>

                        {category.notas && (
                          <p className="text-xs text-slate-600 mt-2 italic">{category.notas}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Diálogo de Edición/Creación */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editForm?.id ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
            <DialogDescription>
              Define el nombre de la categoría y sus cuotas para cada periodo
            </DialogDescription>
          </DialogHeader>

          {editForm && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Nombre de la Categoría *</Label>
                <Input
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  placeholder="Ej: Fútbol Cadete, Baloncesto Infantil"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Inscripción (Junio) *</Label>
                  <Input
                    type="number"
                    value={editForm.cuota_inscripcion}
                    onChange={(e) => setEditForm({ ...editForm, cuota_inscripcion: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Segunda (Septiembre) *</Label>
                  <Input
                    type="number"
                    value={editForm.cuota_segunda}
                    onChange={(e) => setEditForm({ ...editForm, cuota_segunda: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Tercera (Diciembre) *</Label>
                  <Input
                    type="number"
                    value={editForm.cuota_tercera}
                    onChange={(e) => setEditForm({ ...editForm, cuota_tercera: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm text-green-900">
                  <strong>Total temporada:</strong> {((editForm.cuota_inscripcion || 0) + (editForm.cuota_segunda || 0) + (editForm.cuota_tercera || 0)).toFixed(2)}€
                </p>
              </div>

              <div>
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={editForm.notas || ""}
                  onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
                  rows={2}
                  placeholder="Información adicional sobre esta categoría"
                />
              </div>

              <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded border">
                <Checkbox
                  id="activa"
                  checked={editForm.activa}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, activa: checked })}
                />
                <Label htmlFor="activa" className="cursor-pointer">
                  <div className="font-medium">Categoría activa</div>
                  <div className="text-xs text-slate-600">Las categorías inactivas no aparecen en formularios</div>
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación de Eliminación */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar la categoría <strong>{deleteConfirm?.nombre}</strong>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}