
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export default function CartDrawer({ cart, isOpen, onClose, onRemove, onUpdateQuantity, onClearCart }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderData, setOrderData] = useState({
    cliente_nombre: "",
    cliente_email: "",
    cliente_telefono: "",
    notas: ""
  });

  const queryClient = useQueryClient();

  const createOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success("Pedido realizado correctamente");
      onClearCart();
      setShowCheckout(false);
      setOrderData({ cliente_nombre: "", cliente_email: "", cliente_telefono: "", notas: "" });
      onClose();
    },
  });

  const total = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowCheckout(true);
  };

  const handleConfirmOrder = () => {
    if (!orderData.cliente_nombre || !orderData.cliente_email) {
      toast.error("Por favor completa los datos del cliente");
      return;
    }

    const orderPayload = {
      ...orderData,
      productos: cart.map(item => ({
        producto_id: item.id,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.cantidad,
        talla: item.talla
      })),
      total: total,
      estado: "Pendiente"
    };

    createOrderMutation.mutate(orderPayload);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Carrito de Compra
          </SheetTitle>
          <SheetDescription>
            {cart.length} {cart.length === 1 ? 'producto' : 'productos'} en el carrito
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto py-6">
          {!showCheckout ? (
            <div className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-slate-500 py-12">
                  El carrito está vacío
                </p>
              ) : (
                cart.map((item, index) => (
                  <div key={`${item.id}-${item.talla}-${index}`} className="flex gap-4 p-4 rounded-lg bg-slate-50">
                    <div className="w-20 h-20 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                      {item.imagen_url ? (
                        <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{item.nombre}</h4>
                      {item.talla && (
                        <p className="text-sm text-slate-500">Talla: {item.talla}</p>
                      )}
                      <p className="text-emerald-600 font-semibold mt-1">{item.precio}€</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => onUpdateQuantity(item.id, item.talla, item.cantidad - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.cantidad}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => onUpdateQuantity(item.id, item.talla, item.cantidad + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onRemove(item.id, item.talla)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo *</Label>
                <Input
                  id="nombre"
                  value={orderData.cliente_nombre}
                  onChange={(e) => setOrderData(prev => ({ ...prev, cliente_nombre: e.target.value }))}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={orderData.cliente_email}
                  onChange={(e) => setOrderData(prev => ({ ...prev, cliente_email: e.target.value }))}
                  placeholder="tu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={orderData.cliente_telefono}
                  onChange={(e) => setOrderData(prev => ({ ...prev, cliente_telefono: e.target.value }))}
                  placeholder="+34 600 000 000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas">Notas del Pedido</Label>
                <Textarea
                  id="notas"
                  value={orderData.notas}
                  onChange={(e) => setOrderData(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Instrucciones especiales..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total:</span>
            <span className="text-orange-600">{total.toFixed(2)}€</span>
          </div>
          
          {!showCheckout ? (
            <div className="space-y-2">
              <Button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                Proceder al Pedido
              </Button>
              {cart.length > 0 && (
                <Button
                  onClick={onClearCart}
                  variant="outline"
                  className="w-full"
                >
                  Vaciar Carrito
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handleConfirmOrder}
                disabled={createOrderMutation.isPending}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {createOrderMutation.isPending ? "Procesando..." : "Confirmar Pedido"}
              </Button>
              <Button
                onClick={() => setShowCheckout(false)}
                variant="outline"
                className="w-full"
              >
                Volver al Carrito
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
