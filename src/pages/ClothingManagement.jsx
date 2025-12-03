import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ShoppingBag, Plus, Edit, Trash2, Euro, Save, Loader2, 
  Package, AlertTriangle, CheckCircle2, Image
} from "lucide-react";
import { toast } from "sonner";

// Definición de productos por defecto
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
  "Talla 6XS (4-5 años)",
  "Talla 5XS (5-6 años)",
  "Talla 4XS (7-8 años)",
  "Talla 3XS (9-10 años)",
  "Talla 2XS (11-12 años)",
  "Talla XS (12-14 años)",
  "Talla S",
  "Talla M",
  "Talla L",
  "Talla XL",
  "Talla XXL",
  "Talla 3XL"
];

export default function ClothingManagement() {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProduct, setNewProduct] = useState({ nombre: "", precio: 0, activo: true });
  
  const queryClient = useQueryClient();

  // Cargar configuración de temporada (donde guardamos los precios de ropa)
  const { data: seasonConfig, isLoading } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  // Los productos se guardan en seasonConfig.productos_ropa
  const products = seasonConfig?.productos_ropa || DEFAULT_PRODUCTS;

  // Mutación para actualizar configuración de temporada
  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SeasonConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonConfig'] });
      toast.success("✅ Configuración de ropa actualizada");
      setShowEditDialog(false);
      setShowAddDialog(false);
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    }
  });

  // Inicializar productos si no existen
  const initializeProducts = () => {
    if (!seasonConfig?.productos_ropa) {
      updateConfigMutation.mutate({
        id: seasonConfig.id,
        data: { productos_ropa: DEFAULT_PRODUCTS }
      });
    }
  };

  // Guardar producto editado
  const handleSaveProduct = () => {
    if (!editingProduct || !seasonConfig) return;
    
    const updatedProducts = products.map(p => 
      p.id === editingProduct.id ? editingProduct : p
    );
    
    updateConfigMutation.mutate({
      id: seasonConfig.id,
      data: { productos_ropa: updatedProducts }
    });
  };

  // Añadir nuevo producto
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

  // Eliminar producto
  const handleDeleteProduct = (productId) => {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;
    
    const updatedProducts = products.filter(p => p.id !== productId);
    
    updateConfigMutation.mutate({
      id: seasonConfig.id,
      data: { productos_ropa: updatedProducts }
    });
  };

  // Toggle activo/inactivo
  const toggleProductActive = (productId, active) => {
    const updatedProducts = products.map(p => 
      p.id === productId ? { ...p, activo: active } : p
    );
    
    updateConfigMutation.mutate({
      id: seasonConfig.id,
      data: { productos_ropa: updatedProducts }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!seasonConfig) {
    return (
      <div className="p-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            No hay temporada activa configurada.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-orange-600" />
            Gestión de Ropa y Equipación
          </h1>
          <p className="text-slate-600 mt-1">Configura precios y productos de la tienda de ropa</p>
        </div>
        <div className="flex gap-2">
          {!seasonConfig?.productos_ropa && (
            <Button onClick={initializeProducts} variant="outline">
              <Package className="w-4 h-4 mr-2" />
              Inicializar Catálogo
            </Button>
          )}
          <Button onClick={() => setShowAddDialog(true)} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            Añadir Producto
          </Button>
        </div>
      </div>

      {/* Estado de la tienda */}
      <Card className={`border-2 ${seasonConfig?.tienda_ropa_abierta ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {seasonConfig?.tienda_ropa_abierta ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600" />
            )}
            <div>
              <p className="font-semibold text-slate-900">
                Tienda de Ropa: {seasonConfig?.tienda_ropa_abierta ? "ABIERTA" : "CERRADA"}
              </p>
              <p className="text-sm text-slate-600">
                {seasonConfig?.tienda_ropa_abierta 
                  ? "Los padres pueden hacer pedidos de equipación" 
                  : "Los pedidos están desactivados temporalmente"}
              </p>
            </div>
          </div>
          <Badge className={seasonConfig?.tienda_ropa_abierta ? "bg-green-600" : "bg-red-600"}>
            {seasonConfig?.tienda_ropa_abierta ? "Abierta" : "Cerrada"}
          </Badge>
        </CardContent>
      </Card>

      {/* Info */}
      <Alert className="bg-blue-50 border-blue-200">
        <Package className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-800 ml-2">
          <strong>💡 Consejo:</strong> Los cambios en precios solo afectan a pedidos nuevos. Los pedidos ya creados mantienen el precio original.
          Para abrir/cerrar la tienda, ve a <strong>Temporadas → Control de Características</strong>.
        </AlertDescription>
      </Alert>

      {/* Lista de productos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
                      checked={product.activo}
                      onCheckedChange={(checked) => toggleProductActive(product.id, checked)}
                    />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      setEditingProduct({ ...product });
                      setShowEditDialog(true);
                    }}
                  >
                    <Edit className="w-4 h-4 text-blue-600" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleDeleteProduct(product.id)}
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
                <Button onClick={initializeProducts} variant="link" className="text-orange-600">
                  Cargar catálogo por defecto
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tallas disponibles */}
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
          <p className="text-xs text-slate-500 mt-3">
            * Las tallas están predefinidas. Para cambiarlas, contacta con soporte técnico.
          </p>
        </CardContent>
      </Card>

      {/* Dialog Editar Producto */}
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
                    value={editingProduct.precio}
                    onChange={(e) => setEditingProduct({ ...editingProduct, precio: Number(e.target.value) })}
                    className="pl-10 text-xl font-bold"
                  />
                </div>
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

      {/* Dialog Añadir Producto */}
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
                <><Plus className="w-4 h-4 mr-2" /> Añadir Producto</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}