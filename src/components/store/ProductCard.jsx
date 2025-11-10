import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, ShoppingCart, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProductCard({ product, onEdit, onAddToCart }) {
  const [showSizeDialog, setShowSizeDialog] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");

  const handleAddToCart = () => {
    if (product.tallas_disponibles && product.tallas_disponibles.length > 0) {
      setShowSizeDialog(true);
    } else {
      onAddToCart(product, null);
    }
  };

  const confirmAddToCart = () => {
    if (!selectedSize && product.tallas_disponibles?.length > 0) return;
    onAddToCart(product, selectedSize || null);
    setShowSizeDialog(false);
    setSelectedSize("");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-none shadow-lg bg-white">
          <div className="relative h-56 bg-slate-100">
            {product.imagen_url ? (
              <img
                src={product.imagen_url}
                alt={product.nombre}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-16 h-16 text-slate-300" />
              </div>
            )}
            {product.stock <= 5 && product.stock > 0 && (
              <Badge className="absolute top-3 left-3 bg-orange-500">
                Quedan {product.stock}
              </Badge>
            )}
            {product.stock === 0 && (
              <Badge className="absolute top-3 left-3 bg-red-500">
                Agotado
              </Badge>
            )}
          </div>
          
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {product.nombre}
              </h3>
              <p className="text-sm text-slate-600 line-clamp-2">
                {product.descripcion}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-emerald-600">
                {product.precio}€
              </span>
              <Badge variant="outline" className="text-slate-600">
                {product.categoria}
              </Badge>
            </div>

            {product.tallas_disponibles && product.tallas_disponibles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-slate-500 w-full mb-1">Tallas:</span>
                {product.tallas_disponibles.map((talla) => (
                  <Badge key={talla} variant="secondary" className="text-xs">
                    {talla}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Añadir
              </Button>
              <Button
                onClick={() => onEdit(product)}
                variant="outline"
                size="icon"
                className="hover:bg-slate-100"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showSizeDialog} onOpenChange={setShowSizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecciona una talla</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger>
                <SelectValue placeholder="Elige talla" />
              </SelectTrigger>
              <SelectContent>
                {product.tallas_disponibles?.map((talla) => (
                  <SelectItem key={talla} value={talla}>
                    Talla {talla}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSizeDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmAddToCart}
              disabled={!selectedSize}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Añadir al Carrito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}