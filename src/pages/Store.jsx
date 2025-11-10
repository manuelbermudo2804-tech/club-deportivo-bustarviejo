import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ShoppingCart, Search, Package } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

import ProductCard from "../components/store/ProductCard";
import ProductForm from "../components/store/ProductForm";
import CartDrawer from "../components/store/CartDrawer";

export default function Store() {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const queryClient = useQueryClient();

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user.role === "admin");
      } catch (error) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date'),
    initialData: [],
  });

  const createProductMutation = useMutation({
    mutationFn: (productData) => base44.entities.Product.create(productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowForm(false);
      setEditingProduct(null);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, productData }) => base44.entities.Product.update(id, productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowForm(false);
      setEditingProduct(null);
    },
  });

  const handleSubmit = async (productData) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, productData });
    } else {
      createProductMutation.mutate(productData);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const addToCart = (product, selectedSize) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.talla === selectedSize);
      if (existing) {
        return prev.map(item =>
          item.id === product.id && item.talla === selectedSize
            ? { ...item, cantidad: Math.min(item.cantidad + 1, product.stock) }
            : item
        );
      }
      return [...prev, { ...product, talla: selectedSize, cantidad: 1 }];
    });
  };

  const removeFromCart = (productId, size) => {
    setCart(prev => prev.filter(item => !(item.id === productId && item.talla === size)));
  };

  const updateCartQuantity = (productId, size, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }
    setCart(prev => prev.map(item =>
      item.id === productId && item.talla === size
        ? { ...item, cantidad: Math.min(quantity, item.stock) }
        : item
    ));
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = categoryFilter === "all" || product.categoria === categoryFilter;
    const matchesSearch = product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && product.activo;
  });

  const categories = ["all", "Camisetas", "Pantalones", "Chandals", "Accesorios", "Balones", "Equipamiento"];

  const cartItemsCount = cart.reduce((sum, item) => sum + item.cantidad, 0);
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 5 && p.activo).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tienda del Club</h1>
          <p className="text-slate-600 mt-1">Equipaciones y merchandising oficial</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowCart(true)}
            variant="outline"
            className="relative"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Carrito
            {cartItemsCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-orange-600 h-6 w-6 flex items-center justify-center p-0">
                {cartItemsCount}
              </Badge>
            )}
          </Button>
          {isAdmin && (
            <Button
              onClick={() => {
                setEditingProduct(null);
                setShowForm(!showForm);
              }}
              className="bg-orange-600 hover:bg-orange-700 shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Producto
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de entrega en club */}
      <Alert className="bg-blue-50 border-blue-200">
        <Package className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 ml-6">
          <strong>📍 Entrega en el Club:</strong> Todos los pedidos se recogen en las instalaciones del CF Bustarviejo. 
          Te notificaremos por email cuando tu pedido esté listo para recoger.
        </AlertDescription>
      </Alert>

      {/* Alertas de stock bajo para admin */}
      {isAdmin && lowStockProducts > 0 && (
        <Alert className="bg-orange-50 border-orange-200">
          <Package className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 ml-6">
            <strong>⚠️ Stock Bajo:</strong> {lowStockProducts} {lowStockProducts === 1 ? 'producto tiene' : 'productos tienen'} stock bajo (≤5 unidades)
          </AlertDescription>
        </Alert>
      )}

      <AnimatePresence>
        {showForm && isAdmin && (
          <ProductForm
            product={editingProduct}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingProduct(null);
            }}
            isSubmitting={createProductMutation.isPending || updateProductMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Buscar productos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white shadow-sm"
        />
      </div>

      {/* Filtros de categoría */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList className="bg-white shadow-sm">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"
            >
              {cat === "all" ? "Todo" : cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No hay productos disponibles</p>
          {searchTerm && (
            <p className="text-slate-400 text-sm mt-2">
              Intenta con otra búsqueda o categoría
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={isAdmin ? handleEdit : undefined}
                onAddToCart={addToCart}
                isAdmin={isAdmin}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <CartDrawer
        cart={cart}
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        onRemove={removeFromCart}
        onUpdateQuantity={updateCartQuantity}
        onClearCart={() => setCart([])}
      />
    </div>
  );
}