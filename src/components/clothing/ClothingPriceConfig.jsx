import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingBag, Plus, Edit, Trash2, Euro, Save, Loader2, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Productos por defecto
const DEFAULT_PRODUCTS = [
  { id: "chaqueta_partidos", nombre: "Chaqueta de Partidos", precio: 35, activo: true, orden: 1 },
  { id: "pack_entrenamiento", nombre: "Pack Entrenamiento (Camiseta + Pantalón + Sudadera)", precio: 41, activo: true, orden: 2 },
  { id: "camiseta_individual", nombre: "Camiseta Individual", precio: 10, activo: true, orden: 3 },
  { id: "pantalon_individual", nombre: "Pantalón Individual", precio: 17, activo: true, orden: 4 },
  { id: "sudadera_individual", nombre: "Sudadera Individual", precio: 18, activo: true, orden: 5 },
  { id: "chubasquero", nombre: "Chubasquero con Escudo", precio: 20, activo: true, orden: 6 },
  { id: "anorak", nombre: "Anorak", precio: 40, activo: true, orden: 7 },
  { id: "mochila", nombre: "Mochila con Botero y Escudo", precio: 22, activo: true, orden: 8 },
];

const TALLAS = [
  "Talla 6XS (4-5 años)", "Talla 5XS (5-6 años)", "Talla 4XS (7-8 años)", "Talla 3XS (9-10 años)",
  "Talla 2XS (11-12 años)", "Talla XS (12-14 años)", "Talla S", "Talla M", "Talla L", 
  "Talla XL", "Talla XXL", "Talla 3XL"
];

