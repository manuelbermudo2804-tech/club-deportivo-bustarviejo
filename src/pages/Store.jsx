import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

import ProductCard from "../components/store/ProductCard";
import ProductForm from "../components/store/ProductForm";
import CartDrawer from "../components/store/CartDrawer";

export default function Store() {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  
  const queryClient = useQueryClient();

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
            ? { ...item, cantidad: item.cantidad + 1 }
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
        ? { ...item, cantidad: quantity }
        : item
    ));
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = categoryFilter === "all" || product.categoria === categoryFilter;
    return matchesCategory && product.activo;
  });

  const categories = ["all", "Camisetas", "Pantalones", "Chandals", "Accesorios", "Balones", "Equipamiento"];

  const cartItemsCount = cart.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tienda del Club</h1>
          <p className="text-slate-600 mt-1">Equipaciones y merchandising</p>
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
              <Badge className="absolute -top-2 -right-2 bg-emerald-600 h-6 w-6 flex items-center justify-center p-0">
                {cartItemsCount}
              </Badge>
            )}
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(null);
              setShowForm(!showForm);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
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

      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList className="bg-white shadow-sm">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700"
            >
              {cat === "all" ? "Todo" : cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">No hay productos disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={handleEdit}
                onAddToCart={addToCart}
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