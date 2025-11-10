import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function PaymentForm({ payment, players, onSubmit, onCancel, isSubmitting }) {
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState(payment || {
    jugador_id: "",
    jugador_nombre: "",
    mes: "",
    año: currentYear,
    cantidad: 30,
    estado: "Pendiente",
    metodo_pago: "",
    fecha_pago: "",
    notas: ""
  });

  const handleChange = (field, value) => {
    let updates = { [field]: value };
    
    if (field === "jugador_id") {
      const selectedPlayer = players.find(p => p.id === value);
      if (selectedPlayer) {
        updates.jugador_nombre = selectedPlayer.nombre;
      }
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl">
            {payment ? "Editar Pago" : "Registrar Nuevo Pago"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="jugador_id">Jugador *</Label>
                <Select
                  value={formData.jugador_id}
                  onValueChange={(value) => handleChange("jugador_id", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona jugador" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.filter(p => p.activo).map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.nombre} - {player.categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mes">Mes *</Label>
                <Select
                  value={formData.mes}
                  onValueChange={(value) => handleChange("mes", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="año">Año *</Label>
                <Input
                  id="año"
                  type="number"
                  value={formData.año}
                  onChange={(e) => handleChange("año", parseInt(e.target.value))}
                  required
                  min="2020"
                  max="2030"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad (€) *</Label>
                <Input
                  id="cantidad"
                  type="number"
                  step="0.01"
                  value={formData.cantidad}
                  onChange={(e) => handleChange("cantidad", parseFloat(e.target.value))}
                  required
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado *</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => handleChange("estado", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="Pagado">Pagado</SelectItem>
                    <SelectItem value="Atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metodo_pago">Método de Pago</Label>
                <Select
                  value={formData.metodo_pago}
                  onValueChange={(value) => handleChange("metodo_pago", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="Bizum">Bizum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_pago">Fecha de Pago</Label>
                <Input
                  id="fecha_pago"
                  type="date"
                  value={formData.fecha_pago}
                  onChange={(e) => handleChange("fecha_pago", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => handleChange("notas", e.target.value)}
                placeholder="Observaciones sobre el pago..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  payment ? "Actualizar" : "Registrar Pago"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}