export default function ClothingPriceConfig({ seasonConfig, onUpdate }) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProduct, setNewProduct] = useState({ nombre: "", precio: 0, activo: true });
  const [localProducts, setLocalProducts] = useState(null);
  
  const queryClient = useQueryClient();

  // Usar productos locales si existen (para actualización inmediata), sino del seasonConfig
  const products = localProducts || seasonConfig?.productos_ropa || DEFAULT_PRODUCTS;
  
  // Sincronizar localProducts cuando cambia seasonConfig E INICIALIZAR si no existen
  useEffect(() => {
    if (seasonConfig?.productos_ropa && seasonConfig.productos_ropa.length > 0) {
      setLocalProducts(seasonConfig.productos_ropa);
    } else if (seasonConfig && (!seasonConfig.productos_ropa || seasonConfig.productos_ropa.length === 0)) {
      // Inicializar productos por defecto automáticamente
      console.log("🔧 Inicializando productos por defecto en SeasonConfig");
      updateConfigMutation.mutate({
        id: seasonConfig.id,
        data: { productos_ropa: DEFAULT_PRODUCTS }
      });
    }
  }, [seasonConfig]);

  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log("Guardando en SeasonConfig:", { id, data });
      const result = await base44.entities.SeasonConfig.update(id, data);
      console.log("Resultado:", result);
      return result;
    },
    onSuccess: async (result, variables) => {
      console.log("=== ÉXITO AL GUARDAR ===");
      console.log("Resultado de la API:", result);
      console.log("Variables enviadas:", variables);
      console.log("productos_ropa en resultado:", result?.productos_ropa);
      
      // Actualizar estado local inmediatamente con los productos que enviamos
      if (variables?.data?.productos_ropa) {
        console.log("Actualizando localProducts con:", variables.data.productos_ropa);
        setLocalProducts([...variables.data.productos_ropa]);
      }
      // Invalidar todas las queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['seasonConfig'] });
      await queryClient.invalidateQueries({ queryKey: ['seasonConfigs'] });
      await queryClient.invalidateQueries({ queryKey: ['activeSeasonConfig'] });
      toast.success("✅ Configuración actualizada");
      setShowEditDialog(false);
      setShowAddDialog(false);
      setEditingProduct(null);
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      console.error("Error guardando:", error);
      toast.error("Error al guardar: " + error.message);
    }
  });

  const handleSaveProduct = () => {
    if (!editingProduct || !seasonConfig) {
      toast.error("No hay producto o temporada para guardar");
      return;
    }
    
    if (!editingProduct.nombre || editingProduct.precio <= 0) {
      toast.error("El nombre y precio son obligatorios");
      return;
    }
    
    console.log("=== GUARDANDO PRODUCTO ===");
    console.log("Producto editado:", editingProduct);
    console.log("Productos actuales:", products);
    
    const updatedProducts = products.map(p => 
      p.id === editingProduct.id ? { 
        id: editingProduct.id,
        nombre: editingProduct.nombre,
        precio: Number(editingProduct.precio),
        activo: editingProduct.activo,
        orden: editingProduct.orden
      } : p
    );
    
    console.log("Productos después del map:", updatedProducts);
    
    updateConfigMutation.mutate({
      id: seasonConfig.id,
      data: { 
        productos_ropa: updatedProducts 
      }
    });
  };

  const handleAddProduct = () => {
    if (!newProduct.nombre || newProduct.precio <= 0) {
      toast.error("Completa el nombre y precio");
      return;
    }
    
    const newId = newProduct.nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const updatedProducts = [
      ...products,
      { ...newProduct, id: newId, orden: products.length + 1 }
    ];
    
    updateConfigMutation.mutate({
      id: seasonConfig.id,
      data: { productos_ropa: updatedProducts }
    });
    
    setNewProduct({ nombre: "", precio: 0, activo: true });
  };

  const handleDeleteProduct = (productId) => {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;
    
    const updatedProducts = products.filter(p => p.id !== productId);
    
    updateConfigMutation.mutate({
      id: seasonConfig.id,
      data: { productos_ropa: updatedProducts }
    });
  };

  const toggleProductActive = (productId, active) => {
    console.log("Toggle producto:", productId, "nuevo estado:", active);
    const updatedProducts = products.map(p => 
      p.id === productId ? { 
        id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        activo: active,
        orden: p.orden
      } : p
    );
    
    console.log("Productos tras toggle:", updatedProducts);
    
    updateConfigMutation.mutate({
      id: seasonConfig.id,
      data: { productos_ropa: updatedProducts }
    });
  };

  if (!seasonConfig) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-800 ml-2">
          <strong>⚠️ No hay temporada activa configurada.</strong>
          <p className="text-sm mt-2">Ve a "⚙️ Temporadas y Categorías" para crear o activar una temporada.</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (updateConfigMutation.isPending && !editingProduct && !showAddDialog) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-3" />
          <p className="text-slate-600">Inicializando catálogo de productos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-orange-600" />
            Configuración de Precios
          </h2>
          <p className="text-slate-600 text-sm">Gestiona el catálogo y precios de la equipación</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-orange-600 hover:bg-orange-700" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Añadir Producto
        </Button>
      </div>

      {/* Info */}
      <Alert className="bg-blue-50 border-blue-200">
        <Package className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-800 ml-2 text-sm">
          <strong>💡 Importante:</strong> Los cambios en precios solo afectan a pedidos nuevos. Los pedidos ya creados mantienen el precio original.
        </AlertDescription>
      </Alert>

      {/* Lista de productos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-slate-600" />
            Catálogo de Productos ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {products.sort((a, b) => (a.orden || 0) - (b.orden || 0)).map(product => (
              <div 
                key={product.id} 
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                  product.activo 
                    ? 'bg-white border-slate-200 hover:border-orange-200' 
                    : 'bg-slate-100 border-slate-300 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{product.nombre}</p>
                    <p className="text-2xl font-bold text-orange-600">{product.precio}€</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Activo</span>
                    <Switch
                      checked={product.activo !== false}
                      onCheckedChange={(checked) => {
                        console.log("Toggle activo:", product.id, checked);
                        toggleProductActive(product.id, checked);
                      }}
                    />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("Editando producto:", product);
                      setEditingProduct(JSON.parse(JSON.stringify(product)));
                      setShowEditDialog(true);
                    }}
                  >
                    <Edit className="w-4 h-4 text-blue-600" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProduct(product.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
            
            {products.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No hay productos configurados</p>
                  </div>
                )}
          </div>
        </CardContent>
      </Card>

      {/* Tallas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📏 Tallas Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TALLAS.map(talla => (
              <Badge key={talla} variant="outline" className="text-sm">
                {talla}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Editar */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Editar Producto
            </DialogTitle>
          </DialogHeader>
          
          {editingProduct && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Nombre del producto</Label>
                <Input
                  value={editingProduct.nombre}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nombre: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Precio (€)</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.precio}
                    onChange={(e) => {
                      const newPrice = parseFloat(e.target.value) || 0;
                      console.log("Cambiando precio a:", newPrice);
                      setEditingProduct({ ...editingProduct, precio: newPrice });
                    }}
                    className="pl-10 text-xl font-bold"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Precio actual: {editingProduct.precio}€</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingProduct.activo}
                  onCheckedChange={(checked) => setEditingProduct({ ...editingProduct, activo: checked })}
                />
                <Label>Producto activo (visible en la tienda)</Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveProduct}
              disabled={updateConfigMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {updateConfigMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Guardar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Añadir */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-600" />
              Añadir Nuevo Producto
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Nombre del producto *</Label>
              <Input
                value={newProduct.nombre}
                onChange={(e) => setNewProduct({ ...newProduct, nombre: e.target.value })}
                placeholder="Ej: Calcetines del Club"
              />
            </div>
            
            <div>
              <Label>Precio (€) *</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={newProduct.precio}
                  onChange={(e) => setNewProduct({ ...newProduct, precio: Number(e.target.value) })}
                  className="pl-10 text-xl font-bold"
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={newProduct.activo}
                onCheckedChange={(checked) => setNewProduct({ ...newProduct, activo: checked })}
              />
              <Label>Activar inmediatamente</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddProduct}
              disabled={updateConfigMutation.isPending || !newProduct.nombre}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {updateConfigMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Añadiendo...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Añadir</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}