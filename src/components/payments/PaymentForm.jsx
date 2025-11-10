import React, { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileText, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PaymentForm({ payment, players, onSubmit, onCancel, isSubmitting }) {
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState(payment || {
    jugador_id: "",
    jugador_nombre: "",
    tipo_pago: "Único",
    mes: "Septiembre",
    año: currentYear,
    cantidad: 90,
    estado: "Pendiente",
    metodo_pago: "",
    justificante_url: "",
    fecha_pago: "",
    notas: ""
  });

  const [uploadingFile, setUploadingFile] = useState(false);

  const handleChange = (field, value) => {
    let updates = { [field]: value };
    
    if (field === "jugador_id") {
      const selectedPlayer = players.find(p => p.id === value);
      if (selectedPlayer) {
        updates.jugador_nombre = selectedPlayer.nombre;
      }
    }

    // Actualizar cantidad según tipo de pago
    if (field === "tipo_pago") {
      if (value === "Único") {
        updates.cantidad = 90;
      } else if (value === "Tres meses") {
        updates.cantidad = 30;
      }
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange("justificante_url", file_url);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
    setUploadingFile(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Si es pago en tres meses y no es una edición, crear 3 pagos
    if (formData.tipo_pago === "Tres meses" && !payment) {
      const mesesPago = ["Septiembre", "Noviembre", "Diciembre"];
      const pagos = mesesPago.map(mes => ({
        ...formData,
        mes: mes,
        cantidad: 30
      }));
      
      // Crear los 3 pagos
      for (const pago of pagos) {
        await base44.entities.Payment.create(pago);
      }
      onSubmit(null); // Indicar que se completó sin pasar datos específicos
    } else {
      onSubmit(formData);
    }
  };

  const months = ["Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto"];

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
            {formData.tipo_pago === "Tres meses" && !payment && (
              <Alert className="bg-orange-50 border-orange-200">
                <AlertDescription className="text-orange-800">
                  Se crearán automáticamente 3 pagos de 30€ para los meses de Septiembre, Noviembre y Diciembre.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="jugador_id">Jugador *</Label>
                <Select
                  value={formData.jugador_id}
                  onValueChange={(value) => handleChange("jugador_id", value)}
                  required
                  disabled={!!payment}
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
                <Label htmlFor="tipo_pago">Tipo de Pago *</Label>
                <Select
                  value={formData.tipo_pago}
                  onValueChange={(value) => handleChange("tipo_pago", value)}
                  required
                  disabled={!!payment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Único">Pago Único (90€)</SelectItem>
                    <SelectItem value="Tres meses">Tres Meses (30€ x 3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.tipo_pago === "Único" || payment) && (
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
              )}

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
                  disabled={!payment}
                />
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
                    <SelectItem value="Bizum">Bizum</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
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
              <Label>Justificante de Pago</Label>
              <div className="flex items-center gap-3">
                {formData.justificante_url ? (
                  <div className="flex items-center gap-2 flex-1">
                    <a 
                      href={formData.justificante_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex-1"
                    >
                      <FileText className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-700 truncate">Ver justificante</span>
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleChange("justificante_url", "")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="justificante-upload"
                      disabled={uploadingFile}
                    />
                    <label htmlFor="justificante-upload" className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingFile}
                        className="w-full"
                        onClick={() => document.getElementById('justificante-upload').click()}
                      >
                        {uploadingFile ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Subir Justificante
                          </>
                        )}
                      </Button>
                    </label>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Sube una imagen o PDF del comprobante de pago (Bizum o transferencia)
              </p>
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
                disabled={isSubmitting || uploadingFile}
                className="bg-orange-600 hover:bg-orange-700"
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